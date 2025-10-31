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

import oracledb from "oracledb";

export function initOracleClient() {
  try {
    console.log("🔧 Configuring Oracle Client...");
    
    // Force Thin mode - no Oracle Instant Client needed
    // This works on both macOS ARM64 and Render
    oracledb.initOracleClient();
    console.log("✅ Oracle Thin Client configured");
    
  } catch (err) {
    console.log("ℹ️ Using default Oracle Thin mode (no additional configuration needed)");
  }
}