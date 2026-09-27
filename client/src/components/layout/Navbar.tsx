import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';

interface NavbarProps {
  serverStatus: 'checking' | 'connected' | 'disconnected';
}

export const Navbar: React.FC<NavbarProps> = ({ serverStatus }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, loginWithGoogle, loginWithGoogleRedirect, logout } = useAuth();
  const { showToast } = useToast();


  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
        showToast('Signed in successfully', 'success', 'Welcome to your RAG Knowledge workspace!');
      } catch (err: any) {
        showToast('Login Failed', 'error', err.message || 'Could not verify Google credentials.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out', 'info', 'You are now in guest mode.');
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <div className="nav-brand">
          <div className="brand-icon-box">
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span>RAG-Enabled Knowledge Retrieval</span>
        </div>

        <div className="nav-actions">
          {/* Server status pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <span
              className={`status-dot ${
                serverStatus === 'connected'
                  ? 'active'
                  : serverStatus === 'checking'
                  ? 'idle'
                  : 'offline'
              }`}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              API:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {serverStatus === 'connected'
                  ? 'Connected'
                  : serverStatus === 'checking'
                  ? 'Checking...'
                  : 'Offline'}
              </strong>
            </span>
          </div>

          {/* User Profile / Google Sign-in */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0.6rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={user.email}
                >
                  {user.name}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout} title="Sign Out">
                Logout
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ transform: 'scale(0.88)', transformOrigin: 'right center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    // Fallback to OAuth redirect flow
                    showToast('Opening Google Sign-In redirect...', 'info');
                    loginWithGoogleRedirect();
                  }}
                  shape="pill"
                  size="medium"
                  text="signin_with"
                />
              </div>
            </div>
          )}


          {/* Theme Switcher Button */}
          <Button
            variant="icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
};
