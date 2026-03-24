import express from 'express';
import cors from 'cors';
import repoRoutes from './routes/repoRoutes.js';

const app = express();

// Middleware
const allowedOriginPattern = /^https:\/\/.*\.vercel\.app$|^http:\/\/localhost:\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    console.log(`CORS check for origin: ${origin}`);
    // Allow no-origin requests (curl, Postman) and any *.vercel.app or localhost
    if (!origin || allowedOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes
app.use('/api', repoRoutes);

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

export default app;
