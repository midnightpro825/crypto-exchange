import React, { useState, useEffect, useContext } from 'react';
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          background: '#0a0b0e',
          color: '#f87171',
          fontFamily: 'monospace',
          minHeight: '100vh'
        }}>
          <h1 style={{ color: '#f87171' }}>❌ React Error</h1>
          <p><strong>Error:</strong> {this.state.error?.message || 'Unknown error'}</p>
          <pre style={{
            background: '#1a1c24',
            padding: '20px',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '400px',
            color: '#e8eaed'
          }}>
            {this.state.error?.stack || 'No stack trace'}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#4a9eff',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Import components
import Header from './components/Layout/Header';
import BottomNav from './components/Layout/BottomNav';
import Dashboard from './components/Dashboard';
import Markets from './components/Markets';
import Trade from './components/Trade';
import Contracts from './components/Contracts';
import Assets from './components/Assets';
import Settings from './components/Settings';
import Account from './components/Account';
import Register from './pages/Register';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import AdminApp from './admin/AdminApp';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, AuthContext } from './context/AuthContext';

console.log('🚀 App loading...');

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const { setIsLoggedIn, setUser, setBalance } = useContext(AuthContext);

  const path = window.location.pathname;
  console.log('📍 Current path:', path);

  useEffect(() => {
    try {
      console.log('🔄 App useEffect running...');
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedUser && token) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('✅ User found:', parsedUser.name);
          setUser(parsedUser);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Error parsing user:', error);
          localStorage.clear();
        }
      }
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
    setIsLoading(false);
    console.log('✅ App loaded');
  }, []);

  // ============================================================
  // ADMIN ROUTE
  // ============================================================
  if (path === '/admin' || path === '/admin/') {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log('🔍 Admin route check:', { token: !!token, role: userData.role });
      
      if (token && userData.role === 'admin') {
        console.log('✅ Rendering AdminApp');
        return <AdminApp />;
      } else {
        console.log('❌ Not admin, redirecting');
        window.location.href = '/admin-login.html';
        return null;
      }
    } catch (error) {
      console.error('Admin route error:', error);
      window.location.href = '/admin-login.html';
      return null;
    }
  }

  // Show login/register pages
  if (path === '/login' || path === '/login/') {
    return <Login />;
  }
  if (path === '/register' || path === '/register/') {
    return <Register />;
  }

  // Show landing page for root path
  if (path === '/' || path === '/index.html' || path === '') {
    return <LandingPage />;
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🚀</div>
        <p style={{ color: '#848e9c' }}>TradeFlow Loading...</p>
      </div>
    );
  }

  const renderPage = () => {
    try {
      switch(activePage) {
        case 'dashboard': return <Dashboard setActivePage={setActivePage} />;
        case 'markets': return <Markets setActivePage={setActivePage} />;
        case 'trade': return <Trade />;
        case 'contracts': return <Contracts />;
        case 'assets': return <Assets />;
        case 'settings': return <Settings />;
        case 'account': return <Account />;
        default: return <Dashboard setActivePage={setActivePage} />;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return <div style={{ color: 'white', padding: '20px' }}>Error loading page: {error.message}</div>;
    }
  };

  return (
    <div className="app">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <div className="app-body">
        <main className="main-content">{renderPage()}</main>
      </div>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
};

function App() {
  console.log('🏗️ App component rendering...');
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

console.log('✅ App component defined');
export default App;
