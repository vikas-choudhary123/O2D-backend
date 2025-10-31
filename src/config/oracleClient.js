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

// export function initOracleClient() {
//   try {
//     // Only initialize locally (Mac)
//     if (process.platform === "darwin") {
//       oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_23_3_arm64" });
//       console.log("✅ Oracle client initialized (local Mac)");
//     } else {
//       console.log("ℹ️ Skipping Oracle client init (cloud environment)");
//     }
//   } catch (err) {
//     console.error("❌ Failed to initialize Oracle client:", err);
//     process.exit(1);
//   }
// }


import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function initOracleClient() {
  try {
    const libDir = path.join(__dirname, '../oracle_client/instantclient_19_24');
    if (fs.existsSync(libDir)) {
      oracledb.initOracleClient({ libDir });
      console.log('✅ Oracle Thick Client initialized');
    } else {
      console.log('⚠️ Instant Client not found, using Thin mode');
    }
  } catch (err) {
    console.error('❌ Failed to initialize Oracle Client:', err);
  }
}
