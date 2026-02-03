import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5' }}>
          <span style={{ fontSize: '2.5rem' }}>🏡</span>
          <p style={{ color: '#8a7e72', fontSize: '0.95rem' }}>Something went wrong.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', background: '#e8a87c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer' }}
          >Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
