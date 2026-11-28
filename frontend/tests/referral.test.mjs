import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRefCode, refLink } from '../src/lib/referral.js';

test('referal kodi: faqat 8 ta harf/raqam qabul qilinadi', () => {
  assert.equal(parseRefCode('?ref=ab3k9xqz'), 'AB3K9XQZ');
  assert.equal(parseRefCode('?x=1&ref=AB3K-9XQZ'), 'AB3K9XQZ');
  assert.equal(parseRefCode('?ref=short'), '');
  assert.equal(parseRefCode('?ref=<script>alert(1)</script>'), '');
  assert.equal(parseRefCode('?ref=AB3K9XQZAB3K9XQZ'), '');
  assert.equal(parseRefCode(''), '');
  assert.equal(parseRefCode(undefined), '');
});

test('referal havolasi: ?ref=KOD', () => {
  assert.equal(refLink('https://mizan.example/', 'AB3K9XQZ'), 'https://mizan.example/?ref=AB3K9XQZ');
});
