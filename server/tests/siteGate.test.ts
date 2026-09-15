import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app';
import { SITE_GATE_COOKIE, SITE_GATE_ERROR } from '../src/lib/siteGate';

const app = createApp();

describe('site gate', () => {
  before(() => {
    process.env.SITE_ACCESS_PASSWORD = 'site-lock-password';
    process.env.SITE_GATE_ENABLED = 'true';
  });

  after(() => {
    delete process.env.SITE_ACCESS_PASSWORD;
    delete process.env.SITE_GATE_ENABLED;
  });

  it('keeps health and gate status public while locking other APIs', async () => {
    const health = await request(app).get('/api/health').expect(200);
    assert.equal(health.body.status, 'ok');

    const status = await request(app).get('/api/gate').expect(200);
    assert.deepEqual(status.body, { required: true, unlocked: false });

    const blocked = await request(app).get('/api/auth/me').expect(403);
    assert.equal(blocked.body.errorCode, SITE_GATE_ERROR);
  });

  it('rejects the wrong password and unlocks with the correct one', async () => {
    const agent = request.agent(app);

    const wrong = await agent.post('/api/gate').send({ password: 'nope' }).expect(403);
    assert.equal(wrong.body.message, 'Incorrect site password');

    const unlocked = await agent.post('/api/gate').send({ password: 'site-lock-password' }).expect(200);
    assert.deepEqual(unlocked.body, { required: true, unlocked: true });
    assert.match(String(unlocked.headers['set-cookie']), new RegExp(SITE_GATE_COOKIE));

    const status = await agent.get('/api/gate').expect(200);
    assert.deepEqual(status.body, { required: true, unlocked: true });

    const me = await agent.get('/api/auth/me').expect(401);
    assert.equal(me.body.message, 'Authentication required');
  });
});
