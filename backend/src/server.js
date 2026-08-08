const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'tradeflow-super-secret-key-change-in-production';

// ============================================================
// DATABASE CONNECTION
// ============================================================
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tradeflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

pool.connect((err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL database');
    }
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());

// Serve static files from the frontend dist directory
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// ============================================================
// API ROUTES - AUTH
// ============================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, username } = req.body;
        
        if (!email || !password || !name || !username) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        
        const usernameCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already taken' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const result = await pool.query(
            `INSERT INTO users (username, email, password, first_name, role, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING id, username, email, first_name, role, is_active`,
            [username, email, hashedPassword, name, 'user', true]
        );
        
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: { id: user.id, username: user.username, email: user.email, name: user.first_name, role: user.role },
            token: token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        
        const result = await pool.query(
            `SELECT id, username, email, password, first_name, role, is_active FROM users WHERE email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, name: user.first_name || user.username, role: user.role },
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================
// USER PROFILE
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
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// ============================================================
// BALANCE ENDPOINT
// ============================================================
app.get('/api/balance', async (req, res) => {
    try {
        const userId = req.query.userId || 1;
        const result = await pool.query(
            'SELECT asset, available, locked FROM balances WHERE user_id = $1',
            [userId]
        );
        res.json({ balances: result.rows });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// DEPOSIT ENDPOINTS
// ============================================================
app.post('/api/balance/deposit', async (req, res) => {
    const { userId, asset, amount, address, txHash } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO deposits (user_id, asset, amount, address, tx_hash, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [userId, asset, amount, address, txHash]
        );
        res.json({ success: true, message: 'Deposit request submitted', deposit: result.rows[0] });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// ADMIN DEPOSITS
// ============================================================
app.get('/api/admin/deposits/pending', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, u.username, u.email 
            FROM deposits d
            JOIN users u ON d.user_id = u.id
            WHERE d.status = 'pending'
            ORDER BY d.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending deposits:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/deposits/:id/approve', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const deposit = await client.query(
            'SELECT * FROM deposits WHERE id = $1 AND status = $2',
            [id, 'pending']
        );
        if (deposit.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deposit not found or already processed' });
        }
        const dep = deposit.rows[0];
        await client.query(
            `UPDATE deposits SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [1, id]
        );
        await client.query(
            `INSERT INTO balances (user_id, asset, available)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, asset)
             DO UPDATE SET available = balances.available + $3`,
            [dep.user_id, dep.asset, dep.amount]
        );
        await client.query('COMMIT');
        res.json({ success: true, message: `Deposit approved! ${dep.amount} ${dep.asset} credited.` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving deposit:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ============================================================
// ADMIN STATS
// ============================================================
app.get('/api/admin/stats', async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const pendingDep = await pool.query("SELECT COUNT(*) FROM deposits WHERE status = 'pending'");
        const pendingWith = await pool.query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'");
        const totalTrades = await pool.query('SELECT COUNT(*) FROM trades');
        
        res.json({
            totalUsers: parseInt(users.rows[0].count),
            pendingDeposits: parseInt(pendingDep.rows[0].count),
            pendingWithdrawals: parseInt(pendingWith.rows[0].count),
            totalTrades: parseInt(totalTrades.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CATCH-ALL: Serve React frontend
// ============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
