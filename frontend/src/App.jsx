import React, { useState, useEffect } from 'react';

console.log('🚀 DEBUG: App.jsx loaded');

function App() {
  console.log('🔄 DEBUG: App component rendering');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('✅ DEBUG: App mounted');
    setLoading(false);
    console.log('📍 Current path:', window.location.pathname);
  }, []);

  if (loading) {
    console.log('⏳ DEBUG: Showing loading...');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0b0e',
        color: '#e8eaed',
        fontSize: '24px'
      }}>
        Loading TradeFlow...
      </div>
    );
  }

  console.log('🎨 DEBUG: Rendering main content');
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
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '64px' }}>🚀 TradeFlow</h1>
      <p style={{ fontSize: '20px', color: '#848e9c' }}>Server is running!</p>
      <p style={{ fontSize: '14px', color: '#4ade80' }}>✅ React is working!</p>
      <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
        <a href="/login" style={{ padding: '12px 32px', background: '#4a9eff', color: '#fff', textDecoration: 'none', borderRadius: '8px' }}>Login</a>
        <a href="/register" style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.04)', color: '#fff', textDecoration: 'none', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>Register</a>
        <a href="/admin-login.html" style={{ padding: '12px 32px', background: '#f0b90b', color: '#0a0b0e', textDecoration: 'none', borderRadius: '8px' }}>Admin</a>
      </div>
    </div>
  );
}

console.log('✅ DEBUG: App component defined');
export default App;
