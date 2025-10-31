// ✅ Works in ESM (type: "module")
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const tunnel = require("tunnel-ssh");

let tunnelServer = null;

export async function initSSHTunnel() {
  console.log("🔐 Creating SSH tunnel...");

  return new Promise((resolve, reject) => {
    const config = {
      username: process.env.SSH_USERNAME,
      password: process.env.SSH_PASSWORD,
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT) || 22,

      // 👇 Destination: where Oracle DB actually runs (inside LAN)
      dstHost: "192.168.1.6",
      dstPort: 1521,

      // 👇 Local binding: what your Node app connects to
      localHost: "127.0.0.1",
      localPort: 1521,

      keepAlive: true,
    };

    tunnel(config, (error, server) => {
      if (error) {
        console.error("❌ SSH tunnel failed:", error.message);
        reject(error);
      } else {
        tunnelServer = server;
        console.log("✅ SSH tunnel established on 127.0.0.1:1521");
        resolve(server);
      }
    });
  });
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
