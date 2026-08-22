# RAG-Enabled Knowledge Retrieval System

A production-ready Retrieval-Augmented Generation (RAG) system built with React.js, Node.js (Express), and TypeScript, powered by **Pinecone Vector Database** (with automatic local vector store fallback) and **Groq Cloud LLMs**.

---

## ⚡ Technical Features

- **Document Ingestion Pipeline**:
  - Accept PDF or plain text `.txt` files up to 10MB.
  - Parse PDFs natively using `pdf-parse`.
  - Chunk documents using an overlapping sliding window (800 characters size, 150 characters overlap) matching sentence boundaries.
- **Embeddings & Vector Database (Pinecone + Fallback)**:
  - Generate 384-dimensional vector embeddings using Hugging Face's free Inference API (`sentence-transformers/all-MiniLM-L6-v2`), with a deterministic offline fallback.
  - **Pinecone Vector Database**: Cloud-native managed vector storage supporting real-time upserts, fast cosine similarity retrieval, metadata filtering, and namespace partitioning.
  - **Local Vector Store Fallback**: High-performance local JSON-backed store that activates automatically when Pinecone credentials are not provided.
- **RAG & Chat Completions (Groq API)**:
  - Perform similarity matching to extract the top $N$ relevant document contexts from Pinecone.
  - Ground LLM replies strictly to the retrieved document contexts to prevent hallucinations.
  - Automatically match the user's query language in the response.
  - Automatically redact sensitive PII (emails, phone numbers, credentials) from responses.
- **Modern User Interface**:
  - **Knowledge Base Panel**: Dropzone upload with live progress tracking, metadata logging, and deletion controls.
  - **Semantic Chat Panel**: Conversational threads showing user queries, LLM answers, hoverable/clickable citations, and thumbs up/down feedback buttons.
  - **Telemetry Panel**: Live tracking of backend connection latency, system uptime, and memory heap metrics.

---

## 📂 Project Structure

```
ringover/
├── client/                     # React Frontend (React 18 + Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # UI Primitives: Button, Card, Badge, Input, Modal
│   │   │   ├── features/       # ChatInterface, KnowledgeBase, HealthMonitor
│   │   │   └── layout/         # Header Navbar, Footer
│   │   ├── context/            # ThemeContext (Dark/Light), ToastContext
│   │   ├── services/           # Type-safe API Client (api.ts)
│   │   ├── styles/             # CSS Design Token system
│   │   └── types/              # Frontend types
│   └── vite.config.ts          # Vite proxy configurations
│
├── server/                     # Backend API (Node.js + Express + TypeScript)
│   ├── data/                   # JSON databases (Documents metadata, Feedback logs)
│   ├── src/
│   │   ├── config/             # Config variables loader
│   │   ├── controllers/        # Express handlers (Chat, Documents, Health)
│   │   ├── middleware/         # Logger, errorHandler, 404, CORS
│   │   ├── routes/             # API route controllers
│   │   ├── services/
│   │   │   ├── vector/         # Pinecone & Local vector stores (pineconeStore.ts, localStore.ts)
│   │   │   ├── document.service.ts # PDF parser, semantic chunker, vector indexer
│   │   │   └── rag.service.ts  # Embeddings & Groq API client
│   │   ├── app.ts              # Express initialization
│   │   └── index.ts            # Server entrypoint
│   └── .env.example            # Environment template
│
└── shared/                     # Shared models between React and Node.js
    └── types.ts                # API envelopes and DTO signatures
```

---

## 🚀 Quick Start

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 2. Configure Credentials
Copy the example environment file:
```bash
# Windows PowerShell
copy server\.env.example server\.env

# macOS / Linux / Bash
cp server/.env.example server/.env
```

Open `server/.env` and configure your API keys:
```env
PORT=5000
NODE_ENV=development

# Groq API Key (for LLM chat completions)
GROQ_API_KEY=gsk_your_groq_key_here

# Pinecone Vector Database (Create index with Dimension=384, Metric=cosine)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=rag-index
PINECONE_NAMESPACE=

# Hugging Face API Token (Optional, for higher rate limits)
HF_API_TOKEN=
```

> [!TIP]
> **Pinecone Setup**: Create a new index in your [Pinecone Console](https://app.pinecone.io) with:
> - **Dimensions**: `384`
> - **Metric**: `Cosine`

### 3. Launch Development Servers
Run both client and server concurrently:
```bash
npm run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🔌 API Endpoints

### Documents Ingestion
- `GET /api/documents` - Fetch all uploaded document records.
- `POST /api/documents/upload` - Upload a text or PDF file, chunk, embed, and index into Pinecone.
- `DELETE /api/documents/:id` - Delete document metadata and remove vectors from Pinecone.
- `POST /api/documents/reset` - Clear the entire knowledge base and reset the vector index.

### Semantic Chat & Feedback
- `POST /api/chat` - Perform a semantic retrieval query against Pinecone and generate an LLM response (`{ message: string, history: ChatMessage[] }`).
- `POST /api/chat/feedback` - Submit thumbs up/down quality logs (`{ messageId: string, rating: 'like' | 'dislike' }`).

---

## 🛠️ Verification
Verify strict type checking and run production bundles:
```bash
npm run check:types
npm run build
```
Both commands pass without warnings or errors.
