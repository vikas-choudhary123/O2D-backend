import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

dotenv.config();

let pool;
let sshTunnelActive = false;

export async function initPool() {
  try {
    console.log("🔐 Initializing SSH tunnel...");
    
    // Initialize SSH tunnel first
    await initSSHTunnel();
    sshTunnelActive = true;
    
    // Wait for tunnel to stabilize
    console.log("⏳ Waiting for SSH tunnel to stabilize...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Initialize Oracle client
    initOracleClient();

    console.log("📡 Creating Oracle connection pool...");

    // Test the most common Oracle configurations
    const connectionTests = [
      { connectString: "127.0.0.1:1521/ORCL", description: "ORCL service" },
      { connectString: "127.0.0.1:1521/XE", description: "XE service" },
      { connectString: "127.0.0.1:1521", description: "No service name" },
    ];

    let workingConfig = null;
    
    for (const test of connectionTests) {
      try {
        console.log(`🔄 Testing: ${test.description}`);
        
        const testConfig = {
          user: process.env.ORACLE_USER,
          password: process.env.ORACLE_PASSWORD,
          connectString: test.connectString,
          poolMin: 1,
          poolMax: 1,
          poolTimeout: 10,
          connectTimeout: 15000, // 15 seconds timeout
        };

        const testPool = await oracledb.createPool(testConfig);
        const connection = await testPool.getConnection();
        
        // Test a simple query
        const result = await connection.execute(`SELECT USER as current_user FROM DUAL`);
        console.log(`🎉 SUCCESS with ${test.description}! Connected as: ${result.rows[0][0]}`);
        
        await connection.close();
        await testPool.close();
        
        workingConfig = test;
        break;
        
      } catch (err) {
        console.log(`❌ ${test.description} failed: ${err.message}`);
        continue;
      }
    }

    if (!workingConfig) {
      throw new Error("No Oracle connection configuration worked. Please check:\n1. Oracle credentials\n2. Oracle service name\n3. Oracle is running on the server");
    }

    // Create the main pool with working configuration
    console.log(`✅ Creating main pool with: ${workingConfig.description}`);
    
    const dbConfig = {
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: workingConfig.connectString,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 30000,
      connectTimeout: 30000,
    };

    pool = await oracledb.createPool(dbConfig);
    console.log("✅ Oracle connection pool started");

    // Final connection test
    console.log("🧪 Final connection test...");
    const connection = await pool.getConnection();
    const result = await connection.execute(`SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as db_time FROM DUAL`);
    console.log(`✅ Database time: ${result.rows[0][0]}`);
    await connection.close();
    
    console.log("🎉 Database connection fully established!");
    
  } catch (err) {
    console.error("❌ Pool init failed:", err.message);
    await cleanup();
    throw err;
  }
}

async function cleanup() {
  if (pool) {
    try {
      await pool.close(0);
      pool = null;
      console.log("✅ Pool closed during cleanup");
    } catch (closeErr) {
      console.error("Error closing pool:", closeErr.message);
    }
  }
  
  if (sshTunnelActive) {
    try {
      await closeSSHTunnel();
      sshTunnelActive = false;
      console.log("✅ SSH tunnel closed during cleanup");
    } catch (tunnelErr) {
      console.error("Error closing SSH tunnel:", tunnelErr.message);
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