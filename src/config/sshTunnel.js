import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createTunnel } = require("tunnel-ssh"); // ✅ use the correct named export

let tunnelServer = null;

export async function initSSHTunnel() {
  console.log("🔐 Creating SSH tunnel...");

  const config = {
    username: process.env.SSH_USERNAME,
    password: process.env.SSH_PASSWORD,
    host: process.env.SSH_HOST,
    port: parseInt(process.env.SSH_PORT) || 22,

    // 👇 Where Oracle actually runs inside LAN
    dstHost: "192.168.1.6",
    dstPort: 1521,

    // 👇 Local binding (what Node connects to)
    localHost: "127.0.0.1",
    localPort: 1521,

    keepAlive: true,
  };

  try {
    tunnelServer = await createTunnel({}, null, config); // ✅ correct call for v5.x
    console.log("✅ SSH tunnel established on 127.0.0.1:1521");
  } catch (error) {
    console.error("❌ SSH tunnel failed:", error.message);
    throw error;
  }
}

export async function closeSSHTunnel() {
  if (tunnelServer) {
    try {
      tunnelServer.close();
      console.log("✅ SSH tunnel closed");
      tunnelServer = null;
    } catch (err) {
      console.error("❌ Error closing SSH tunnel:", err.message);
    }
  }
}
