const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

dotenv.config();

const app = express();

// ============================================================
// CORS - Allow everything (for now)
// ============================================================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'tradeflow-super-secret-key-change-in-production';

// ============================================================
// DATABASE CONNECTION
// ============================================================
// Try DATABASE_URL first, then individual params
let pool;

try {
    if (process.env.DATABASE_URL) {
        console.log('📦 Using DATABASE_URL for connection');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    } else {
        console.log('📦 Using individual database parameters');
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'tradeflow',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
        });
    }
} catch (error) {
    console.error('❌ Database pool creation error:', error.message);
}

// ============================================================
// CREATE TABLES
// ============================================================
async function createTables() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                phone VARCHAR(20),
                role VARCHAR(20) DEFAULT 'user',
                kyc_status VARCHAR(20) DEFAULT 'pending',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');

        // Balances table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS balances (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                asset VARCHAR(20) NOT NULL,
                available DECIMAL(20,8) DEFAULT 0,
                locked DECIMAL(20,8) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, asset)
            )
        `);
        console.log('✅ Balances table ready');

        // Deposits table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS deposits (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                asset VARCHAR(20) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                address TEXT,
                tx_hash TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                approved_by INTEGER REFERENCES users(id),
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Deposits table ready');

        // Withdrawals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS withdrawals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                asset VARCHAR(20) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                address TEXT,
                tx_hash TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                approved_by INTEGER REFERENCES users(id),
                approved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Withdrawals table ready');

        // Trades table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trades (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                pair VARCHAR(20) NOT NULL,
                type VARCHAR(10) NOT NULL,
                side VARCHAR(10) NOT NULL,
                price DECIMAL(20,8) NOT NULL,
                amount DECIMAL(20,8) NOT NULL,
                total DECIMAL(20,8) NOT NULL,
                status VARCHAR(20) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Trades table ready');

        console.log('✅ All tables ready!');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

// ============================================================
// CONNECT TO DATABASE
// ============================================================
pool.connect(async (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
        console.log('⚠️ Running in demo mode (no database)');
    } else {
        console.log('✅ Connected to PostgreSQL database');
        await createTables();
    }
});

// ============================================================
// SERVE FRONTEND
// ============================================================
const frontendPath = path.join(__dirname, '../../frontend/dist');
console.log('📁 Frontend path:', frontendPath);
app.use(express.static(frontendPath));

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// ============================================================
// REGISTER - FIXED
// ============================================================
app.post('/api/auth/register', async (req, res) => {
    console.log('📝 Registration attempt:', req.body);
    try {
        const { name, email, password, username } = req.body;
        
        // Validate all fields
        if (!email || !password || !name || !username) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required: name, email, password, username' 
            });
        }
        
        // Validate email format
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address' 
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }
        
        // Check if email exists
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already registered. Please login.' 
            });
        }
        
        // Check if username exists
        const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already taken. Please choose another.' 
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const result = await pool.query(
            `INSERT INTO users (username, email, password, first_name, role, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING id, username, email, first_name, role, is_active`,
            [username, email, hashedPassword, name, 'user', true]
        );
        
        const user = result.rows[0];
        
        // Create default balances
        const defaultAssets = ['USDT', 'BTC', 'ETH', 'SOL'];
        for (const asset of defaultAssets) {
            await pool.query(
                `INSERT INTO balances (user_id, asset, available, locked)
                 VALUES ($1, $2, 0, 0)`,
                [user.id, asset]
            );
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        console.log('✅ User registered successfully:', user.username);
        
        res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to TradeFlow! 🎉',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.first_name,
                role: user.role
            },
            token: token
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // Handle duplicate key errors
        if (error.code === '23505') {
            if (error.constraint === 'users_username_key') {
                return res.status(400).json({
                    success: false,
                    message: 'Username already taken. Please choose another.'
                });
            }
            if (error.constraint === 'users_email_key') {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered. Please login.'
                });
            }
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed: ' + error.message 
        });
    }
});

// ============================================================
// LOGIN - FIXED
// ============================================================
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt:', req.body.email);
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        const result = await pool.query(
            `SELECT id, username, email, password, first_name, role, is_active 
             FROM users WHERE email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        const user = result.rows[0];
        
        if (!user.is_active) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account is deactivated. Please contact support.' 
            });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        console.log('✅ User logged in:', user.username);
        
        res.json({
            success: true,
            message: 'Login successful! Welcome back! 🎉',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.first_name || user.username,
                role: user.role
            },
            token: token
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed: ' + error.message 
        });
    }
});

// ============================================================
// GET USER PROFILE
// ============================================================
app.get('/api/user/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query(
            'SELECT id, username, email, first_name, role, is_active FROM users WHERE id = $1',
            [decoded.id]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            return res.json({
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.first_name || user.username,
                role: user.role,
                is_active: user.is_active
            });
        }
        res.status(404).json({ error: 'User not found' });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// ============================================================
// GET BALANCE
// ============================================================
app.get('/api/balance', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        
        const result = await pool.query(
            'SELECT asset, available, locked FROM balances WHERE user_id = $1',
            [userId]
        );
        
        res.json({ balances: result.rows });
    } catch (error) {
        console.error('Balance error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// ============================================================
// LOGOUT
// ============================================================
app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================
// CATCH-ALL - Serve React frontend
// ============================================================
app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================================
// ERROR HANDLING
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error: ' + err.message 
    });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🚀 TradeFlow Server Running!');
    console.log('📡 Port: ' + PORT);
    console.log('✅ Health: http://localhost:' + PORT + '/api/health');
    console.log('📁 Frontend: ' + frontendPath);
    console.log('========================================');
});
