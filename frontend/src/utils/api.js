import axios from 'axios';
import { API_BASE_URL } from '../config';

// Use the config URL instead of hardcoded localhost
const API_URL = API_BASE_URL || 'https://crypto-exchange-1-e6rq.onrender.com/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Balance API
export const getBalance = async (userId) => {
    try {
        const response = await api.get(`/balance${userId ? `?userId=${userId}` : ''}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching balance:', error);
        throw error;
    }
};

// Deposit API
export const createDeposit = async (depositData) => {
    try {
        const response = await api.post('/balance/deposit', depositData);
        return response.data;
    } catch (error) {
        console.error('Error creating deposit:', error);
        throw error;
    }
};

// Deposit API - request a deposit
export const requestDeposit = async (depositData) => {
    try {
        const response = await api.post('/balance/deposit', depositData);
        return response.data;
    } catch (error) {
        console.error('Error requesting deposit:', error);
        throw error;
    }
};

export default api;

