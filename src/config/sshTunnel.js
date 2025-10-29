import { createTunnel } from "tunnel-ssh";

let tunnel = null; // 👈 shared variable accessible to both functions

const sshConfig = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT) || 22,
  username: process.env.SSH_USERNAME,
  password: process.env.SSH_PASSWORD,
  dstHost: "AI",
  dstPort: 1521,
  localHost: "127.0.0.1",
  localPort: 1521,
  keepAlive: true,
};

export async function initSSHTunnel() {
  console.log("SSH Config (sanitized):", {
    host: sshConfig.host,
    port: sshConfig.port,
    username: sshConfig.username,
    passwordLength: sshConfig.password?.length,
  });

  try {
    console.log(`🔐 Creating SSH tunnel to ${sshConfig.host}...`);

    // 👇 assign to the shared variable, not a new local one
    tunnel = await createTunnel({}, null, sshConfig);

    console.log("✅ SSH tunnel established");
    return tunnel;
  } catch (err) {
    console.error("❌ SSH tunnel failed:", err.message);
    throw err;
  }
}

export async function closeSSHTunnel() {
  if (tunnel) {
    try {
      tunnel.close();
      console.log("✅ SSH tunnel closed");
      tunnel = null;
    } catch (err) {
      console.error("❌ Error closing SSH tunnel:", err);
    }
  } else {
    console.log("ℹ️ No SSH tunnel to close");
  }
}
