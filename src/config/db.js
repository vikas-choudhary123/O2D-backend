import oracledb from "oracledb";
import dotenv from "dotenv";
import { initOracleClient } from "./oracleClient.js";

dotenv.config();

let pool;

export async function initPool() {
  try {
    initOracleClient();
    pool = await oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      connectTimeout: 10,
      queueTimeout: 10000,
      stmtCacheSize: 0,
    });
    console.log("✅ Oracle connection pool started");
  } catch (err) {
    console.error("❌ Pool init failed:", err);
    process.exit(1);
  }
}

export async function getConnection() {
  if (!pool) await initPool();
  return pool.getConnection();
}
