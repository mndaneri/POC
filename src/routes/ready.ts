import { Router, Request, Response } from 'express';
import { ReadyResponse } from '../types/response';

const router = Router();

router.get('/ready', (_req: Request, res: Response) => {
  const response: ReadyResponse = {
    status: 'ready',
    uptime_seconds: Math.round(process.uptime() * 1000) / 1000,
    memory_mb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100
  };
  res.json(response);
});

export default router;