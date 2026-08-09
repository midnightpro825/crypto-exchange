const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fs = require('fs');

dotenv.config();

const app = express();

// CORS
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'tradeflow-super-secret-key-change-in-production';

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect(async (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL database');
        await createTables();
    }
});

async function createTables() {
    try {
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
        console.log('✅ All tables ready!');
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
    }
}

// ============================================================
// SERVE FRONTEND - CORRECT PATH: Go up TWO levels from backend/src
// ============================================================
// __dirname = /opt/render/project/src/backend/src
// Go up two levels: /opt/render/project/src
const projectRoot = path.resolve(__dirname, '../..');
const frontendPath = path.join(projectRoot, 'frontend/dist');

console.log('📁 Project root:', projectRoot);
console.log('📁 Frontend path:', frontendPath);

// Check if frontend exists
if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend dist folder found!');
    const files = fs.readdirSync(frontendPath);
    console.log('📄 Files:', files.slice(0, 5));
} else {
    console.log('❌ Frontend dist folder NOT found at:', frontendPath);
    console.log('📁 Trying alternative path...');
    // Try an alternative path
    const altPath = path.join(process.cwd(), 'frontend/dist');
    console.log('📁 Alternative path:', altPath);
    if (fs.existsSync(altPath)) {
        console.log('✅ Found frontend at alternative path!');
        frontendPath = altPath;
    }
}

// Serve static files
app.use(express.static(frontendPath));

// ============================================================
// API ROUTES
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'running', timestamp: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
    console.log('📝 Registration attempt:', req.body.email);
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
        
        console.log('✅ User registered:', user.username);
        
        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: { id: user.id, username: user.username, email: user.email, name: user.first_name, role: user.role },
            token: token
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt:', req.body.email);
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
        
        console.log('✅ User logged in:', user.username);
        
        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, name: user.first_name || user.username, role: user.role },
            token: token
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
    }
});

// ============================================================
// CATCH-ALL: Serve React frontend
// ============================================================
app.use((req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <html>
                <head><title>TradeFlow</title></head>
                <body style="background:#0a0b0e;color:#e8eaed;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;">
                    <h1>🚀 TradeFlow</h1>
                    <p>Server is running!</p>
                    <p style="color:#848e9c;">Looking for: ${frontendPath}</p>
                    <p style="color:#848e9c;">index.html: ${indexPath}</p>
                </body>
            </html>
        `);
    }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${frontendPath}`);
});
