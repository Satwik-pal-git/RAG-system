import React, { useState } from 'react';
import { ActiveTab } from './types';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HealthMonitor } from './components/features/HealthMonitor';
import { ChatInterface } from './components/features/ChatInterface';
import { KnowledgeBase } from './components/features/KnowledgeBase';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  return (
    <div className="app-layout">
      {/* Subtle glowing ambient lights */}
      <div className="bg-glow-container" aria-hidden="true">
        <div className="glow-orb-1" />
        <div className="glow-orb-2" />
        <div className="glow-orb-3" />
      </div>

      <Navbar serverStatus={serverStatus} />

      <main className="main-content">
        <div className="container">
          {/* Hero Header */}
          <header className="hero-header">
            <div className="hero-tag">
              <span className="status-dot active" />
              <span>Full-Stack AI Challenge</span>
            </div>
            <h1 className="hero-title">RAG-Enabled Knowledge Retrieval</h1>
            <p className="hero-subtitle">
              Upload documents, process them into a local vector index, and perform semantic queries using Groq AI.
            </p>
          </header>

          {/* Navigation Tabs */}
          <nav className="tab-navigation" aria-label="Template Navigation">
            <button
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Telemetry Dashboard
            </button>

            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Semantic Chat Interface
            </button>

            <button
              className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Knowledge Base
            </button>
          </nav>

          {/* Active View */}
          {activeTab === 'dashboard' && (
            <div>
              <HealthMonitor onStatusChange={setServerStatus} />

              <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <Card interactive>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Badge variant="primary">UI</Badge>
                    <h3>React Chat Dashboard</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Modern, responsive conversation UI with memory, thumbs up/down quality feedback, and citation hover displays showing context sources.
                  </p>
                </Card>

                <Card interactive>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Badge variant="warning">RAG Pipeline</Badge>
                    <h3>Semantic Splitter</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Splits PDF/TXT uploads into sliding 800-character overlapping chunks, fetches 384-d vectors, and queries via Cosine Similarity.
                  </p>
                </Card>

                <Card interactive>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Badge variant="success">Free APIs</Badge>
                    <h3>Zero Running Fees</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Uses Groq API for completions, Hugging Face Inference API for embeddings, and a JSON local file vector engine.
                  </p>
                </Card>
              </div>

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>RAG System Specifications</h3>
                  <Badge variant="info">Ready</Badge>
                </div>
                <div className="grid-2">
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <div>📂 <strong>Formats:</strong> Direct PDF and UTF-8 TXT extraction.</div>
                    <div>🧠 <strong>Embeddings:</strong> sentence-transformers/all-MiniLM-L6-v2.</div>
                    <div>🤖 <strong>Generator:</strong> Groq API models (GPT-OSS / Llama).</div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <div>🎯 <strong>Grounding Guard:</strong> Restricts model responses strictly to indexed files.</div>
                    <div>🔒 <strong>PII Guard:</strong> Auto-redacts email addresses, phone numbers, and keys.</div>
                    <div>🌐 <strong>Multilingual:</strong> Aligns responses to query language.</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'chat' && <ChatInterface />}

          {activeTab === 'documents' && <KnowledgeBase />}
        </div>
      </main>

      <Footer />
    </div>
  );
};
