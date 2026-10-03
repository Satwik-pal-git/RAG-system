import OpenAI from 'openai';
import { vectorDb } from './vector';
import { VectorQueryFilter } from './vector/base';
import { ChatMessage, Citation } from '../types';

export class RagService {
  private openaiClient: OpenAI | null = null;
  private cachedWorkingModel: string | null = null;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor() {
    this.initGroqClient();
  }

  private initGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      console.log('[RagService] Groq API client initialized using OpenAI SDK.');
    } else {
      console.warn('[RagService] GROQ_API_KEY is not defined in environment variables. Chat API will fallback.');
    }
  }

  private setCache(key: string, vector: number[]) {
    if (this.embeddingCache.size > 1000) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, vector);
  }

  // Deterministic 384-dimensional vector fallback (< 0.1ms)
  private generateDeterministicVector(text: string): number[] {
    const dimensions = 384;
    const vector = new Array(dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      const index = (i * 7) % dimensions;
      vector[index] = (vector[index] + text.charCodeAt(i)) % 100;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map((v) => v / magnitude);
  }

  // Generate Embeddings in batches to minimize HTTP requests and eliminate timeouts
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const missingIndices: number[] = [];
    const missingTexts: string[] = [];

    texts.forEach((t, idx) => {
      const cacheKey = t.trim().toLowerCase();
      if (this.embeddingCache.has(cacheKey)) {
        results[idx] = this.embeddingCache.get(cacheKey)!;
      } else {
        missingIndices.push(idx);
        missingTexts.push(t.slice(0, 1000));
      }
    });

    if (missingTexts.length === 0) {
      return results as number[][];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(
        'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.HF_API_TOKEN ? { Authorization: `Bearer ${process.env.HF_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ inputs: missingTexts }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Hugging Face returns number[][] when inputs is string[]
        if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === 'number') {
          data.forEach((vec: number[], i: number) => {
            const origIdx = missingIndices[i];
            const textKey = texts[origIdx].trim().toLowerCase();
            this.setCache(textKey, vec);
            results[origIdx] = vec;
          });
        }
      }
    } catch {
      // Fall through to deterministic generator
    }

    // Fill any missing with deterministic fallback
    missingIndices.forEach((origIdx) => {
      if (!results[origIdx]) {
        const text = texts[origIdx];
        const vec = this.generateDeterministicVector(text);
        const textKey = text.trim().toLowerCase();
        this.setCache(textKey, vec);
        results[origIdx] = vec;
      }
    });

    return results as number[][];
  }

  // Generate Single Embedding
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  // Perform Semantic Search + Groq Completion with latency optimization and doc filtering
  async answerQuery(
    query: string,
    history: ChatMessage[],
    filter?: VectorQueryFilter
  ): Promise<{ content: string; citations: Citation[] }> {
    // 1. Generate query embedding (cached or fast fallback)
    const queryVector = await this.generateEmbedding(query);

    // 2. Query Vector DB with optional docId and userId filtering
    const matches = await vectorDb.query(queryVector, 4, filter);
    const validMatches = matches.filter((m) => m.score > 0.05);

    const contextTexts = validMatches
      .map((m) => `[Document: ${m.chunk.docName}] ${m.chunk.text}`)
      .join('\n\n');

    const citations: Citation[] = validMatches.map((m) => ({
      docId: m.chunk.docId,
      docName: m.chunk.docName,
      chunkIndex: m.chunk.chunkIndex,
      text: m.chunk.text,
    }));

    // 3. System prompt strictly grounding response in provided context
    const filterNotice = filter?.docId
      ? `NOTE: The user has restricted search context specifically to document ID: ${filter.docId}.`
      : 'NOTE: Context is drawn across all uploaded documents.';

    const systemPrompt = `You are a helpful knowledge assistant.
Use ONLY the provided document context to answer the user's question.
${filterNotice}

CONSTRAINTS:
1. Ground answers strictly in the context. If absent, state: "I couldn't find the answer in the provided document context."
2. Match the language of the user's query.
3. Automatically redact PII (replace emails with [EMAIL], phones with [PHONE], credentials with [REDACTED]).

Context:
${contextTexts || 'No relevant context found.'}
`;

    if (!this.openaiClient) {
      this.initGroqClient();
    }

    const messagesForLlm = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: query },
    ];

    let aiContent = '';

    if (this.openaiClient) {
      // Prioritize previously validated working model to eliminate redundant fallback requests
      const candidateModels = [
        this.cachedWorkingModel,
        process.env.GROQ_MODEL,
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.6-27b',
        'groq/compound',
        'groq/compound-mini',
        'llama-3.1-8b-instant',
      ].filter(Boolean) as string[];

      let lastError: any = null;

      for (const modelName of candidateModels) {
        try {
          const completion = await this.openaiClient.chat.completions.create({
            model: modelName,
            messages: messagesForLlm as any,
            temperature: 0.1,
          });
          aiContent = completion.choices[0]?.message?.content || '';
          this.cachedWorkingModel = modelName; // Cache validated model
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[RagService] Model '${modelName}' failed (${err.status || err.message}). Attempting fallback...`);
        }
      }

      if (lastError && !aiContent) {
        console.error('[RagService] All Groq candidate models failed:', lastError);
        aiContent = `Groq API Error: ${lastError.message || 'Unable to generate response. Please check your GROQ_API_KEY.'}`;
      }
    } else {
      aiContent = `Backend is running, but GROQ_API_KEY environment variable is not configured.
Please set it in "server/.env" and try again.`;
    }

    return {
      content: aiContent,
      citations,
    };
  }
}

export const ragService = new RagService();
export default ragService;
