import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useToast } from '../../context/ToastContext';

export const QuickStartGuide: React.FC = () => {
  const { showToast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast('Copied to clipboard', 'info', label);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeSnippets = [
    {
      title: '1. Ingesting Documents programmatically',
      desc: 'Use curl or fetch to ingest files into the vector database pipeline directly:',
      code: `// POST /api/documents/upload (Form-Data)
const formData = new FormData();
formData.append('file', fileObject);

const res = await fetch('/api/documents/upload', {
  method: 'POST',
  body: formData
});
const doc = await res.json();
console.log('Ingested document:', doc.data);`,
    },
    {
      title: '2. Performing RAG Queries',
      desc: 'Connect to the search and chat completion engine with conversation history:',
      code: `// POST /api/chat
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the main goals?',
    history: [
      { role: 'user', content: 'Hello assistant.' },
      { role: 'assistant', content: 'Hello! How can I help you today?' }
    ]
  })
});
const result = await res.json();
console.log('AI Answer:', result.data.response);
console.log('Citations utilized:', result.data.citations);`,
    },
    {
      title: '3. Configuring Environment Variables',
      desc: 'Create or update the server environment file (server/.env) with your credentials:',
      code: `# server/.env
PORT=5000
NODE_ENV=development

# Groq API Key (Free API)
GROQ_API_KEY=gsk_your_groq_api_key_goes_here

# Hugging Face API Token (Optional, for higher embedding limits)
HF_API_TOKEN=hf_your_free_huggingface_token
`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Badge variant="primary">API Recipes</Badge>
          <h2>Developer Integrations Guide</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Integrate the knowledge retrieval API inside external scripts, client portals, or automations. The system stores all indexed vectors locally in <code>server/data/vectors.json</code>.
        </p>
      </Card>

      {codeSnippets.map((recipe, idx) => (
        <Card key={idx}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{recipe.title}</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(recipe.code, idx, recipe.title)}
            >
              {copiedIndex === idx ? 'Copied!' : 'Copy Code'}
            </Button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
            {recipe.desc}
          </p>
          <div className="code-box">
            <pre>{recipe.code}</pre>
          </div>
        </Card>
      ))}

      <Card>
        <h3 style={{ marginBottom: '0.75rem' }}>How Chunks &amp; Similarity Queries work</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          When a text or PDF is uploaded, <code>document.service.ts</code> uses a sliding window text splitter to slice text into overlapping semantic blocks of 800 characters with 150 characters overlap. Chunks are converted to a 384-dimension vector via sentence-transformers on the Hugging Face API. During queries, the Cosine Similarity matches vectors, feeds the top 4 matched blocks as grounding context, and instructs Groq Llama 3.3 to formulate a redacted, multilingual response.
        </p>
      </Card>
    </div>
  );
};
export default QuickStartGuide;
