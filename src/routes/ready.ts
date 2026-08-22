import { Router, Request, Response } from 'express';
import { ReadyResponse } from '../types/response';

const router = Router();

router.get('/ready', (_req: Request, res: Response) => {
  const response: ReadyResponse = {
    status: 'ready',
    uptime_seconds: Math.round(process.uptime())
  };
  res.json(response);
});

export default router;
