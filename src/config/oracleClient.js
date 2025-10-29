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
    // Only initialize locally (Mac)
    if (process.platform === "darwin") {
      oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_23_3_arm64" });
      console.log("✅ Oracle client initialized (local Mac)");
    } else {
      console.log("ℹ️ Skipping Oracle client init (cloud environment)");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Oracle client:", err);
    process.exit(1);
  }
}
