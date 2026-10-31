import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'cotsu-results-'));
try {
  let sent;
  let fetchCount = 0;
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.unsafeWindow = { fetch: async (_url, options) => {
    fetchCount++;
    sent = options?.body;
    return new Response(JSON.stringify({ questions: [{ qid: 'new', writing: '一', reading: 'いち' }] }));
  } };
  const outfile = join(directory, 'results.mjs');
  await build({ entryPoints: ['src/lib/interceptedFetch.ts'], bundle: true, format: 'esm', outfile });
  const results = await import(pathToFileURL(outfile));
  results.startInterceptingFetch();
  await test('handwriting errors override reading successes in one progress request', async () => {
    results.writingWrongQids.add('writing');
    const before = fetchCount;
    await unsafeWindow.fetch('https://api.cotsu.de/user.php?r=update-progress', {
      body: JSON.stringify({ answers: [{ qid: 'writing', correct: 1 }, { qid: 'correct', correct: 1 }] }),
    });
    assert.equal(fetchCount - before, 1);
    assert.deepEqual(JSON.parse(sent).answers, [{ qid: 'writing', correct: 0 }, { qid: 'correct', correct: 1 }]);
    assert.equal(results.writingOnlyWrongQids.has('writing'), true);
  });
  await test('combined reading and writing errors do not subtract twice from the summary', async () => {
    results.writingWrongQids.add('both');
    await unsafeWindow.fetch('https://api.cotsu.de/user.php?r=update-progress', {
      body: JSON.stringify({ answers: [{ qid: 'both', correct: 0 }] }),
    });
    assert.equal(JSON.parse(sent).answers[0].correct, 0);
    assert.equal(results.writingOnlyWrongQids.has('both'), false);
  });
  await test('manual overrides remain independent and dummy answers are excluded', async () => {
    results.didntKnowQids.add('manual');
    results.didntKnowQids.delete('writing');
    await unsafeWindow.fetch('https://api.cotsu.de/user.php?r=update-progress', {
      body: JSON.stringify({ answers: [{ qid: 'manual', correct: 1 }, { qid: 'writing', correct: 1 }, { qid: results.DUMMY_QUESTION_ID, correct: 1 }] }),
    });
    assert.deepEqual(JSON.parse(sent).answers, [{ qid: 'manual', correct: 0 }, { qid: 'writing', correct: 0 }]);
  });
  await test('starting another exercise clears previous writing failures', async () => {
    await unsafeWindow.fetch('https://api.cotsu.de/user.php?r=review-reading');
    assert.equal(results.writingWrongQids.size, 0);
    assert.equal(results.writingOnlyWrongQids.size, 0);
    assert.equal(results.didntKnowQids.size, 0);
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}
