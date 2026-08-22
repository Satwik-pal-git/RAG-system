import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <strong>RAG-Enabled Knowledge Retrieval</strong> &bull; Full-Stack AI Challenge
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
            <span>LLM: Groq AI</span>
            <span>Embeddings: HuggingFace MiniLM</span>
            <span>Vector Store: Local In-Memory Index</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
