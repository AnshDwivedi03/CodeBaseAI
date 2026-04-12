import app from './app.js';
import dotenv from 'dotenv';
import cron from 'node-cron';
import https from 'https';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 RepoInsight Server running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ ERROR: Port ${PORT} is already in use. Please stop the other process and try again.`);
  } else {
    console.error('❌ SERVER ERROR:', error);
  }
});

// --- Keep-Alive Cron Job ---
// Render free tier spins down after 15 minutes of inactivity.
// This cron job pings the health endpoint every 14 minutes.
const SERVER_URL = process.env.SERVER_URL || 'https://codebaseai-n7wh.onrender.com/health';

cron.schedule('*/14 * * * *', () => {
  console.log(`⏰ Running keep-alive cron job to ${SERVER_URL}...`);
  https.get(SERVER_URL, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Keep-alive ping successful');
    } else {
      console.log(`⚠️ Keep-alive ping failed with status code: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error('❌ Keep-alive ping error:', err.message);
  });
});
