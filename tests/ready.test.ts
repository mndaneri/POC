import request from 'supertest';
import { getServerApp } from '../src/server';

describe('Ready API', () => {
  test('GET /ready should return 200 with ready status and metrics', async () => {
    const app = getServerApp();
    const res = await request(app).get('/ready');

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/json/);
    expect(res.body.status).toBe('ready');
    expect(typeof res.body.uptime_seconds).toBe('number');
  });
});
