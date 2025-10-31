import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

dotenv.config();

let pool;
let sshTunnelActive = false;

// Test different connection scenarios
const CONNECTION_TESTS = [
  // Try different service names
  { connectString: "127.0.0.1:1521/ORCL", description: "ORCL service" },
  { connectString: "127.0.0.1:1521/XE", description: "XE service" },
  { connectString: "127.0.0.1:1521", description: "No service name" },
  // Try different ports (common Oracle ports)
  { connectString: "127.0.0.1:1522/ORCL", description: "Port 1522" },
  { connectString: "127.0.0.1:1526/ORCL", description: "Port 1526" },
];

export async function initPool() {
  try {
    console.log("🔐 Initializing SSH tunnel...");
    
    await initSSHTunnel();
    sshTunnelActive = true;
    await new Promise(resolve => setTimeout(resolve, 2000));

    initOracleClient();

    console.log("📡 Testing Oracle connection scenarios...");

    let lastError = null;
    
    for (const test of CONNECTION_TESTS) {
      try {
        console.log(`🔄 Testing: ${test.description} - ${test.connectString}`);
        
        const dbConfig = {
          user: process.env.ORACLE_USER,
          password: process.env.ORACLE_PASSWORD,
          connectString: test.connectString,
          poolMin: 1,
          poolMax: 1, // Small pool for testing
          poolTimeout: 10,
          connectTimeout: 10000,
        };

        pool = await oracledb.createPool(dbConfig);
        console.log(`✅ Pool created for: ${test.description}`);

        // Simple connection test
        const connection = await pool.getConnection();
        console.log(`✅ Connection successful for: ${test.description}`);
        
        // Test a query
        const result = await connection.execute(`SELECT USER FROM DUAL`);
        console.log(`✅ Query successful. Connected as: ${result.rows[0][0]}`);
        
        await connection.close();
        await pool.close(0);
        
        console.log(`🎉 SUCCESS: Working configuration found: ${test.description}`);
        return; // Exit on success
        
      } catch (err) {
        lastError = err;
        console.log(`❌ ${test.description} failed: ${err.message}`);
        
        if (pool) {
          try {
            await pool.close(0);
            pool = null;
          } catch (closeErr) {
            // Ignore close errors
          }
        }
        continue;
      }
    }
    
    throw new Error(`All connection tests failed. Last error: ${lastError?.message}`);
    
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