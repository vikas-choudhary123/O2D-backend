// import oracledb from "oracledb";
import oracledb from 'oracledb-thin';
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

    console.log("📡 Creating Oracle connection pool for Oracle 11g...");

    // Connection configurations for Oracle 11g
    const connectionTests = [
      { 
        connectString: "127.0.0.1:1521/ora11g", 
        description: "ora11g service" 
      },
      { 
        connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=127.0.0.1)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ora11g)))", 
        description: "TNS ora11g" 
      },
      { 
        connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=127.0.0.1)(PORT=1521))(CONNECT_DATA=(SID=ora11g)))", 
        description: "SID ora11g" 
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
        continue;
      }
    }

    if (!workingConfig) {
      throw new Error(`Oracle 11g connection failed.\n\nTried configurations:\n- ora11g service\n- TNS ora11g\n- SID ora11g\n\nPlease verify:\n1. Oracle service 'ora11g' is running\n2. Credentials are correct: ${process.env.ORACLE_USER}/***\n3. Oracle listener is active on port 1521`);
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
    console.log("✅ Oracle 11g connection pool started");

    // Final test
    console.log("🧪 Final connection test...");
    const connection = await pool.getConnection();
    const result = await connection.execute(`SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') as db_time FROM DUAL`);
    console.log(`✅ Database time: ${result.rows[0][0]}`);
    await connection.close();
    
    console.log("🎉 Oracle 11g database connection fully established!");
    
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