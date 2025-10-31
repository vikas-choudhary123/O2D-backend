// import oracledb from "oracledb";

// export function initOracleClient() {
//   try {
//     oracledb.initOracleClient({
//       libDir: "/opt/oracle/instantclient_23_3_arm64",
//     });
//     console.log("✅ Oracle client initialized");
//   } catch (err) {
//     console.error("❌ Failed to initialize Oracle client:", err);
//     process.exit(1);
//   }
// }



import oracledb from 'oracledb';

export function initOracleClient() {
  try {
    console.log('ℹ️ Using Oracle Thin Client (cloud environment)');
    // No initialization needed for thin client in Render
  } catch (err) {
    console.log('ℹ️ Oracle Thin Client mode');
  }
}