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

    // Initialize Oracle client (Thin mode)
    initOracleClient();

    console.log("📡 Creating Oracle connection pool...");

    // Oracle 11g connection configurations for Thin mode
    const connectionTests = [
      { 
        connectString: "127.0.0.1:1521/ora11g", 
        description: "ora11g service" 
      },
      { 
        connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=127.0.0.1)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ora11g)))", 
        description: "TNS ora11g" 
      },
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
          connectTimeout: 20000,
        };

        console.log(`   Using connectString: ${test.connectString}`);
        
        const testPool = await oracledb.createPool(testConfig);
        const connection = await testPool.getConnection();
        
        // Test query
        const result = await connection.execute(`SELECT USER as current_user FROM DUAL`);
        console.log(`🎉 SUCCESS with ${test.description}! Connected as: ${result.rows[0][0]}`);
        
        await connection.close();
        await testPool.close();
        
        workingConfig = test;
        break;
        
      } catch (err) {
        console.log(`❌ ${test.description} failed: ${err.message}`);
        
        // Handle Oracle 11g Thin mode compatibility
        if (err.message.includes('NJS-138')) {
          console.log("💡 Oracle 11g version compatibility issue in Thin mode");
          console.log("🔄 Trying alternative approach...");
        }
        continue;
      }
    }

    if (!workingConfig) {
      throw new Error(`Oracle 11g connection failed in Thin mode.\n\nPossible solutions:\n1. Oracle 11g may not be fully supported in Thin mode\n2. Try using a different Oracle driver\n3. Consider upgrading your Oracle database\n\nLast error: Oracle 11g Thin mode compatibility`);
    }

    // Create main pool
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

    // Final test
    console.log("🧪 Final connection test...");
    const connection = await pool.getConnection();
    const result = await connection.execute(`SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as db_time FROM DUAL`);
    console.log(`✅ Database time: ${result.rows[0][0]}`);
    await connection.close();
    
    console.log("🎉 Oracle 11g connection established in Thin mode!");
    
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