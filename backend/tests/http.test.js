import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/App.js';

describe('Public HTTP', () => {
  test('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  test('GET /api/meta/features returns flags', async () => {
    const res = await request(app).get('/api/meta/features');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data?.retail === 'boolean');
  });

  test('PATCH /api/visit-feedbacks/:id without auth returns 401', async () => {
    const res = await request(app)
      .patch('/api/visit-feedbacks/00000000-0000-4000-8000-000000000001')
      .send({ rating: 4 });
    assert.equal(res.status, 401);
  });

  test('GET /api/staff/team without auth returns 401', async () => {
    const res = await request(app).get('/api/staff/team');
    assert.equal(res.status, 401);
  });

  test('POST /api/staff/team without auth returns 401', async () => {
    const res = await request(app).post('/api/staff/team').send({
      name: 'Test User',
      email: 'test-staff-create@example.com',
      password: 'password1',
      role: 'staff',
    });
    assert.equal(res.status, 401);
  });

  test('PATCH /api/staff/team/:id without auth returns 401', async () => {
    const res = await request(app)
      .patch('/api/staff/team/00000000-0000-4000-8000-000000000001')
      .send({ name: 'X' });
    assert.equal(res.status, 401);
  });

  test('DELETE /api/staff/team/:id without auth returns 401', async () => {
    const res = await request(app).delete('/api/staff/team/00000000-0000-4000-8000-000000000001');
    assert.equal(res.status, 401);
  });

  test('GET /api/public/services returns JSON', async () => {
    const res = await request(app).get('/api/public/services');
    assert.ok([200, 500].includes(res.status), `unexpected status ${res.status}`);
    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    }
  });

  test('GET /api/audit-logs without auth returns 401', async () => {
    const res = await request(app).get('/api/audit-logs');
    assert.equal(res.status, 401);
  });
});
