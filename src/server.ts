import express from 'express';
import indexRouter from './routes/index';
import healthRouter from './routes/health';
import versionRouter from './routes/version';
import readyRouter from './routes/ready';

const app = express();

app.use('/', indexRouter);
app.use('/', healthRouter);
app.use('/', versionRouter);
app.use('/', readyRouter);

const PORT = process.env.PORT || 3000;

// Only listen when run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

/** Factory function for test isolation — returns fresh app instance */
export function getServerApp(): express.Express {
  return app;
}
