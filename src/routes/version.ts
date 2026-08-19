import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/api/version', (_req: Request, res: Response) => {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  res.json({ version: pkg.version });
});

export default router;