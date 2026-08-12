import request from 'supertest';
import { getServerApp } from '../src/server';
import { HealthResponse } from '../src/types/response';

describe('HealthCheck API', () => {
  describe('HealthResponse type contract', () => {
    test('should have status as string property', () => {
      const sample: HealthResponse = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      expect(typeof sample.status).toBe('string');
    });

    test('should have timestamp as string property', () => {
      const sample: HealthResponse = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      expect(typeof sample.timestamp).toBe('string');
    });
  });

  describe('GET /health (integration)', () => {
    test('should return status 200 with ok body and application/json content type', async () => {
      const app = getServerApp();
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    test('should include valid ISO 8601 timestamp', async () => {
      const app = getServerApp();
      const res = await request(app).get('/health');

      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
      expect(res.body.timestamp).toMatch(iso8601Regex);
    });

    test('should reflect current time within 5 seconds tolerance', async () => {
      const app = getServerApp();
      const before = Date.now();
      const res = await request(app).get('/health');
      const after = Date.now();

      const responseTime = new Date(res.body.timestamp).getTime();
      expect(responseTime).toBeGreaterThanOrEqual(before - 1000);
      expect(responseTime).toBeLessThanOrEqual(after + 1000);
    });
  });
});