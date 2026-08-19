import request from 'supertest';
import { getServerApp } from '../src/server';
import { ReadyResponse } from '../src/types/response';

describe('Readiness API', () => {
  describe('ReadyResponse type contract', () => {
    test('should have status as string property', () => {
      const sample: ReadyResponse = {
        status: 'ready',
        uptime_seconds: 1.5,
        memory_mb: 50.25
      };
      expect(typeof sample.status).toBe('string');
    });

    test('should have uptime_seconds and memory_mb as number properties', () => {
      const sample: ReadyResponse = {
        status: 'ready',
        uptime_seconds: 1.5,
        memory_mb: 50.25
      };
      expect(typeof sample.uptime_seconds).toBe('number');
      expect(typeof sample.memory_mb).toBe('number');
    });
  });

  describe('GET /ready (integration)', () => {
    test('should return status 200 with ready body and application/json content type', async () => {
      const app = getServerApp();
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/);
      expect(res.body.status).toBe('ready');
    });

    test('should include non-negative numeric uptime_seconds', async () => {
      const app = getServerApp();
      const res = await request(app).get('/ready');

      expect(typeof res.body.uptime_seconds).toBe('number');
      expect(res.body.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    test('should include non-negative numeric memory_mb', async () => {
      const app = getServerApp();
      const res = await request(app).get('/ready');

      expect(typeof res.body.memory_mb).toBe('number');
      expect(res.body.memory_mb).toBeGreaterThanOrEqual(0);
    });
  });
});