import tunnel from "tunnel-ssh";

let server; // holds the active SSH tunnel instance

const sshConfig = {
  username: process.env.SSH_USERNAME,    // e.g. pipe
  password: process.env.SSH_PASSWORD,    // e.g. @dmin*$121#
  host: process.env.SSH_HOST,            // e.g. 115.244.175.130
  port: parseInt(process.env.SSH_PORT) || 22,
  dstHost: "localhost",                  // 👈 same as your working manual SSH command
  dstPort: 1521,                         // Oracle database port on the remote server
  localHost: "127.0.0.1",                // local side of the tunnel
  localPort: 1521,                       // local port to connect Oracle through
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

    // tunnel-ssh returns a net.Server, not a Promise — wrap it manually
    server = await new Promise((resolve, reject) => {
      const srv = tunnel(sshConfig, (error) => {
        if (error) reject(error);
        else resolve(srv);
      });
    });

    console.log("✅ SSH tunnel established on 127.0.0.1:1521");
  } catch (err) {
    console.error("❌ SSH tunnel failed:", err.message);
    throw err;
  }
}

export async function closeSSHTunnel() {
  if (server) {
    try {
      server.close();
      console.log("✅ SSH tunnel closed");
      server = null;
    } catch (err) {
      console.error("❌ Error closing SSH tunnel:", err);
    }
  }
}
