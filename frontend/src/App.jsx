import React, { useState, useEffect } from 'react';
import './App.css';
import './theme.css';

// Error boundary to catch and display errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ React Error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({ errorInfo: errorInfo });
    // Show error on the page
    document.body.innerHTML = `
      <div style="padding:40px;background:#0a0b0e;color:#f87171;font-family:monospace;min-height:100vh;">
        <h1 style="color:#f87171;">❌ React Error</h1>
        <p><strong>Error:</strong> ${error.message || 'Unknown error'}</p>
        <pre style="background:#1a1c24;padding:20px;border-radius:8px;overflow:auto;max-height:400px;color:#e8eaed;">
          ${error.stack || 'No stack trace'}
        </pre>
        <button onclick="window.location.reload()" style="margin-top:20px;padding:10px 24px;background:#4a9eff;border:none;border-radius:8px;color:#fff;cursor:pointer;font-weight:600;">
          🔄 Reload Page
        </button>
      </div>
    `;
  }

  render() {
    if (this.state.hasError) {
      return null; // Error already displayed
    }
    return this.props.children;
  }
}

// Simple diagnostic component
function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('🔄 App component rendering...');
  console.log('📍 Current path:', window.location.pathname);

  useEffect(() => {
    console.log('✅ App mounted successfully!');
    setLoading(false);
    
    // Check if DOM is ready
    const root = document.getElementById('root');
    console.log('📦 root element:', root);
    if (root) {
      console.log('✅ root element found, children:', root.children.length);
    } else {
      console.error('❌ root element NOT found!');
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0b0e',
        color: '#e8eaed',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '40px' }}>⏳</div>
        <p>Loading TradeFlow...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0b0e',
      color: '#e8eaed',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '64px', marginBottom: '16px', fontWeight: '800' }}>
        🚀 TradeFlow
      </h1>
      <p style={{ fontSize: '20px', color: '#848e9c' }}>
        React is working!
      </p>
      <p style={{ fontSize: '14px', color: '#4ade80', marginTop: '8px' }}>
        ✅ App mounted successfully
      </p>
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/login" style={{
          padding: '12px 32px',
          background: '#4a9eff',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600'
        }}>Login</a>
        <a href="/register" style={{
          padding: '12px 32px',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>Register</a>
        <a href="/admin-login.html" style={{
          padding: '12px 32px',
          background: '#f0b90b',
          color: '#0a0b0e',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600'
        }}>Admin</a>
      </div>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#848e9c' }}>
        Path: {window.location.pathname}
      </div>
    </div>
  );
}

export default App;
