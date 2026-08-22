import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { HealthStatus } from '../../types';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface HealthMonitorProps {
  onStatusChange?: (status: 'checking' | 'connected' | 'disconnected') => void;
}

export const HealthMonitor: React.FC<HealthMonitorProps> = ({ onStatusChange }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();

    try {
      if (onStatusChange) onStatusChange('checking');
      const res = await api.getHealth();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setHealth(res.data || null);
      if (onStatusChange) onStatusChange('connected');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend');
      if (onStatusChange) onStatusChange('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours}h ${mins % 60}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <Card className="health-monitor-card" style={{ marginBottom: '2rem' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2>Live Backend Status</h2>
            {error ? (
              <Badge variant="danger" dot>
                Offline
              </Badge>
            ) : (
              <Badge variant="success" dot>
                Online
              </Badge>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time health telemetry from the Express + TypeScript backend server.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHealth}
          isLoading={isLoading}
          leftIcon={
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          }
        >
          Refresh Ping
        </Button>
      </div>

      {error ? (
        <div
          style={{
            padding: '1.25rem',
            background: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
          }}
        >
          <strong>Connection Error:</strong> {error}
          <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            Ensure backend server is running via <code>npm run dev</code> or <code>npm run dev:server</code>.
          </div>
        </div>
      ) : (
        <div className="grid-4">
          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Latency
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: (latency || 0) < 50 ? 'var(--success)' : 'var(--warning)',
                marginTop: '0.25rem',
              }}
            >
              {latency !== null ? `${latency} ms` : '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              HTTP Round-trip
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Server Uptime
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {health ? formatUptime(health.uptime) : '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Node Process Lifetime
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Memory (Heap)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
              {health ? health.memory.heapUsed : '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Total: {health ? health.memory.heapTotal : '--'}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Environment
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--accent-purple)',
                marginTop: '0.25rem',
                textTransform: 'capitalize',
              }}
            >
              {health ? health.environment : '--'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Port 5000 &bull; v{health ? health.version : '1.0.0'}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
