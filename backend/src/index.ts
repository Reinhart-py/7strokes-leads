import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import jobsRoutes from './routes/jobs';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>7strokes — Nice Try 😉</title>
  <link rel="icon" href="https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090C;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 40px 28px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 30px 60px rgba(0,0,0,0.6);
      backdrop-filter: blur(20px);
    }
    img {
      max-width: 320px;
      width: 100%;
      border-radius: 20px;
      margin-bottom: 24px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      color: #22C55E;
    }
    p {
      color: #A1A1AA;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-block;
      margin-top: 18px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(34, 197, 94, 0.15);
      color: #4ADE80;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://ik.imagekit.io/Reinhart/nox/lolOnYou.jfif" alt="Lol On You">
    <h1>Boi, you think you're the only smart one? 😂</h1>
    <p>Think I didn't know you would try to inspect and reverse engineer this?</p>
    <p style="color: #F43F5E; font-weight: 600;">Lol on you, that's hilarious. Keep trying though! 😉</p>
    <div class="badge">7strokes Protected</div>
  </div>
</body>
</html>`);
});

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
