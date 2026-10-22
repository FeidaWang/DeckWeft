import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertPresentation } from '../src/core/blocks.mjs';
import { assertDesignPlan } from '../src/design/plan.mjs';
import { renderComparison } from '../scripts/render-comparison.mjs';
const read = lang => readFile(new URL(`../examples/model-comparison.${lang}.json`, import.meta.url), 'utf8').then(JSON.parse);
// Figures copied from the two launch pages (read 2026-10-23). Each is vendor-reported.
const SHARED = { astra: [57.9, 53.3, 41.4, 57.2, 64.6], opus55: [66.4, 54.4, 40.0, 67.7, 58.7] };
for (const lang of ['en', 'zh-CN']) {
  test(`model comparison (${lang}) validates, keeps the published figures and cites both pages`, async () => {
    const { document, plan } = await read(lang);
    assertPresentation(document); assertDesignPlan(document, plan);
    const [dataset] = document.datasets;
    assert.equal(dataset.synthetic, false);
    for (const s of dataset.series) assert.deepEqual(s.values, SHARED[s.id]);
    assert.deepEqual(document.sources.map(s => new URL(s.url).host), ['openai.com', 'www.anthropic.com']);
    assert.equal(plan.scenes.length, 6);
    for (const b of document.blocks) assert.ok(b.sourceIds.length > 0, `${b.id} cites a source`);
  });
}
test('model comparison renders offline HTML for both locales with stable hashes', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'deckweft-comparison-'));
  try {
    const first = await renderComparison({ out: dir });
    const second = await renderComparison({ out: dir });
    assert.deepEqual(first.artifacts.map(a => a.locale), ['en', 'zh-CN']);
    assert.deepEqual(first.artifacts.map(a => a.outputHash), second.artifacts.map(a => a.outputHash));
    for (const a of first.artifacts) {
      const html = await readFile(path.join(dir, a.file), 'utf8');
      assert.equal(a.sceneHashes.length, 6);
      assert.ok(html.includes('66.4') && html.includes('64.6'));
      assert.ok(!/<script[^>]+src=|<link[^>]+href=["']https?:/.test(html), 'no remote runtime');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
