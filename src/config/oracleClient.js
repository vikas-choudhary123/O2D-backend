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
// import oracledb from "oracledb";
import oracledb from 'oracledb-thin';

export function initOracleClient() {
  try {
    console.log("🔧 Initializing Oracle Client for Oracle 11g...");
    
    // For oracledb@4.2.0, we need to handle client initialization differently
    if (process.platform === "darwin") {
      // Local Mac development
      oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_23_3_arm64" });
      console.log("✅ Oracle Thick Client initialized (local Mac)");
    } else {
      // Render environment - let oracledb auto-detect
      console.log("🌐 Render environment - using auto-detected Oracle client");
      // oracledb@4.2.0 has better Oracle 11g support and can work without explicit init
    }
    
  } catch (err) {
    console.log("ℹ️ Oracle client initialization note:", err.message);
    console.log("🔄 Continuing with available Oracle client mode");
  }
}