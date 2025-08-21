#!/usr/bin/env node

// Temporary startup script to bypass vite import issues
const { spawn } = require('child_process');

console.log('Starting Zaldo CRM server...');

const server = spawn('tsx', ['server/index-simple.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.kill('SIGINT');
});