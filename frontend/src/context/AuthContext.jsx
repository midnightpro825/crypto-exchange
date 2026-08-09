import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getBalance } from '../utils/api';

export const AuthContext = createContext();

const API_URL = API_BASE_URL || 'https://crypto-exchange-1-e6rq.onrender.com/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [orders, setOrders] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [watchlist, setWatchlist] = useState(['BTC/USDT', 'ETH/USDT']);
    const [theme, setTheme] = useState('dark');
    const [apiKeys, setApiKeys] = useState([]);
    const [whitelist, setWhitelist] = useState([]);

    useEffect(() => {
        const loadUser = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            
            if (userData && token) {
                try {
                    const parsedUser = JSON.parse(userData);
                    console.log('✅ User loaded from localStorage:', parsedUser);
                    setUser(parsedUser);
                    setIsLoggedIn(true);
                    if (parsedUser.id) {
                        refreshBalance(parsedUser.id);
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } else {
                console.log('ℹ️ No user found, using guest mode');
                setUser(null);
                setIsLoggedIn(false);
                setBalance(0);
            }
            setIsLoading(false);
        };

        loadUser();

        const handleStorageChange = (event) => {
            if (event.key === 'user' || event.key === 'token') {
                console.log('🔄 Storage changed, reloading user...');
                loadUser();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const refreshBalance = async (userId) => {
        try {
            const id = userId || user?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
            if (!id) {
                setBalance(0);
                return 0;
            }
            console.log('📊 Fetching balance for user ID:', id);
            const data = await getBalance(id);
            let total = 0;
            if (data && data.balances && data.balances.length > 0) {
                total = data.balances.reduce((sum, item) => sum + parseFloat(item.available || 0), 0);
            }
            setBalance(total);
            console.log('💰 AuthContext: Balance set to:', total);
            return total;
        } catch (error) {
            console.error('❌ AuthContext: Error fetching balance:', error);
            return 0;
        }
    };

    const register = async (userData) => {
        try {
            console.log('📝 Registering new user:', userData);
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            const data = await response.json();
            console.log('📡 Registration response:', data);
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                setIsLoggedIn(true);
                setBalance(0);
                console.log('✅ User registered and saved!');
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new Event('userLoggedIn'));
                return { success: true, user: data.user, token: data.token };
            } else {
                const error = new Error(data.message || 'Registration failed');
                error.field = data.field;
                error.status = response.status;
                throw error;
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    };

    const login = async (email, password) => {
        try {
            console.log('🔐 Logging in:', email);
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            console.log('📡 Login response:', data);
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                setIsLoggedIn(true);
                if (data.user?.id) {
                    await refreshBalance(data.user.id);
                }
                console.log('✅ User logged in:', data.user.name);
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new Event('userLoggedIn'));
                return { success: true, user: data.user, token: data.token };
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        console.log('🔴 Logging out user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsLoggedIn(false);
        setBalance(0);
        setOrders([]);
        setTradeHistory([]);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('userLoggedOut'));
        window.location.href = '/';
    };

    const value = {
        user,
        setUser,
        balance,
        setBalance,
        orders,
        setOrders,
        tradeHistory,
        setTradeHistory,
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
        setIsLoading,
        watchlist,
        setWatchlist,
        theme,
        setTheme,
        apiKeys,
        setApiKeys,
        whitelist,
        setWhitelist,
        refreshBalance,
        login,
        logout,
        register,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
