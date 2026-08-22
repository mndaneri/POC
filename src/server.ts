import express from 'express';
import indexRouter from './routes/index';
import healthRouter from './routes/health';
import versionRouter from './routes/version';
import readyRouter from './routes/ready';
import { ErrorResponse } from './types/response';

/** Minimal security headers without adding a dependency (helmet is not in deps). */
function securityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Builds a fresh Express app with shared middleware and all routes. */
function createApp(): express.Express {
  const app = express();
  app.use(securityHeaders);
  app.use('/', indexRouter);
  app.use('/', healthRouter);
  app.use('/', versionRouter);
  app.use('/', readyRouter);

  // JSON error contract (Express 5 forwards sync + async errors to this handler).
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = (err && (err as { status?: number }).status) || 500;
    const body: ErrorResponse = { error: 'Internal Server Error', message: err.message || 'Unexpected error' };
    res.status(status).json(body);
  });

  return app;
}

const app = createApp();

const PORT = process.env.PORT || 3000;

// Only listen when run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

/** Factory function for test isolation — returns a FRESH app instance. */
export function getServerApp(): express.Express {
  return createApp();
}
