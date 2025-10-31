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