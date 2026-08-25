const test = require('node:test');
const assert = require('node:assert/strict');
const { isFictitiousDomain, sendOtpEmail, sendEventTicketEmail } = require('../services/emailService');

test('Email Service - Fictitious Domain Detection', () => {
  assert.equal(isFictitiousDomain('student@edux.com'), true);
  assert.equal(isFictitiousDomain('admin@edux.local'), true);
  assert.equal(isFictitiousDomain('user@example.com'), true);
  assert.equal(isFictitiousDomain('test@test.com'), true);
  assert.equal(isFictitiousDomain('sample@sample.com'), true);
  assert.equal(isFictitiousDomain('realuser@gmail.com'), false);
  assert.equal(isFictitiousDomain('faculty@university.edu.in'), false);
});

test('Email Service - Test Environment Bypasses Real SMTP', async () => {
  process.env.NODE_ENV = 'test';
  const res = await sendOtpEmail('student@edux.com', '123456', 'Test Student');
  assert.equal(res.success, true);
  assert.equal(res.bypassed, true);
});

test('Email Service - Fictitious Domain Bypasses SMTP even in Production', async () => {
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  process.env.MAIL_SEND_ENABLED = 'true';

  const res = await sendEventTicketEmail('student@edux.com', 'Student', { title: 'Test Event' }, 'TKT-123', null, 0);
  assert.equal(res.success, true);
  assert.equal(res.bypassed, true);
  assert.equal(res.reason, 'fictitious_domain');

  process.env.NODE_ENV = oldEnv;
});
