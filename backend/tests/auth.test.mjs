import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { authService } from '../src/services/auth.js';
import { signSession, verifyToken, hashToken } from '../src/services/tokens.js';
import { parseAuth, registerSchema } from '../src/validators/auth.js';
const config = { accessSecret: 'a'.repeat(48), refreshSecret: 'b'.repeat(48) };
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Юра',
  email: 'test@example.com',
  phone: null,
  role: 'CUSTOMER',
};
test('registration validates input and rejects role injection', () => {
  assert.equal(
    parseAuth(registerSchema, {
      name: 'Юра',
      email: ' TEST@example.com ',
      password: 'Password123',
    }).email,
    'test@example.com'
  );
  assert.throws(
    () =>
      parseAuth(registerSchema, {
        name: 'Юра',
        email: user.email,
        password: 'Password123',
        role: 'ADMIN',
      }),
    { status: 400 }
  );
  assert.throws(
    () =>
      parseAuth(registerSchema, {
        name: 'Юра',
        email: user.email,
        password: 'я'.repeat(40),
      }),
    { status: 400 }
  );
});
test('access and refresh tokens are not interchangeable; wrong secrets fail', () => {
  const session = signSession(user, config);
  assert.equal(verifyToken(session.access, 'access', config).sub, user.id);
  assert.equal(verifyToken(session.refresh, 'refresh', config).jti, session.id);
  assert.throws(() => verifyToken(session.refresh, 'access', config), {
    status: 401,
  });
  assert.throws(() => verifyToken(session.access, 'refresh', config), {
    status: 401,
  });
  assert.throws(
    () =>
      verifyToken(session.access, 'access', {
        ...config,
        accessSecret: 'wrong',
      }),
    { status: 401 }
  );
  assert.notEqual(hashToken(session.refresh), session.refresh);
});
test('registration hashes password, stores refresh digest, and omits password from response', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, args) {
      calls.push({ sql, args });
      return { rows: sql.startsWith('INSERT INTO users') ? [user] : [] };
    },
    release() {
      released = true;
    },
  };
  const service = authService({ connect: async () => client }, config);
  const result = await service.register({
    name: user.name,
    email: user.email,
    password: 'Password123',
  });
  const inserted = calls.find(c => c.sql.startsWith('INSERT INTO users'));
  assert.notEqual(inserted.args[3], 'Password123');
  assert.ok(await bcrypt.compare('Password123', inserted.args[3]));
  assert.equal(result.user.password, undefined);
  assert.equal(result.user.role, 'CUSTOMER');
  assert.equal(
    calls.find(c => c.sql.startsWith('INSERT INTO refresh_tokens')).args[2],
    hashToken(result.session.refresh)
  );
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.ok(released);
});
test('refresh rotates a token transactionally and refuses a revoked token', async () => {
  const first = signSession(user, config);
  let revoked = false;
  let calls = [];
  const client = {
    async query(sql, args) {
      calls.push({ sql, args });
      if (sql.startsWith('SELECT t.id'))
        return {
          rows: [
            {
              ...user,
              id: first.id,
              user_id: user.id,
              expires_at: first.expiresAt,
              revoked_at: revoked ? new Date() : null,
            },
          ],
        };
      return { rows: [] };
    },
    release() {},
  };
  const service = authService({ connect: async () => client }, config);
  const result = await service.refresh(first.refresh);
  assert.notEqual(result.session.refresh, first.refresh);
  assert.ok(calls.some(c => c.sql.includes('FOR UPDATE OF t')));
  assert.ok(calls.some(c => c.sql.startsWith('UPDATE refresh_tokens')));
  assert.equal(calls.at(-1).sql, 'COMMIT');
  revoked = true;
  calls = [];
  await assert.rejects(() => service.refresh(first.refresh), { status: 401 });
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!calls.some(c => c.sql.startsWith('INSERT')));
});
