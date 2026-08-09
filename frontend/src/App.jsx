import React from 'react';
import ReactDOM from 'react-dom/client';

// Simple working component
function App() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#0a0b0e',
      color: '#e8eaed',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '64px', marginBottom: '20px' }}>🚀 TradeFlow</h1>
      <p style={{ fontSize: '20px', color: '#848e9c' }}>Your crypto trading platform</p>
      <p style={{ fontSize: '14px', color: '#4a9eff', marginTop: '20px' }}>
        ✅ React is working!
      </p>
      <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
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
          fontWeight: '600',
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
    </div>
  );
}

export default App;
