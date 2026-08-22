import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { Document } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge, BadgeVariant } from '../common/Badge';

export const KnowledgeBase: React.FC = () => {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const loadDocuments = useCallback(async (showIndicator = true) => {
    if (showIndicator) setIsLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.data || []);
    } catch (err: any) {
      showToast('Error loading documents', 'error', err.message);
    } finally {
      if (showIndicator) setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Status Polling: Poll documents status if any document is 'processing'
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, loadDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFileUpload = async (file: File) => {
    const isTxt = file.name.endsWith('.txt');
    const isPdf = file.name.endsWith('.pdf');

    if (!isTxt && !isPdf) {
      showToast('Unsupported File Format', 'error', 'Please upload only .pdf or .txt documents.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File Too Large', 'error', 'Maximum file upload size is 10MB.');
      return;
    }

    setIsUploading(true);
    showToast('Uploading document', 'info', `Ingesting "${file.name}"...`);

    try {
      const res = await api.uploadDocument(file);
      if (res.data) {
        setDocuments((prev) => {
          const idx = prev.findIndex((d) => d.id === res.data?.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.data!;
            return next;
          }
          return [res.data!, ...prev];
        });
      }
      showToast('Document Indexed', 'success', `"${file.name}" indexed successfully into Knowledge Base.`);
      loadDocuments(false);
    } catch (err: any) {
      showToast('Upload failed', 'error', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFileUpload(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This removes all associated semantic vectors and context from the chat.`)) return;

    try {
      await api.deleteDocument(id);
      showToast('Document deleted', 'info', `"${name}" removed from knowledge base.`);
      loadDocuments(false);
    } catch (err: any) {
      showToast('Deletion failed', 'error', err.message);
    }
  };

  const handleResetKb = async () => {
    if (!window.confirm('WARNING: Are you sure you want to clear the entire knowledge base? This wipes all vectors and files.')) return;

    try {
      await api.resetDocuments();
      showToast('Knowledge Base Cleared', 'info', 'All documents and indices cleared.');
      loadDocuments(false);
    } catch (err: any) {
      showToast('Reset failed', 'error', err.message);
    }
  };

  const getStatusBadge = (status: Document['status']): { variant: BadgeVariant; text: string } => {
    switch (status) {
      case 'indexed':
        return { variant: 'success', text: 'Indexed' };
      case 'error':
        return { variant: 'danger', text: 'Failed' };
      case 'processing':
      default:
        return { variant: 'warning', text: 'Indexing...' };
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* File Ingestion Dropzone */}
      <Card style={{ marginBottom: '2rem', padding: '0' }}>
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: dragActive ? 'var(--primary-light)' : 'var(--bg-glass)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all var(--transition-fast)',
          }}
        >
          <input
            type="file"
            id="kb-file-input"
            accept=".txt,.pdf"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          <label htmlFor="kb-file-input" style={{ cursor: 'pointer', display: 'block' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                marginBottom: '1.25rem',
              }}
            >
              {isUploading ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    border: '3px solid var(--primary-light)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {isUploading ? 'Ingesting File...' : 'Drag & Drop PDF or TXT Document'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              or <strong style={{ color: 'var(--primary)' }}>browse files</strong> on your device (Max 10MB)
            </p>
          </label>
        </div>
      </Card>

      {/* KB List Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <h2>Indexed Documents ({documents.length})</h2>
        {documents.length > 0 && (
          <Button variant="danger" size="sm" onClick={handleResetKb}>
            Wipe Knowledge Base
          </Button>
        )}
      </div>

      {/* Documents Log grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          Loading document inventory...
        </div>
      ) : documents.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Knowledge Base is Empty
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '460px', margin: '0 auto' }}>
            Upload documents above to feed the semantic engine. Once parsed and indexed, they will be accessible as context inside the chat panel.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {documents.map((doc) => {
            const badge = getStatusBadge(doc.status);
            return (
              <Card key={doc.id} interactive style={{ padding: '1.25rem 1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
                    {/* File icon based on type */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-md)',
                        background: doc.type === 'pdf' ? 'var(--danger-light)' : 'var(--info-light)',
                        color: doc.type === 'pdf' ? 'var(--danger)' : 'var(--info)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', wordBreak: 'break-all' }}>
                        {doc.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.2rem',
                          display: 'flex',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>Size: {formatBytes(doc.size)}</span>
                        <span>&bull;</span>
                        <span>Chunks: {doc.status === 'indexed' ? doc.chunkCount : '--'}</span>
                        <span>&bull;</span>
                        <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Badge variant={badge.variant} dot={doc.status === 'processing'}>
                      {badge.text}
                    </Badge>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.name)}
                      aria-label={`Delete ${doc.name}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {doc.error && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.82rem',
                      color: 'var(--danger)',
                      background: 'var(--danger-light)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <strong>Extraction Failure:</strong> {doc.error}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
