import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

dotenv.config();

let pool;
let tunnelInitialized = false;

export async function initPool() {
  try {
    // Step 1: Create SSH tunnel
    console.log("🔐 Initializing SSH tunnel...");
    await initSSHTunnel();
    tunnelInitialized = true;

    // Step 2: Initialize Oracle client
    initOracleClient();

    // Step 3: Create connection pool with better error handling
    console.log("📡 Creating Oracle connection pool...");
    
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: 'localhost:1521/ora11g', // Through SSH tunnel
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      connectTimeout: 30000, // Reduced timeout
      queueTimeout: 30000,
      stmtCacheSize: 0,
    });
    
    console.log("✅ Oracle connection pool started");
    
    // Test connection with timeout
    console.log("🧪 Testing database connection...");
    const testConn = await pool.getConnection();
    console.log("✅ Test connection successful");
    await testConn.close();
    
  } catch (err) {
    console.error("❌ Pool init failed:", err.message);
    
    // Clean up resources
    if (tunnelInitialized) {
      await closeSSHTunnel();
    }
    if (pool) {
      try {
        await pool.close(0);
      } catch (closeErr) {
        console.error("Error closing pool:", closeErr);
      }
    }
    throw err; // Re-throw to let caller handle
  }
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return await pool.getConnection();
}

export async function closePool() {
  try {
    if (pool) {
      await pool.close(10);
      console.log("✅ Oracle pool closed");
      pool = null;
    }
    if (tunnelInitialized) {
      await closeSSHTunnel();
      tunnelInitialized = false;
    }
  } catch (err) {
    console.error("❌ Error closing:", err);
  }
}