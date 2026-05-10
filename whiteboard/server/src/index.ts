import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import roomsRouter from './routes/rooms.js';
import { setupSocketHandlers } from './lib/socket.js';
import { closeRedis } from './lib/redis.js';

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health/info routes
app.get('/', (_req, res) => {
  res.status(200).json({ ok: true, service: 'whiteboard-backend' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Routes
app.use('/api/rooms', roomsRouter);

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5000', 'http://192.168.1.4:5000'];

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Setup Socket.io handlers
setupSocketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closeRedis();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await closeRedis();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
