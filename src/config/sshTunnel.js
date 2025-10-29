import { createTunnel } from "tunnel-ssh";

const sshConfig = {
  host: process.env.SSH_HOST,
  port: parseInt(process.env.SSH_PORT),
  username: process.env.SSH_USERNAME,
  password: process.env.SSH_PASSWORD,
  dstHost: "localhost",
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
    const tunnel = await createTunnel({}, null, sshConfig);
    console.log("✅ SSH tunnel established");
    return tunnel;
  } catch (err) {
    console.error("❌ SSH tunnel failed:", err.message);
    throw err;
  }
}
