import express from 'express';
import { initPool, closePool, getConnection } from './config/db.js';
import net from 'net'; // Import net for TCP testing

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test SSH tunnel specifically (FIXED - no require)
app.get('/test-tunnel', (req, res) => {
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

// Test different service names
app.get('/test-service-names', async (req, res) => {
  const serviceNames = ['ora11g', 'ORCL', 'XE', 'XEPDB1', 'orcl'];
  const results = [];
  
  for (const serviceName of serviceNames) {
    try {
      console.log(`🧪 Testing service name: ${serviceName}`);
      
      // Create a temporary pool with this service name
      const tempPool = await import('oracledb').then(oracledb => 
        oracledb.default.createPool({
          user: process.env.ORACLE_USER,
          password: process.env.ORACLE_PASSWORD,
          connectString: `127.0.0.1:1521/${serviceName}`,
          poolMin: 1,
          poolMax: 1,
          poolTimeout: 10,
          queueTimeout: 10000,
        })
      );
      
      const connection = await tempPool.getConnection();
      const result = await connection.execute(`SELECT 1 FROM DUAL`);
      await connection.close();
      await tempPool.close();
      
      results.push({
        serviceName,
        status: 'SUCCESS',
        message: 'Connection successful'
      });
      
      console.log(`✅ Service ${serviceName}: SUCCESS`);
      
    } catch (error) {
      results.push({
        serviceName,
        status: 'FAILED',
        message: error.message
      });
      console.log(`❌ Service ${serviceName}: ${error.message}`);
    }
  }
  
  res.json({
    test: 'service_name_discovery',
    results: results
  });
});

// Initialize server
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log('📝 Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SSH_USER_SET: !!process.env.SSH_USER
    });
    
    // Initialize database connection first
    await initPool();
    
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 Health check: https://your-app.onrender.com/health`);
      console.log(`🔗 DB test: https://your-app.onrender.com/test-db-detailed`);
      console.log(`🔗 Service name test: https://your-app.onrender.com/test-service-names`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Start the application
startServer();