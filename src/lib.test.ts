import { expect, test, vi } from 'vitest';
import { addCases, buildJiraHtml, buildMarkdown, importText, newCase, overall, videosToGifs, type Report, type TestCase } from './lib';

const report: Report = { title: 'Checkout', ticket: 'https://x.atlassian.net/browse/PROJ-12', build: '', env: 'Staging', tester: 'QA', date: '2026-10-15', summary: 'Ok' };
const tc = (status: TestCase['status'], extra: Partial<TestCase> = {}): TestCase => ({ ...newCase(1), status, ...extra });

test('overall status precedence', () => {
  expect(overall([])).toBe('Pending');
  expect(overall([tc('Passed'), tc('Failed'), tc('Blocked')])).toBe('Failed');
  expect(overall([tc('Passed'), tc('Blocked')])).toBe('Blocked');
  expect(overall([tc('Passed'), tc('Pending')])).toBe('In progress');
  expect(overall([tc('Skipped'), tc('Skipped')])).toBe('Skipped');
  expect(overall([tc('Passed'), tc('Skipped')])).toBe('Passed');
});

test('markdown export with embedded data round-trips through import', () => {
  const cases = [tc('Failed', { title: 'Pay | card', steps: '1. Open\n- Pay', attachments: [{ id: 'a1', name: 'shot.png', type: 'image/png', size: 10, src: 'data:x' }] })];
  const md = buildMarkdown(report, cases, true);
  expect(md).toContain('**Ticket:** [PROJ-12](https://x.atlassian.net/browse/PROJ-12)');
  expect(md).toContain('| TC-01 | Pay \\| card | Failed | 1 |');
  expect(md).toContain('1. Open\n2. Pay');

  const imp = importText('r.md', md);
  if (!imp.isReport) throw new Error('expected report');
  expect(imp.report).toEqual(report);
  expect(imp.cases[0]).toMatchObject({ title: 'Pay | card', status: 'Failed' });
  expect(imp.cases[0].attachments[0]).toMatchObject({ name: 'shot.png', src: '', missing: true });
});

test('plain markdown imports as blocks', () => {
  const imp = importText('n.md', '# Title\n\n- a\n\n| h |\n|---|\n| v |');
  if (imp.isReport) throw new Error('expected blocks');
  expect(imp.blocks.map((b) => b.kind)).toEqual(['h1', 'li', 'row', 'row']);
  expect(imp.blocks[2].header).toBe(true);
  expect(imp.blocks[3].header).toBe(false);
});

test('addCases drops blank placeholders and sanitizes drafts', () => {
  const out = addCases([newCase(1), tc('Passed', { title: 'Kept' })], [
    { title: 'New', status: 'Failed', steps: 'a\nb' },
    { caseId: ' X-9 ', status: 'Bogus' as TestCase['status'] },
  ]);
  expect(out.map((c) => c.title)).toEqual(['Kept', 'New', '']);
  expect(out[1]).toMatchObject({ caseId: 'TC-02', status: 'Failed', steps: 'a\nb', attachments: [] });
  expect(out[2]).toMatchObject({ caseId: 'X-9', status: 'Pending' });
});

test('jira html wraps each case in an expand titled with the case', () => {
  const html = buildJiraHtml(report, [tc('Failed', { title: 'Pay "card" <x>', steps: '1. Open' })]);
  expect(html).toContain('<div data-node-type="expand" data-title="TC-01: Pay &quot;card&quot; &lt;x&gt;"><p><strong>Status:</strong> FAILED</p>');
  expect(html).toContain('<ol><li>Open</li></ol></div>');
  expect(html).toContain('<td>Pay &quot;card&quot; &lt;x&gt;</td><td>❌</td>');
});

test('videosToGifs swaps videos for GIFs and keeps failed ones as video', async () => {
  const att = (id: string, type: string) => ({ id, name: id + '.mov', type, size: 9, src: 'data:' + type + ';base64,AA==' });
  let calls = 0;
  vi.stubGlobal('fetch', async (url: string) => {
    if (url !== '/api/gif') return new Response('x');
    return ++calls === 1 ? Response.json({ src: 'data:image/gif;base64,R0lG', size: 3 }) : new Response('', { status: 500 });
  });
  const progress: number[] = [];
  const { cases, failed } = await videosToGifs(
    [tc('Passed', { attachments: [att('a', 'video/quicktime'), att('b', 'image/png'), att('c', 'video/mp4')] })],
    (done) => progress.push(done),
  );
  vi.unstubAllGlobals();
  expect(failed).toBe(1);
  expect(progress).toEqual([1, 2]);
  expect(cases[0].attachments.map((a) => [a.name, a.type, a.size])).toEqual([
    ['a.gif', 'image/gif', 3], ['b.mov', 'image/png', 9], ['c.mov', 'video/mp4', 9],
  ]);
});
