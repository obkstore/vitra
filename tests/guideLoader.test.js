import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTherapeuticGuide, _resetGuideCacheForTests } from '../api/_lib/utils/guideLoader.js';

test('loadTherapeuticGuide returns text and source with stable shape', () => {
  _resetGuideCacheForTests();
  const first = loadTherapeuticGuide();

  assert.equal(typeof first.text, 'string');
  assert.equal(typeof first.source, 'string');

  // Cached: second call returns the same reference without re-reading.
  const second = loadTherapeuticGuide();
  assert.equal(second, first);
  _resetGuideCacheForTests();
});

test('loadTherapeuticGuide finds the guide despite RTL filename marks', () => {
  _resetGuideCacheForTests();
  const { text, source } = loadTherapeuticGuide();

  // Fail-open contract: never throws; when the repo file is present it must
  // resolve to a real .md path with recognizable guide content.
  assert.ok(source.endsWith('.md'), `expected an .md source, got: ${source}`);
  assert.ok(text.includes('Low-FODMAP'), 'expected guide body to mention Low-FODMAP');
  assert.ok(text.includes('السكري'), 'expected guide body to mention السكري');
  _resetGuideCacheForTests();
});
