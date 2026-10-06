import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import jobsRoutes from './routes/jobs';
import adminRoutes from './routes/admin';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\nNotice: Port ${PORT} is ALREADY running and active in the background!`);
    console.log(`You do not need to restart it—your backend is already online and listening.`);
  } else {
    console.error(`Server error:`, err);
  }
});
