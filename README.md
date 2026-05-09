# Live Collaborative Whiteboard

Real-time collaborative whiteboard with drawing, shapes, notes, and text.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Socket.io Client, Zustand
- **Backend**: Express, Socket.io, Redis
- **Deployment**: Render

## Local Development

```bash
# Install dependencies
cd whiteboard/server && npm install
cd ../client && npm install

# Start server (port 3001)
cd whiteboard/server && npm run dev

# Start client (port 5000)
cd whiteboard/client && npm run dev
```

## Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Blueprint"
4. Connect your GitHub repo
5. Render will auto-detect `render.yaml` and create:
   - `whiteboard-backend` - Express + Socket.io server
   - `whiteboard-frontend` - Static React build
   - `whiteboard-redis` - Redis for state management

**Free Tier Limitations:**
- Redis: 256MB, sleeps after 15min inactivity
- Frontend: Spins down after 15min inactivity
- Backend: Free tier may sleep

## Environment Variables

Render auto-configures these via `render.yaml`:
- `VITE_SOCKET_URL` - Backend URL (auto-set from backend service)
- `FRONTEND_URL` - Frontend URL (auto-set from frontend service)
- `REDIS_URL` - Redis connection (auto-set from Redis service)
- `PORT` - Server port (set to 10000 for Render)

## Manual Deployment (if Blueprint fails)

### Backend
- Type: Web Service
- Root Directory: `whiteboard/server`
- Build: `npm install && npm run build`
- Start: `npm start`
- Add env: `REDIS_URL`, `FRONTEND_URL`, `PORT=10000`

### Frontend
- Type: Static Site
- Root Directory: `whiteboard/client`
- Build: `npm install && npm run build`
- Publish: `dist`
- Add env: `VITE_SOCKET_URL=<backend-url>`

### Redis
- Type: Redis
- Name: `whiteboard-redis`
- Plan: Free (256MB)

## License

MIT
