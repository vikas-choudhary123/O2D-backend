import tunnel from "tunnel-ssh";

let tunnelServer = null; // store the tunnel globally so we can close it later

export async function initSSHTunnel() {
  console.log("🔐 Creating SSH tunnel...");

  return new Promise((resolve, reject) => {
    const config = {
      username: process.env.SSH_USERNAME,
      password: process.env.SSH_PASSWORD,
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT) || 22,

      // 👇 These two tell the tunnel where to connect INSIDE your LAN
      dstHost: "192.168.1.6", // Oracle DB server inside the LAN
      dstPort: 1521,          // Oracle DB port

      // 👇 These control the local endpoint your app will connect to
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
