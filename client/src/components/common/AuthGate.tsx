import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from './Card';
import { Button } from './Button';

interface AuthGateProps {
  featureName: string;
  description?: string;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  featureName,
  description = 'Sign in with your Google account to access private document ingestion, selective context querying, and saved chat history.',
}) => {
  const { loginWithGoogle, loginWithGoogleRedirect } = useAuth();
  const { showToast } = useToast();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
        showToast('Signed in successfully', 'success', 'Welcome to your RAG workspace!');
      } catch (err: any) {
        showToast('Login Failed', 'error', err.message || 'Could not verify Google credentials.');
      }
    }
  };

  return (
    <div style={{ maxWidth: '580px', margin: '3rem auto 0 auto' }}>
      <Card
        style={{
          textAlign: 'center',
          padding: '3.5rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Animated Lock Icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Authentication Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto' }}>
            <strong>{featureName}</strong> is reserved for authenticated users. {description}
          </p>
        </div>

        {/* Google Sign-in Buttons */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '280px' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                showToast('Redirecting to Google Sign-In...', 'info');
                loginWithGoogleRedirect();
              }}
              theme="outline"
              size="large"
              shape="pill"
              text="continue_with"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', margin: '0.25rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <Button
            variant="secondary"
            onClick={loginWithGoogleRedirect}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            <span>Sign in via Browser Redirect</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
