import request from 'supertest';
import { getServerApp } from '../src/server';

describe('Version API', () => {
  describe('GET /version (integration)', () => {
    test('should return 200 with version field and application/json content type', async () => {
      const app = getServerApp();
      const res = await request(app).get('/version');

      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/);
      expect(res.body.version).toBeDefined();
      expect(typeof res.body.version).toBe('string');
    });

    test('should return version matching package.json', async () => {
      const app = getServerApp();
      const res = await request(app).get('/version');
      const pkg = require('../package.json');

      expect(res.body.version).toBe(pkg.version);
    });
  });
});
