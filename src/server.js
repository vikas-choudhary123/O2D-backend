import express from 'express';
import { initPool, closePool, getConnection } from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database on startup
app.listen(PORT, async () => {
  try {
    await initPool();
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Test route
    app.get('/test-db', async (req, res) => {
      try {
        const connection = await getConnection();
        const result = await connection.execute(
          `SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS current_time FROM DUAL`
        );
        await connection.close();
        
        res.json({ 
          success: true, 
          current_time: result.rows[0][0],
          message: 'Database connection successful' 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});


// Add these routes after your existing routes in server.js

// Test SSH tunnel specifically
app.get('/test-tunnel', (req, res) => {
  const net = require('net');
  
  console.log('🧪 Testing SSH tunnel connectivity...');
  
  const socket = new net.Socket();
  const timeout = 5000;
  
  socket.setTimeout(timeout);
  
  socket.connect(1521, '127.0.0.1', () => {
    console.log('✅ SSH tunnel: TCP connection successful');
    res.json({ 
      success: true, 
      message: 'SSH tunnel is working - TCP connection established',
      test: 'tunnel_tcp_connect'
    });
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.error('❌ SSH tunnel: TCP connection failed:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      test: 'tunnel_tcp_connect'
    });
  });
  
  socket.on('timeout', () => {
    console.error('❌ SSH tunnel: TCP connection timeout');
    res.status(500).json({ 
      success: false, 
      error: 'Connection timeout',
      test: 'tunnel_tcp_connect'
    });
    socket.destroy();
  });
});

// Test database connection with detailed error
app.get('/test-db-detailed', async (req, res) => {
  let connection;
  try {
    console.log('🧪 Testing database connection with details...');
    connection = await getConnection();
    
    // Test simple query
    const result = await connection.execute(`SELECT 'Hello from Oracle' AS message FROM DUAL`);
    console.log('✅ Database query successful:', result.rows[0][0]);
    
    // Get database version
    const versionResult = await connection.execute(`SELECT * FROM v$version WHERE rownum = 1`);
    console.log('✅ Database version:', versionResult.rows[0][0]);
    
    res.json({ 
      success: true, 
      message: 'Database connection successful',
      test_message: result.rows[0][0],
      version: versionResult.rows[0][0],
      test: 'database_full_connection'
    });
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error details:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      error_code: error.code,
      test: 'database_full_connection'
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
});

// Test environment variables
app.get('/env-check', (req, res) => {
  const envCheck = {
    ORACLE_USER: process.env.ORACLE_USER ? '***' : 'MISSING',
    ORACLE_PASSWORD: process.env.ORACLE_PASSWORD ? '***' : 'MISSING',
    SSH_HOST: process.env.SSH_HOST || 'MISSING',
    SSH_USER: process.env.SSH_USER || 'MISSING',
    SSH_PASSWORD: process.env.SSH_PASSWORD ? '***' : 'MISSING',
    SSH_PORT: process.env.SSH_PORT || '22',
    PORT: process.env.PORT || '3007'
  };
  
  res.json({
    environment_variables: envCheck,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});