import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { ChatMessage, ChatSession, Citation, Document } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

export const ChatInterface: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Messages & Input state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  // Document context filter state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Citations side drawer
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load documents list for context dropdown
  const loadDocuments = useCallback(async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.data?.filter((d) => d.status === 'indexed') || []);
    } catch {
      // Fallback
    }
  }, []);

  // Load chat sessions from MongoDB
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await api.getChatSessions();
      const sessionList = res.data || [];
      setSessions(sessionList);

      // Select latest session if none currently selected
      if (!activeSessionId && sessionList.length > 0) {
        setActiveSessionId(sessionList[0].id);
      }
    } catch (err: any) {
      console.warn('Could not fetch chat sessions:', err.message);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSessionId]);

  // Load messages when activeSessionId changes
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await api.getSessionMessages(sessionId);
      setMessages(res.data || []);
    } catch (err: any) {
      showToast('Error loading conversation', 'error', err.message);
    }
  }, [showToast]);

  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, [loadDocuments, loadSessions, user]);

  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId, loadSessionMessages]);

  // Create a brand new session
  const handleNewChat = async () => {
    try {
      const res = await api.createChatSession('New Conversation', selectedDocId || undefined);
      if (res.data) {
        setSessions((prev) => [res.data!, ...prev]);
        setActiveSessionId(res.data.id);
        setMessages([]);
        setActiveCitation(null);
        showToast('New chat started', 'info');
      }
    } catch (err: any) {
      showToast('Failed to create chat', 'error', err.message);
    }
  };

  // Delete an existing session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation thread?')) return;

    try {
      await api.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      showToast('Conversation deleted', 'info');
    } catch (err: any) {
      showToast('Failed to delete session', 'error', err.message);
    }
  };

  // Send message
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
      docFilterApplied: selectedDocId,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await api.chat(
        userMessageText,
        messages,
        activeSessionId || undefined,
        selectedDocId
      );

      const returnedSessionId = response.data?.sessionId;
      if (returnedSessionId && returnedSessionId !== activeSessionId) {
        setActiveSessionId(returnedSessionId);
        loadSessions();
      }

      const assistantMsg: ChatMessage = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        role: 'assistant',
        content: response.data?.response || 'Unable to retrieve response.',
        timestamp: new Date().toISOString(),
        citations: response.data?.citations || [],
        docFilterApplied: selectedDocId,
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
        'Feedback saved to MongoDB.'
      );
    } catch (err: any) {
      showToast('Failed to save feedback', 'error', err.message);
    }
  };

  const selectedDocObj = documents.find((d) => d.id === selectedDocId);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: activeCitation
          ? '240px 1fr 320px'
          : '240px 1fr',
        gap: '1.25rem',
        height: '660px',
      }}
    >
      {/* 1. Chat Sessions Sidebar */}
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '1rem',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNewChat}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.4rem' }}
          >
            <span>+</span>
            <span>New Chat</span>
          </Button>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
          Conversations ({sessions.length})
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {isLoadingSessions ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
              Loading history...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
              No past sessions
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'var(--primary-light)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={session.title}
                    >
                      💬 {session.title}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      opacity: isActive ? 1 : 0.6,
                    }}
                    title="Delete conversation"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* 2. Message Thread Board */}
      <Card style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.25rem 1.5rem' }}>
        {/* Header & Document Context Scope Selector */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span>Knowledge retrieval chat</span>
              <Badge variant="primary">Groq AI</Badge>
            </h2>
          </div>

          {/* Context Scope Filter Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Context:</span>
            <select
              value={selectedDocId || 'all'}
              onChange={(e) => setSelectedDocId(e.target.value === 'all' ? null : e.target.value)}
              style={{
                fontSize: '0.82rem',
                padding: '0.3rem 0.6rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: selectedDocId ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                color: selectedDocId ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: selectedDocId ? 600 : 400,
                cursor: 'pointer',
                maxWidth: '220px',
              }}
            >
              <option value="all">📚 All Documents ({documents.length})</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  📄 {doc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Context Filter Banner if specific file is chosen */}
        {selectedDocId && selectedDocObj && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.75rem',
              marginBottom: '0.75rem',
              background: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--primary)',
            }}
          >
            <span>
              🎯 Context restricted strictly to: <strong>{selectedDocObj.name}</strong>
            </span>
            <button
              onClick={() => setSelectedDocId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              Reset to All Files
            </button>
          </div>
        )}

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
                  width: '52px',
                  height: '52px',
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
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Ask a RAG-Powered Question
              </h3>
              <p style={{ maxWidth: '380px', fontSize: '0.85rem' }}>
                {selectedDocObj
                  ? `Your queries will be answered strictly using "${selectedDocObj.name}".`
                  : 'Ask questions regarding any of your uploaded knowledge documents.'}
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
                        fontSize: '0.92rem',
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

                    {/* Metadata & Feedback */}
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
                        <button
                          onClick={() => handleFeedback(msg.id, 'like')}
                          style={{
                            color: msg.rating === 'like' ? 'var(--success)' : 'inherit',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                          }}
                          title="Thumbs Up"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, 'dislike')}
                          style={{
                            color: msg.rating === 'dislike' ? 'var(--danger)' : 'inherit',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
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
                    Searching {selectedDocObj ? `"${selectedDocObj.name}"` : 'knowledge documents'} &amp; generating answer...
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
            placeholder={
              selectedDocObj
                ? `Ask a question regarding "${selectedDocObj.name}"...`
                : 'Type your question across all uploaded documents...'
            }
            disabled={isSending}
            required
            autoFocus
          />
          <Button type="submit" variant="primary" disabled={isSending}>
            Send
          </Button>
        </form>
      </Card>

      {/* 3. Citations Side Drawer */}
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
              style={{ fontSize: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}
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
