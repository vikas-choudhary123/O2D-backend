import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

dotenv.config();

let pool;

export async function initPool() {
  try {
    // Step 1: Create SSH tunnel
    console.log("🔐 Initializing SSH tunnel...");
    await initSSHTunnel();

    // Step 2: Initialize Oracle client
    initOracleClient();

    // Step 3: Create connection pool (always use localhost through tunnel)
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: 'localhost:1521/ora11g', // Through SSH tunnel
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      connectTimeout: 60000,
      queueTimeout: 60000,
      stmtCacheSize: 0,
    });
    
    console.log("✅ Oracle connection pool started");
    
    // Test connection
    const testConn = await pool.getConnection();
    console.log("✅ Test connection successful");
    await testConn.close();
    
  } catch (err) {
    console.error("❌ Pool init failed:", err);
    await closeSSHTunnel();
    process.exit(1);
  }
}

export async function getConnection() {
  if (!pool) await initPool();
  return pool.getConnection();
}

export async function closePool() {
  try {
    if (pool) {
      await pool.close(10);
      console.log("✅ Oracle pool closed");
    }
    await closeSSHTunnel();
  } catch (err) {
    console.error("❌ Error closing:", err);
  }
}