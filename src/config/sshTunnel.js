import { Client } from 'ssh2';
import net from 'net';
import dotenv from 'dotenv';

dotenv.config();

let sshClient = null;
let tunnelServer = null;
const LOCAL_PORT = 1521;
const REMOTE_PORT = 1521;

export async function initSSHTunnel() {
  return new Promise((resolve, reject) => {
    console.log("🔐 Creating SSH tunnel to", process.env.SSH_HOST);
    console.log("🔐 Forwarding: localhost:" + LOCAL_PORT + " → " + process.env.SSH_HOST + ":" + REMOTE_PORT);

    sshClient = new Client();
    
    sshClient.on('ready', () => {
      console.log('✅ SSH Client ready');
      
      // Create a local server that forwards to remote Oracle
      tunnelServer = net.createServer((localSocket) => {
        console.log('🔗 Local connection received for Oracle');
        
        sshClient.forwardOut(
          'localhost',    // Source host (on remote server)
          REMOTE_PORT,    // Source port (on remote server)  
          'localhost',    // Destination host (Oracle on remote server)
          REMOTE_PORT,    // Destination port (Oracle on remote server)
          (err, remoteStream) => {
            if (err) {
              console.error('❌ SSH forwardOut error:', err.message);
              localSocket.destroy();
              return;
            }
            
            console.log('✅ SSH forward established to Oracle');
            
            // Pipe data between local socket and remote stream
            localSocket.pipe(remoteStream);
            remoteStream.pipe(localSocket);
            
            // Handle errors
            localSocket.on('error', (err) => {
              console.log('🔌 Local socket error:', err.message);
              remoteStream.destroy();
            });
            
            remoteStream.on('error', (err) => {
              console.log('🌐 Remote stream error:', err.message);
              localSocket.destroy();
            });
            
            localSocket.on('close', () => {
              console.log('🔌 Local socket closed');
            });
            
            remoteStream.on('close', () => {
              console.log('🌐 Remote stream closed');
            });
          }
        );
      });

      // Start listening on local port
      tunnelServer.listen(LOCAL_PORT, '127.0.0.1', (err) => {
        if (err) {
          console.error('❌ Tunnel server error:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ SSH tunnel established: 127.0.0.1:${LOCAL_PORT} → localhost:${REMOTE_PORT}`);
        resolve({ sshClient, tunnelServer });
      });

      tunnelServer.on('error', (err) => {
        console.error('❌ Tunnel server error:', err.message);
        reject(err);
      });
      
      tunnelServer.on('connection', (socket) => {
        console.log('🔗 New connection to tunnel server');
      });
    });

    sshClient.on('error', (err) => {
      console.error('❌ SSH connection error:', err.message);
      reject(err);
    });
    
    sshClient.on('end', () => {
      console.log('🔌 SSH connection ended');
    });
    
    sshClient.on('close', () => {
      console.log('🔌 SSH connection closed');
    });

    // SSH connection configuration
    const sshConfig = {
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT) || 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
      readyTimeout: 30000,
      keepaliveInterval: 10000,
    };

    console.log(`🔐 Connecting to SSH with user: ${sshConfig.username}`);
    sshClient.connect(sshConfig);
  });
}

export async function closeSSHTunnel() {
  return new Promise((resolve) => {
    console.log('🛑 Closing SSH tunnel...');
    
    const cleanup = () => {
      sshClient = null;
      tunnelServer = null;
      console.log('✅ SSH tunnel fully closed');
      resolve();
    };

    if (tunnelServer) {
      tunnelServer.close((err) => {
        if (err) console.error('Error closing tunnel server:', err.message);
        if (sshClient) {
          sshClient.end();
        }
        setTimeout(cleanup, 1000);
      });
    } else if (sshClient) {
      sshClient.end();
      setTimeout(cleanup, 1000);
    } else {
      cleanup();
    }
  });
}