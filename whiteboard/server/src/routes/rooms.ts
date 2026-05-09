import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';

const router = Router();

/**
 * POST /rooms
 * Creates a new room with a unique ID.
 * Returns { roomId: string }
 */
router.post('/', (_req: Request, res: Response) => {
  const roomId = nanoid(10);
  res.json({ roomId });
});

export default router;
