import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { ChatMessage, Citation } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

export const ChatInterface: React.FC = () => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessageText = input.trim();
    setInput('');
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toISOString(),
    };

    // Add user message to thread
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Send chat log history along for memory context
      const response = await api.chat(userMessageText, messages);
      
      const assistantMsg: ChatMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        role: 'assistant',
        content: response.data?.response || "Unable to retrieve response.",
        timestamp: new Date().toISOString(),
        citations: response.data?.citations || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast('Error generating reply', 'error', err.message);
      
      const errorMsg: ChatMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to connect to the completions API.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFeedback = async (msgId: string, rating: 'like' | 'dislike') => {
    try {
      await api.submitFeedback(msgId, rating);
      
      setMessages((prev) =>
        prev.map((msg) => (msg.id === msgId ? { ...msg, rating } : msg))
      );
      
      showToast(
        rating === 'like' ? 'Response liked!' : 'Response disliked',
        'success',
        'Feedback submitted successfully.'
      );
    } catch (err: any) {
      showToast('Failed to save feedback', 'error', err.message);
    }
  };

  const clearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear current chat thread history?')) {
      setMessages([]);
      setActiveCitation(null);
      showToast('Chat cleared', 'info');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: activeCitation ? '1fr 340px' : '1fr', gap: '1.5rem', height: '620px' }}>
      
      {/* Message Thread Board */}
      <Card style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 1.5rem' }}>
        
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Knowledge retrieval chat</span>
              <Badge variant="primary">Groq AI</Badge>
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={clearChat} disabled={messages.length === 0}>
            Clear Chat
          </Button>
        </div>

        {/* Messages view */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem' }}>
          {messages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                padding: '2rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Start a RAG-Powered Conversation
              </h3>
              <p style={{ maxWidth: '400px', fontSize: '0.88rem' }}>
                Ask questions regarding your uploaded knowledge documents. The assistant will search the vector store and reply using only your document context.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '0.9rem 1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        background: isUser ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: isUser ? 'white' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        fontSize: '0.94rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}

                      {/* Citations badges list */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.4rem',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '4px' }}>
                            Sources:
                          </span>
                          {msg.citations.map((cit, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveCitation(cit)}
                              className="badge badge-info"
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                border: 'none',
                              }}
                              title={`View extract from ${cit.docName}`}
                            >
                              <span>[{idx + 1}]</span>
                              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cit.docName}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Metadata (likes, timestamp) */}
                    {!isUser && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginTop: '0.25rem',
                          marginLeft: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>&bull;</span>
                        {/* Thumbs up */}
                        <button
                          onClick={() => handleFeedback(msg.id, 'like')}
                          style={{
                            color: msg.rating === 'like' ? 'var(--success)' : 'inherit',
                            cursor: 'pointer',
                          }}
                          title="Thumbs Up"
                        >
                          👍
                        </button>
                        {/* Thumbs down */}
                        <button
                          onClick={() => handleFeedback(msg.id, 'dislike')}
                          style={{
                            color: msg.rating === 'dislike' ? 'var(--danger)' : 'inherit',
                            cursor: 'pointer',
                          }}
                          title="Thumbs Down"
                        >
                          👎
                        </button>
                      </div>
                    )}

                    {isUser && (
                      <div
                        style={{
                          marginTop: '0.25rem',
                          marginRight: '0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                );
              })}
              {isSending && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--text-muted)',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Searching vector indexes &amp; generating Llama response...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="form-control"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question (e.g. What is the objective of this project?)..."
            disabled={isSending}
            required
            autoFocus
          />
          <Button type="submit" variant="primary" disabled={isSending}>
            Send
          </Button>
        </form>
      </Card>

      {/* Citations Side Drawer */}
      {activeCitation && (
        <Card style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--primary)' }}>Source Reference</h3>
            <button
              onClick={() => setActiveCitation(null)}
              style={{ fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              &times;
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              DOCUMENT:
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
              📄 {activeCitation.docName}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              CHUNK EXTRACT [{activeCitation.chunkIndex + 1}]:
            </div>
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                fontStyle: 'italic',
              }}
            >
              &quot;{activeCitation.text}&quot;
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
export default ChatInterface;
