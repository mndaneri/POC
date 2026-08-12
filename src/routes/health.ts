import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types/response';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

export default router;