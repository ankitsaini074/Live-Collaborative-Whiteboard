# Live Collaborative Whiteboard

Real-time collaborative whiteboard with drawing, shapes, sticky notes, and live cursors. Built with React, Canvas API, Socket.io, and Redis.

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│   Server    │────────▶│    Redis    │
│  (React)    │ WebSocket│  (Express)  │  Events  │  (ioredis)  │
│             │◀────────│             │◀────────│             │
└─────────────┘         └─────────────┘         └─────────────┘
     │                        │
     ▼                        ▼
  Canvas API              Socket.io
  (Drawing)                (Sync)
```

### Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Canvas API, Socket.io-client, Zustand
- **Backend**: Node.js, Express, Socket.io, TypeScript, ioredis
- **Infrastructure**: Redis (Docker), Docker Compose

## Features

### Week 1: Foundation
- ✅ Room creation via URL (10-character room IDs)
- ✅ Freehand drawing with smooth bezier curves
- ✅ Real-time sync across multiple users
- ✅ Drawing persistence in Redis (capped at 5000 events)
- ✅ 8-color palette with adjustable brush size (1-20px)
- ✅ Eraser tool

### Week 2: Visual Richness
- ✅ Live cursor tracking with username labels
- ✅ Shape tools: Rectangle, Circle, Line, Arrow
- ✅ Sticky notes with drag, edit, delete
- ✅ Text tool with font size adjustment
- ✅ User presence panel showing active collaborators

### Week 3: Robustness
- ✅ Undo/redo with Command pattern (Ctrl+Z / Ctrl+Y)
- ✅ Lamport clock for consistent event ordering
- ✅ Full state replay on room join
- ✅ Reconnection handling with missed event sync
- ✅ Room expiry (24h TTL on inactivity)

### Week 4: Polish
- ✅ PNG export with timestamped filename (Ctrl+S)
- ✅ Clear board with confirmation
- ✅ Zoom (wheel) and pan (middle-click drag)
- ✅ Keyboard shortcuts modal (?)
- ✅ Docker Compose deployment

## Setup

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- Git

### Local Development

1. Clone the repository
```bash
git clone <repo-url>
cd whiteboard
```

2. Start Redis only (for local dev)
```bash
docker compose up -d redis
```

3. Install dependencies
```bash
cd client && npm install
cd ../server && npm install
```

4. Start development servers (in separate terminals)
```bash
# Terminal 1: Client
cd client && npm run dev

# Terminal 2: Server
cd server && npm run dev
```

5. Access the app at http://localhost:5173

### Docker Deployment

1. Build and start all services
```bash
docker compose up --build
```

2. Access the app at http://localhost:5173

3. Stop services
```bash
docker compose down
```

## Usage

### Creating a Room
1. Click "Create Room" on the landing page
2. Copy the share link to invite others
3. Join the room by clicking the link

### Drawing Tools
- **Brush**: Freehand drawing
- **Eraser**: Clear strokes with white color
- **Rectangle/Circle/Line/Arrow**: Shape tools
- **Text**: Click to place text, type and press Enter
- **Sticky Note**: Click to add, drag to move, double-click to edit, × to delete

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+S | Export to PNG |
| Ctrl+0 | Reset zoom |
| Mouse wheel | Zoom in/out |
| Middle-click + drag | Pan canvas |
| ? | Show shortcuts |
| Escape | Close modals |

## Project Structure

```
whiteboard/
├── client/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Canvas.tsx   # Main canvas with drawing logic
│   │   │   ├── Room.tsx     # Room page with header/toolbar
│   │   │   ├── Toolbar.tsx  # Drawing tools
│   │   │   └── UserPresencePanel.tsx
│   │   ├── lib/
│   │   │   ├── canvas.ts    # Canvas drawing utilities
│   │   │   └── socket.ts    # Socket.io client
│   │   └── store/
│   │       └── canvasStore.ts  # Zustand state
│   ├── Dockerfile
│   └── package.json
├── server/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── redis.ts     # Redis operations
│   │   │   └── socket.ts    # Socket.io server
│   │   ├── routes/
│   │   │   └── rooms.ts     # Room API
│   │   └── index.ts         # Express server
│   ├── Dockerfile
│   └── package.json
├── shared/
│   └── types.ts             # Shared TypeScript types
└── docker-compose.yml
```

## API Endpoints

### POST /rooms
Creates a new room and returns the room ID.

**Response:**
```json
{ "roomId": "abc123def4" }
```

## Socket.io Events

### Client → Server
- `join-room`: Join a room with user info
- `leave-room`: Leave a room
- `draw-stroke`: Broadcast stroke data
- `draw-shape`: Broadcast shape data
- `cursor-move`: Throttled cursor position
- `add-note`/`update-note`/`move-note`/`delete-note`: Note operations
- `add-text`/`delete-text`: Text operations
- `clear-board`: Clear all content

### Server → Client
- `room-state`: Full event history on join
- `draw-stroke`/`draw-shape`: Incoming drawing data
- `cursor-move`: Remote cursor positions
- `user-joined`/`user-left`: User presence
- `missing-events`: Events missed during reconnection

## Event Ordering

All events include a Lamport clock for consistent ordering across clients. When receiving events, clients update their local clock:

```typescript
updateLamportClock(receivedClock) {
  this.clock = Math.max(this.clock, receivedClock) + 1;
}
```

This prevents race conditions when messages arrive out of order.

## License

MIT
