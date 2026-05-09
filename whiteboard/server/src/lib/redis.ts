import Redis from 'ioredis';

// In-memory fallback for when Redis is not available
const memoryStore = new Map<string, unknown[]>();

// Redis connection singleton
let redis: Redis | null = null;
let useFallback = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const getRedis = (): Redis => {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => {
        // Stop retrying, fallback to memory
        useFallback = true;
        return null;
      },
    });
    redis.on('error', () => {
      useFallback = true;
    });
  }
  return redis;
};

/**
 * Store draw event in Redis list, capped at 5000 events.
 * Falls back to in-memory Map if Redis unavailable.
 */
export const storeDrawEvent = async (
  roomId: string,
  event: unknown
): Promise<void> => {
  if (useFallback) {
    const key = `room:${roomId}:events`;
    const events = memoryStore.get(key) || [];
    events.push(event);
    // Cap at 5000 events
    if (events.length > 5000) {
      events.splice(0, events.length - 5000);
    }
    memoryStore.set(key, events);
    return;
  }

  const r = getRedis();
  const key = `room:${roomId}:events`;

  try {
    await r.rpush(key, JSON.stringify(event));
    await r.ltrim(key, -5000, -1); // Keep last 5000 events
    await r.expire(key, 86400); // 24 hour TTL
  } catch {
    useFallback = true;
    // Retry with fallback
    await storeDrawEvent(roomId, event);
  }
};

/**
 * Get all draw events for a room.
 * Falls back to in-memory Map if Redis unavailable.
 */
export const getRoomEvents = async (
  roomId: string
): Promise<unknown[]> => {
  if (useFallback) {
    const key = `room:${roomId}:events`;
    return memoryStore.get(key) || [];
  }

  const r = getRedis();
  const key = `room:${roomId}:events`;

  try {
    const raw = await r.lrange(key, 0, -1);
    return raw.map((e) => JSON.parse(e));
  } catch {
    useFallback = true;
    return [];
  }
};

/**
 * Check if room has any events (exists check).
 * Falls back to in-memory Map if Redis unavailable.
 */
export const roomExists = async (roomId: string): Promise<boolean> => {
  if (useFallback) {
    const key = `room:${roomId}:events`;
    const events = memoryStore.get(key);
    return (events?.length ?? 0) > 0;
  }

  const r = getRedis();
  const key = `room:${roomId}:events`;

  try {
    const len = await r.llen(key);
    return len > 0;
  } catch {
    useFallback = true;
    return false;
  }
};

/**
 * Close Redis connection (for graceful shutdown).
 */
export const closeRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
  memoryStore.clear();
};
