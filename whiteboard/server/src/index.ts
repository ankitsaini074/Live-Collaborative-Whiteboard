import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import roomsRouter from './routes/rooms';
import { setupSocketHandlers } from './lib/socket';
import { closeRedis } from './lib/redis';

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rooms', roomsRouter);

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
