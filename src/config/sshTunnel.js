import { Client } from 'ssh2';
import net from 'net';
import dotenv from 'dotenv';

dotenv.config();

let sshClient = null;
let tunnelServer = null;
const LOCAL_PORT = 1521;

export async function initSSHTunnel() {
  return new Promise((resolve, reject) => {
    console.log("🔐 Creating SSH tunnel to", process.env.SSH_HOST);

    sshClient = new Client();
    
    sshClient.on('ready', () => {
      console.log('✅ SSH Client ready');
      
      // Create a local TCP server that forwards to remote Oracle
      tunnelServer = net.createServer((localSocket) => {
        console.log('🔗 Local connection received');
        
        sshClient.forwardOut(
          '127.0.0.1',
          LOCAL_PORT,
          process.env.ORACLE_HOST || '115.244.175.130', // The actual Oracle server behind SSH
          1521,
          (err, remoteStream) => {
            if (err) {
              console.error('❌ SSH forward error:', err);
              localSocket.destroy();
              return;
            }
            
            console.log('✅ SSH forward established');
            localSocket.pipe(remoteStream).pipe(localSocket);
            
            localSocket.on('error', (err) => {
              console.log('Local socket error:', err);
            });
            
            remoteStream.on('error', (err) => {
              console.log('Remote stream error:', err);
            });
          }
        );
      });

      tunnelServer.listen(LOCAL_PORT, '127.0.0.1', (err) => {
        if (err) {
          console.error('❌ Tunnel server error:', err);
          reject(err);
          return;
        }
        
        console.log(`✅ SSH tunnel established on 127.0.0.1:${LOCAL_PORT}`);
        resolve({ sshClient, tunnelServer });
      });

      tunnelServer.on('error', (err) => {
        console.error('❌ Tunnel server error:', err);
        reject(err);
      });
    });

    sshClient.on('error', (err) => {
      console.error('❌ SSH connection error:', err);
      reject(err);
    });

    // SSH connection configuration
    const sshConfig = {
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT) || 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      readyTimeout: 30000,
      keepaliveInterval: 10000
    };

    console.log(`🔐 Connecting to SSH with user: ${sshConfig.username}`);
    sshClient.connect(sshConfig);
  });
}

export async function closeSSHTunnel() {
  return new Promise((resolve) => {
    const cleanup = () => {
      console.log('✅ SSH tunnel closed');
      sshClient = null;
      tunnelServer = null;
      resolve();
    };

    if (tunnelServer) {
      tunnelServer.close((err) => {
        if (err) console.error('Error closing tunnel server:', err);
        if (sshClient) {
          sshClient.end();
          setTimeout(cleanup, 1000);
        } else {
          cleanup();
        }
      });
    } else if (sshClient) {
      sshClient.end();
      setTimeout(cleanup, 1000);
    } else {
      cleanup();
    }
  });
}