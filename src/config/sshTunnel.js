import { Client } from 'ssh2';
import dotenv from 'dotenv';

dotenv.config();

let sshClient = null;
let tunnel = null;

export async function initSSHTunnel() {
  return new Promise((resolve, reject) => {
    console.log("🔐 Creating SSH tunnel to", process.env.SSH_HOST);

    sshClient = new Client();
    
    sshClient.on('ready', () => {
      console.log('✅ SSH Client ready');
      
      // Forward local port to remote Oracle database
      sshClient.forwardOut(
        '127.0.0.1',
        1521,
        process.env.ORACLE_HOST || '127.0.0.1',
        parseInt(process.env.ORACLE_PORT) || 1521,
        (err, stream) => {
          if (err) {
            console.error('❌ SSH forward error:', err);
            reject(err);
            return;
          }
          console.log('✅ SSH tunnel established');
          resolve(sshClient);
        }
      );
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
      readyTimeout: 20000,
      algorithms: {
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group14-sha256'
        ],
        cipher: [
          'aes128-gcm',
          'aes256-gcm',
          'aes128-cbc',
          'aes256-cbc'
        ]
      }
    };

    // Add authentication method (private key or password)
    if (process.env.SSH_PRIVATE_KEY) {
      sshConfig.privateKey = process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n');
    } else if (process.env.SSH_PASSWORD) {
      sshConfig.password = process.env.SSH_PASSWORD;
    } else {
      reject(new Error('No SSH authentication method provided'));
      return;
    }

    sshClient.connect(sshConfig);
  });
}

export async function closeSSHTunnel() {
  return new Promise((resolve) => {
    if (sshClient) {
      sshClient.on('close', () => {
        console.log('✅ SSH tunnel closed');
        sshClient = null;
        resolve();
      });
      sshClient.end();
    } else {
      resolve();
    }
  });
}