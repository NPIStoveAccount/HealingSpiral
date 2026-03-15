import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './HealingSpiralCoach.jsx'

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
        <div style={{ padding: '2rem', color: '#e74c3c', fontFamily: 'monospace', background: '#1a1208', minHeight: '100vh' }}>
          <h2 style={{ color: '#c9a227' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', fontSize: '0.85rem' }}>
            {this.state.error.toString()}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#c9a227', color: '#1a1208', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Clear Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Catch errors that happen before React mounts
window.onerror = function(msg, src, line, col, err) {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = '<div style="padding:2rem;color:#e74c3c;font-family:monospace;background:#1a1208;min-height:100vh">' +
      '<h2 style="color:#c9a227">Load Error</h2>' +
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
