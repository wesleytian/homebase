import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  componentDidMount() {
    // Reset error state on navigation (hash change)
    window.addEventListener('hashchange', this.resetError);
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.resetError);
  }

  resetError = () => {
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px', fontFamily: "'DM Sans', sans-serif", background: '#faf8f5' }}>
          <span style={{ fontSize: '2.5rem' }}>🏡</span>
          <p style={{ color: '#8a7e72', fontSize: '0.95rem' }}>Something went wrong.</p>
          {this.state.error && (
            <p style={{ color: '#c0392b', fontSize: '0.8rem', maxWidth: '300px', textAlign: 'center' }}>
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: '8px 20px', background: '#e8a87c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer' }}
          >Try Again</button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', cursor: 'pointer', marginTop: '-8px' }}
          >Reload Page</button>
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
