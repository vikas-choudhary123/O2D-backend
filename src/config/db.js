import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

// Load environment variables
dotenv.config();

let pool;
let sshTunnelActive = false;

// Try different service names
const SERVICE_NAMES = ['ORCL', 'XE', 'XEPDB1', 'orcl', 'ora11g'];

export async function initPool() {
  try {
    console.log("🔐 Initializing SSH tunnel...");
    
    // Initialize SSH tunnel first
    await initSSHTunnel();
    sshTunnelActive = true;
    
    // Wait a moment for tunnel to be fully established
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize Oracle client
    initOracleClient();

    console.log("📡 Creating Oracle connection pool...");

    // Try different service names
    let lastError = null;
    
    for (const serviceName of SERVICE_NAMES) {
      try {
        console.log(`🔄 Trying service name: ${serviceName}`);
        
        const dbConfig = {
          user: process.env.ORACLE_USER,
          password: process.env.ORACLE_PASSWORD,
          connectString: `127.0.0.1:1521/${serviceName}`,
          poolMin: 1,
          poolMax: 4,
          poolIncrement: 1,
          poolTimeout: 60,
          queueTimeout: 30000,
          connectTimeout: 30000,
        };

        console.log('Database config:', { 
          user: dbConfig.user,
          connectString: dbConfig.connectString
        });

        pool = await oracledb.createPool(dbConfig);
        console.log(`✅ Oracle connection pool started with service: ${serviceName}`);

        // Test connection
        console.log("🧪 Testing database connection...");
        await testConnectionWithRetry();
        console.log("✅ Database connection test successful");
        
        return; // Success - exit the loop
        
      } catch (err) {
        lastError = err;
        console.log(`❌ Service ${serviceName} failed:`, err.message);
        
        // Close pool if it was created
        if (pool) {
          try {
            await pool.close(0);
            pool = null;
          } catch (closeErr) {
            console.error('Error closing pool:', closeErr);
          }
        }
        
        // Continue to next service name
        continue;
      }
    }
    
    // If we get here, all service names failed
    throw new Error(`All service names failed. Last error: ${lastError?.message}`);
    
  } catch (err) {
    console.error("❌ Pool init failed:", err.message);
    await cleanup();
    throw err;
  }
}

async function testConnectionWithRetry(maxRetries = 3, retryDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let connection;
    try {
      console.log(`🔗 Attempt ${attempt}: Getting connection from pool...`);
      connection = await pool.getConnection();
      console.log(`✅ Attempt ${attempt}: Got connection, executing test query...`);
      
      const result = await connection.execute(`SELECT 1 FROM DUAL`);
      console.log(`✅ Attempt ${attempt}: Test query successful`);
      
      await connection.close();
      console.log(`✅ Connection test successful (attempt ${attempt})`);
      return;
    } catch (err) {
      console.log(`❌ Attempt ${attempt} failed:`, err.message);
      
      if (connection) {
        try {
          await connection.close();
        } catch (closeErr) {
          console.error('Error closing connection:', closeErr);
        }
      }
      
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.log(`💥 All connection attempts failed`);
        throw err;
      }
    }
  }
}

async function cleanup() {
  if (pool) {
    try {
      await pool.close(0);
      pool = null;
      console.log("✅ Pool closed during cleanup");
    } catch (closeErr) {
      console.error("Error closing pool:", closeErr);
    }
  }
  
  if (sshTunnelActive) {
    try {
      await closeSSHTunnel();
      sshTunnelActive = false;
      console.log("✅ SSH tunnel closed during cleanup");
    } catch (tunnelErr) {
      console.error("Error closing SSH tunnel:", tunnelErr);
    }
  }
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return await pool.getConnection();
}

export async function closePool() {
  await cleanup();
}