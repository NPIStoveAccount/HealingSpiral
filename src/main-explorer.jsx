import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './HealingSpiralApp.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('React error boundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#e74c3c', fontFamily: 'monospace', background: '#0a0a0f', minHeight: '100vh' }}>
          <h2 style={{ color: '#f0e6c0' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', fontSize: '0.85rem' }}>
            {this.state.error.toString()}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

window.onerror = function(msg, src, line, col, err) {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = '<div style="padding:2rem;color:#e74c3c;font-family:monospace;background:#0a0a0f;min-height:100vh">' +
      '<h2 style="color:#f0e6c0">Load Error</h2>' +
      '<pre style="white-space:pre-wrap;margin-top:1rem;font-size:0.85rem">' +
      (msg || 'Unknown error') + '\nSource: ' + (src || '') + '\nLine: ' + line +
      '</pre></div>';
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
