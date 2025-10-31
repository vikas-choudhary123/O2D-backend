import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";
import { initSSHTunnel, closeSSHTunnel } from "./sshTunnel.js";

dotenv.config();

let pool;
let tunnelInitialized = false;

export async function initPool() {
  try {
    console.log("🔐 Initializing SSH tunnel...");
    await initSSHTunnel();
    tunnelInitialized = true;

    // Initialize Oracle client (for local Mac only)
    initOracleClient();

    console.log("📡 Creating Oracle connection pool...");

    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: "127.0.0.1:1521/ora11g", // ✅ via SSH tunnel
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      connectTimeout: 30000,
      queueTimeout: 30000,
    });

    console.log("✅ Oracle connection pool started");

    // Test connection
    console.log("🧪 Testing database connection...");
    const testConn = await pool.getConnection();
    console.log("✅ Test connection successful");
    await testConn.close();
  } catch (err) {
    console.error("❌ Pool init failed:", err.message);

    if (pool) {
      try {
        await pool.close(0);
      } catch (closeErr) {
        console.error("Error closing pool:", closeErr.message);
      }
    }

    if (tunnelInitialized) {
      await closeSSHTunnel();
    }

    throw err;
  }
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return pool.getConnection();
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
    console.error("❌ Error closing pool:", err.message);
  }
}
