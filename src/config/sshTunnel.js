import { createTunnel } from "tunnel-ssh";

let tunnelServer; // holds the SSH tunnel instance

const sshConfig = {
  username: process.env.SSH_USERNAME,    // e.g. "pipe"
  password: process.env.SSH_PASSWORD,    // e.g. "@dmin*$121#"
  host: process.env.SSH_HOST,            // e.g. "115.244.175.130"
  port: parseInt(process.env.SSH_PORT) || 22,
  dstHost: "localhost",                  // same as your manual ssh -L command
  dstPort: 1521,                         // Oracle DB port
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

    // ✅ correct API for tunnel-ssh@5.x
    tunnelServer = await createTunnel({}, null, sshConfig);

    console.log("✅ SSH tunnel established on 127.0.0.1:1521");
  } catch (err) {
    console.error("❌ SSH tunnel failed:", err.message);
    throw err;
  }
}

export async function closeSSHTunnel() {
  if (tunnelServer) {
    try {
      tunnelServer.close();
      console.log("✅ SSH tunnel closed");
      tunnelServer = null;
    } catch (err) {
      console.error("❌ Error closing SSH tunnel:", err);
    }
  }
}
