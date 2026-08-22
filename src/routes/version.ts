import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { VersionResponse } from '../types/response';

const router = Router();

// Resolve the version ONCE at module load (avoids a blocking readFileSync per request).
const pkgPath = path.resolve(__dirname, '../../package.json');
const version = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version as string;

router.get('/version', (_req: Request, res: Response) => {
  const response: VersionResponse = { version };
  res.json(response);
});

export default router;