import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import './theme.css';
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

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error Boundary caught an error:', error);
    console.error('Error details:', errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          background: '#0a0b0e',
          color: '#f87171'
        }}>
          <div style={{ fontSize: '48px' }}>💥</div>
          <h2>Something went wrong loading the admin panel</h2>
          <p style={{ color: '#848e9c', maxWidth: '600px', textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/admin-login.html';
            }}
            style={{
              padding: '10px 24px',
              background: '#4a9eff',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Go to Admin Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const { setIsLoggedIn, setUser, setBalance } = useContext(AuthContext);

  const path = window.location.pathname;
  console.log('📍 Current path:', path);

  useEffect(() => {
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
    setIsLoading(false);
  }, []);

  // ============================================================
  // ADMIN ROUTE HANDLING - THIS MUST BE FIRST
  // ============================================================
  if (path === '/admin' || path === '/admin/' || path.startsWith('/admin/')) {
    if (path === '/admin-login.html' || path === '/admin-login') {
      window.location.href = '/admin-login.html';
      return null;
    }
    
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('🔍 Admin route check:', {
      path,
      token: !!token,
      role: userData.role,
      isAdmin: token && userData.role === 'admin'
    });
    
    if (token && userData.role === 'admin') {
      console.log('✅ Admin authorized - rendering AdminApp with ErrorBoundary');
      return (
        <ErrorBoundary>
          <AdminApp />
        </ErrorBoundary>
      );
    } else {
      console.log('❌ Not authorized - redirecting to admin-login.html');
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
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
