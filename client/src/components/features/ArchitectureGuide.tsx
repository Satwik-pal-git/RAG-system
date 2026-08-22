import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const ArchitectureGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'flow' | 'layers' | 'patterns'>('flow');

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeSection === 'flow' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSection('flow')}
        >
          Data Flow Diagram
        </button>
        <button
          className={`btn ${activeSection === 'layers' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSection('layers')}
        >
          Layer Breakdown
        </button>
        <button
          className={`btn ${activeSection === 'patterns' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveSection('patterns')}
        >
          Best Practices &amp; Patterns
        </button>
      </div>

      {activeSection === 'flow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <h3 style={{ marginBottom: '0.5rem' }}>End-to-End Request &amp; Type Flow</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              How requests and types flow seamlessly between React frontend and Node.js backend.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                position: 'relative',
              }}
            >
              {/* Step 1 */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Badge variant="primary">1. React UI</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Component Hook
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  User triggers action in a React component, calling <code>api.getItems()</code> or custom hook.
                </p>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Badge variant="info">2. Typed Client</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Vite Proxy / Fetch
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <code>client/src/services/api.ts</code> proxies request to backend at <code>/api/*</code>.
                </p>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Badge variant="warning">3. Express Route</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Router &amp; Middleware
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Route matches handler in <code>server/src/routes</code> and runs logging/auth middleware.
                </p>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Badge variant="success">4. Controller &amp; Service</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Business Logic &amp; DB
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Controller validates payload and calls Service to perform DB query or business logic.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ marginBottom: '1rem' }}>Shared Type Safety Model</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Both client and server import types from <code>shared/types.ts</code>, preventing mismatches between backend JSON responses and frontend state.
            </p>

            <div className="code-box">
              <pre>
{`// shared/types.ts
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// Used in server controller:
res.json({ success: true, data: items, timestamp: new Date().toISOString() });

// Received in client API client:
const response: ApiResponse<Item[]> = await api.getItems();`}
              </pre>
            </div>
          </Card>
        </div>
      )}

      {activeSection === 'layers' && (
        <div className="grid-3">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Badge variant="primary">Frontend</Badge>
              <h3>Client (`client/`)</h3>
            </div>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <li><strong><code>src/components/common/</code></strong>: Reusable UI design system.</li>
              <li><strong><code>src/components/layout/</code></strong>: Page shell, header, nav.</li>
              <li><strong><code>src/components/features/</code></strong>: Domain components.</li>
              <li><strong><code>src/context/</code></strong>: React Contexts (Theme, Toast).</li>
              <li><strong><code>src/services/api.ts</code></strong>: Type-safe API client.</li>
              <li><strong><code>src/styles/</code></strong>: Design tokens and variables.</li>
            </ul>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Badge variant="warning">Backend</Badge>
              <h3>Server (<code>server/</code>)</h3>
            </div>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <li><strong><code>src/controllers/</code></strong>: Request/response lifecycle.</li>
              <li><strong><code>src/services/</code></strong>: Business logic &amp; database CRUD.</li>
              <li><strong><code>src/routes/</code></strong>: Express route definitions.</li>
              <li><strong><code>src/middleware/</code></strong>: Error handler, logger, CORS.</li>
              <li><strong><code>src/config/</code></strong>: Environment variables.</li>
              <li><strong><code>src/app.ts</code></strong>: Express instance setup.</li>
            </ul>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Badge variant="success">Contract</Badge>
              <h3>Shared (`shared/`)</h3>
            </div>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              <li><strong><code>types.ts</code></strong>: DTOs &amp; models.</li>
              <li><strong><code>ApiResponse&lt;T&gt;</code></strong>: Standardized envelope.</li>
              <li><strong>Single Source of Truth</strong>: Eliminates sync bugs.</li>
              <li><strong>Zero Runtime Overhead</strong>: Pure compile-time types.</li>
            </ul>
          </Card>
        </div>
      )}

      {activeSection === 'patterns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <h3 style={{ marginBottom: '0.75rem' }}>1. Clean Controller - Service Separation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Keep route controllers clean by delegating business logic to services. Controllers only parse input, invoke the service, and return an <code>ApiResponse</code>. This makes unit testing services straightforward without mocking Express HTTP objects.
            </p>
          </Card>

          <Card>
            <h3 style={{ marginBottom: '0.75rem' }}>2. Standardized Error Handling</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Use the centralized error handler in <code>server/src/middleware/errorHandler.ts</code>. Simply pass errors via <code>next(error)</code> inside try/catch blocks to ensure consistent JSON error responses across all endpoints.
            </p>
          </Card>

          <Card>
            <h3 style={{ marginBottom: '0.75rem' }}>3. Connecting a Database (Prisma / Drizzle / Mongoose)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Replace the in-memory array in <code>server/src/services/item.service.ts</code> with your chosen ORM/DB client. The service interface remains identical, meaning your controllers and frontend need zero changes.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};
