import { createTunnel } from "tunnel-ssh";

let tunnelObj;

const sshConfig = {
  username: process.env.SSH_USERNAME,    
  password: process.env.SSH_PASSWORD,    
  host: process.env.SSH_HOST,            // 115.244.175.130
  port: parseInt(process.env.SSH_PORT) || 22,

  // 👇 FIXED: Oracle is listening on 192.168.1.6 inside the remote network
  dstHost: "192.168.1.6",
  dstPort: 1521,

  localHost: "127.0.0.1",
  localPort: 1521,
  keepAlive: true,
};

export async function initSSHTunnel() {
  try {
    console.log(`🔐 Creating SSH tunnel to ${sshConfig.host}...`);
    tunnelObj = await createTunnel({}, null, sshConfig);
    console.log("✅ SSH tunnel established on 127.0.0.1:1521");
  } catch (err) {
    console.error("❌ SSH tunnel failed:", err.message);
    throw err;
  }
}

export async function closeSSHTunnel() {
  if (tunnelObj?.server) {
    try {
      tunnelObj.server.close();
      console.log("✅ SSH tunnel closed");
      tunnelObj = null;
    } catch (err) {
      console.error("❌ Error closing SSH tunnel:", err);
    }
  }
}
