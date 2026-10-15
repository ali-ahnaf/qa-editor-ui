export type Status = 'Passed' | 'Failed' | 'Blocked' | 'In progress' | 'Pending' | 'Skipped';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  src: string;
  loading?: boolean;
  missing?: boolean;
}

export interface TestCase {
  id: string;
  caseId: string;
  title: string;
  status: Status;
  steps: string;
  expected: string;
  actual: string;
  notes: string;
  attachments: Attachment[];
  open: boolean;
}

export interface Report {
  title: string;
  ticket: string;
  build: string;
  env: string;
  tester: string;
  date: string;
  summary: string;
}

export interface Block {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'quote' | 'code' | 'hr' | 'img' | 'video' | 'row';
  text?: string;
  marker?: string;
  src?: string;
  cells?: string[];
  header?: boolean;
}

export type Imported = { name: string; kind: string } & (
  | { isReport: true; report: Report; cases: TestCase[] }
  | { isReport: false; blocks: Block[] }
);

export const THEMES = [
  { name: 'Indigo', accent: '#4338CA', soft: '#EEF0FF', ground: '#F6F7FB' },
  { name: 'Teal', accent: '#0F766E', soft: '#E6F4F2', ground: '#F5F8F8' },
  { name: 'Ocean', accent: '#0B5FA5', soft: '#E7F1FA', ground: '#F5F8FB' },
  { name: 'Graphite', accent: '#1F2937', soft: '#EEF0F3', ground: '#F7F7F6' },
  { name: 'Rose', accent: '#B4235A', soft: '#FCEBF2', ground: '#FAF7F8' },
];
export type Theme = (typeof THEMES)[number];

export const STATUS_ORDER: Status[] = ['Passed', 'Failed', 'Blocked', 'In progress', 'Pending', 'Skipped'];
export const STATUS: Record<Status, { bg: string; fg: string; dot: string; soft: string }> = {
  Passed: { bg: '#E6F4EA', fg: '#11652B', dot: '#1E8E3E', soft: '#F3FAF5' },
  Failed: { bg: '#FDE8E7', fg: '#A61B12', dot: '#D93025', soft: '#FEF4F3' },
  Blocked: { bg: '#FFF0E0', fg: '#8F4400', dot: '#E37400', soft: '#FFF8F0' },
  'In progress': { bg: '#E6EFFC', fg: '#1849A9', dot: '#1A73E8', soft: '#F3F7FE' },
  Pending: { bg: '#F0F1F4', fg: '#475467', dot: '#98A2B3', soft: '#F9FAFB' },
  Skipped: { bg: '#F1ECFB', fg: '#5B33B0', dot: '#7F56D9', soft: '#F8F5FD' },
};
export const STATUS_EMOJI: Record<Status, string> = {
  Passed: '✅', Failed: '❌', Blocked: '🚫', 'In progress': '🔄', Pending: '⏳', Skipped: '⏭️',
};
export const statusColors = (s: string) => STATUS[s as Status] ?? STATUS.Pending;

export const ENVS = ['Local', 'Staging', 'Production'];
export const DRAFT_KEY = 'qa-report-studio-draft-v1';
export const IMPORT_ACCEPT = '.md,.markdown,.html,.htm,text/markdown,text/html';

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9);
const pad2 = (n: number) => String(n).padStart(2, '0');

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const emptyReport = (): Report => ({ title: '', ticket: '', build: '', env: '', tester: '', date: '', summary: '' });

export function newCase(n: number): TestCase {
  return {
    id: uid('c'), caseId: 'TC-' + pad2(n), title: '', status: 'Pending',
    steps: '', expected: '', actual: '', notes: '', attachments: [], open: true,
  };
}

export type CaseDraft = Partial<Pick<TestCase, 'caseId' | 'title' | 'status' | 'steps' | 'expected' | 'actual' | 'notes'>>;

const isBlank = (c: TestCase) =>
  !c.attachments.length && ![c.title, c.steps, c.expected, c.actual, c.notes].some((v) => v.trim());

/** Appends generated cases. Blank placeholder cases are dropped so new ones don't land behind an empty TC-01. */
export function addCases(cases: TestCase[], drafts: CaseDraft[]): TestCase[] {
  const kept = cases.filter((c) => !isBlank(c));
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const added = drafts.map((d, i) => {
    const c = newCase(kept.length + i + 1);
    return {
      ...c,
      caseId: str(d.caseId).trim() || c.caseId,
      title: str(d.title), steps: str(d.steps), expected: str(d.expected), actual: str(d.actual), notes: str(d.notes),
      status: STATUS_ORDER.includes(d.status as Status) ? (d.status as Status) : 'Pending',
      open: false,
    };
  });
  return [...kept, ...added];
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function ticketUrl(v: string) {
  v = String(v || '').trim();
  return /^https?:\/\/[^\s]+$/i.test(v) ? v : '';
}

export function ticketKey(v: string) {
  v = String(v || '').trim();
  const m = v.match(/([A-Z][A-Z0-9_]+-\d+)/);
  if (m) return m[1];
  const u = ticketUrl(v);
  if (u) {
    try { return new URL(u).pathname.split('/').filter(Boolean).pop() || u; } catch { return u; }
  }
  return v;
}

export function fileSize(b: number) {
  if (!b && b !== 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

const b64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
const unB64 = (str: string) => decodeURIComponent(escape(atob(str)));

export const splitSteps = (text: string) =>
  String(text || '').split('\n').map((s) => s.replace(/^\s*(\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean);

const stripInline = (s: string) =>
  String(s)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|\s)\*([^*]+)\*/g, '$1$2');

export function overall(cases: TestCase[]): Status {
  if (!cases.length) return 'Pending';
  const has = (s: Status) => cases.some((c) => c.status === s);
  if (has('Failed')) return 'Failed';
  if (has('Blocked')) return 'Blocked';
  if (cases.every((c) => c.status === 'Pending')) return 'Pending';
  if (has('In progress') || has('Pending')) return 'In progress';
  if (cases.every((c) => c.status === 'Skipped')) return 'Skipped';
  return 'Passed';
}

export function counts(cases: TestCase[]) {
  const o = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  cases.forEach((c) => { o[c.status] = (o[c.status] || 0) + 1; });
  return o;
}

const countParts = (cases: TestCase[]) => {
  const n = counts(cases);
  return STATUS_ORDER.filter((s) => n[s]).map((s) => `${s}: ${n[s]}`);
};
const plural = (n: number) => n + ' test case' + (n === 1 ? '' : 's');

/** Attachment metadata only; media bytes are never stored in drafts or embedded data. */
export const slimAttachment = (a: Attachment) => ({ id: a.id, name: a.name, type: a.type, size: a.size });

function serialize(report: Report, cases: TestCase[]) {
  return {
    v: 1, report,
    cases: cases.map((c) => ({
      caseId: c.caseId, title: c.title, status: c.status, steps: c.steps, expected: c.expected,
      actual: c.actual, notes: c.notes, attachments: c.attachments.map(slimAttachment),
    })),
  };
}

export function fileBase(r: Report) {
  const base = [ticketKey(r.ticket), r.title || 'qa-report'].filter(Boolean).join('-')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'qa-report';
}

/* ---------- export builders ---------- */

export function buildMarkdown(r: Report, cases: TestCase[], withData: boolean) {
  const out: string[] = [];
  out.push('## QA Test Report: ' + (r.title || 'Untitled report'), '');
  const meta: string[] = [];
  if (r.ticket) meta.push('**Ticket:** ' + (ticketUrl(r.ticket) ? `[${ticketKey(r.ticket)}](${ticketUrl(r.ticket)})` : r.ticket));
  if (r.env) meta.push('**Environment:** ' + r.env);
  if (r.tester) meta.push('**Tested by:** ' + r.tester);
  if (r.date) meta.push('**Date:** ' + r.date);
  if (meta.length) out.push(meta.join(' | '), '');
  const parts = countParts(cases);
  out.push(`**Overall result:** ${overall(cases).toUpperCase()} (${plural(cases.length)}${parts.length ? '; ' + parts.join(', ') : ''})`, '');
  if (r.summary?.trim()) out.push('### Summary', r.summary.trim(), '');
  if (cases.length) {
    out.push('### Results overview', '| ID | Test case | Status | Files |', '|---|---|---|---|');
    cases.forEach((c) => {
      out.push('| ' + [c.caseId || '-', (c.title || 'Untitled').replace(/\|/g, '\\|'), c.status, String(c.attachments.length)].join(' | ') + ' |');
    });
    out.push('');
  }
  cases.forEach((c) => {
    out.push('### ' + (c.caseId ? c.caseId + ': ' : '') + (c.title || 'Untitled test case'));
    out.push('**Status:** ' + c.status.toUpperCase(), '');
    const steps = splitSteps(c.steps);
    if (steps.length) { out.push('**Steps**'); steps.forEach((s, i) => out.push(`${i + 1}. ${s}`)); out.push(''); }
    if (c.expected?.trim()) out.push('**Expected:** ' + c.expected.trim(), '');
    if (c.actual?.trim()) out.push('**Actual:** ' + c.actual.trim(), '');
    if (c.notes?.trim()) out.push('**Notes:** ' + c.notes.trim(), '');
    if (c.attachments.length) {
      out.push('**Attachments**');
      c.attachments.forEach((a) => {
        out.push(/^image\//.test(a.type) ? `![${a.name}](${encodeURI(a.name)})` : `- [${a.name}](${encodeURI(a.name)})`);
      });
      out.push('');
    }
  });
  let md = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  if (withData) md += '\n<!-- qa-report-data:' + b64(JSON.stringify(serialize(r, cases))) + ' -->\n';
  return md;
}

/**
 * Clipboard HTML for pasting into the Jira Cloud editor. Each test case becomes an Expand
 * (data-node-type="expand" is the editor's own paste format; Markdown has no expand syntax).
 */
export function buildJiraHtml(r: Report, cases: TestCase[]) {
  const text = (s: string) => esc(s.trim()).replace(/\n/g, '<br>');
  const h: string[] = [];
  h.push('<h2>QA Test Report: ' + esc(r.title || 'Untitled report') + '</h2>');
  const link = ticketUrl(r.ticket);
  const meta = [
    ['Ticket', link ? `<a href="${esc(link)}">${esc(ticketKey(r.ticket))}</a>` : esc(r.ticket)],
    ['Environment', esc(r.env)], ['Tested by', esc(r.tester)], ['Date', esc(r.date)],
  ].filter((m) => m[1]);
  if (meta.length) h.push('<p>' + meta.map(([k, v]) => `<strong>${k}:</strong> ${v}`).join(' | ') + '</p>');
  const parts = countParts(cases);
  h.push(`<p><strong>Overall result:</strong> ${overall(cases).toUpperCase()} (${plural(cases.length)}${parts.length ? '; ' + parts.join(', ') : ''})</p>`);
  if (r.summary?.trim()) h.push('<h3>Summary</h3><p>' + text(r.summary) + '</p>');
  if (cases.length) {
    h.push('<h3>Results overview</h3><table><thead><tr><th>ID</th><th>Test case</th><th>Status</th><th>Files</th></tr></thead><tbody>');
    cases.forEach((c) => {
      h.push(`<tr><td>${esc(c.caseId || '-')}</td><td>${esc(c.title || 'Untitled')}</td><td>${STATUS_EMOJI[c.status] ?? esc(c.status)}</td><td>${c.attachments.length}</td></tr>`);
    });
    h.push('</tbody></table>');
  }
  cases.forEach((c) => {
    const title = (c.caseId ? c.caseId + ': ' : '') + (c.title || 'Untitled test case');
    h.push(`<div data-node-type="expand" data-title="${esc(title)}">`);
    h.push('<p><strong>Status:</strong> ' + esc(c.status.toUpperCase()) + '</p>');
    const steps = splitSteps(c.steps);
    if (steps.length) h.push('<p><strong>Steps</strong></p><ol>' + steps.map((s) => `<li>${esc(s)}</li>`).join('') + '</ol>');
    if (c.expected?.trim()) h.push('<p><strong>Expected:</strong> ' + text(c.expected) + '</p>');
    if (c.actual?.trim()) h.push('<p><strong>Actual:</strong> ' + text(c.actual) + '</p>');
    if (c.notes?.trim()) h.push('<p><strong>Notes:</strong> ' + text(c.notes) + '</p>');
    if (c.attachments.length) h.push('<p><strong>Attachments</strong></p><ul>' + c.attachments.map((a) => `<li>${esc(a.name)}</li>`).join('') + '</ul>');
    h.push('</div>');
  });
  return h.join('');
}

const HTML_CSS = (accent: string) =>
  'body{margin:0;background:#F6F7FB;color:#101828;font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:880px;margin:32px auto;background:#fff;border:1px solid #E4E7EC;border-radius:16px;padding:36px 40px}.eyebrow{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:' + accent + '}h1{font-size:26px;margin:6px 0 12px;letter-spacing:-.02em}h2{font-size:15px;margin:24px 0 8px}h3{font-size:16px;margin:0}h4{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#475467;margin:0 0 4px}.badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}.badge i{width:7px;height:7px;border-radius:50%;display:inline-block}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;background:#F9FAFB;border-radius:10px;padding:14px 16px;margin:0}dt{font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.04em}dd{margin:2px 0 0;font-weight:500}.wrap{overflow-x:auto;border:1px solid #E4E7EC;border-radius:10px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #F2F4F7}th{background:#F9FAFB;color:#475467}.case{border-top:1px solid #EAECF0;margin-top:24px;padding-top:20px}.head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.id{font-family:ui-monospace,monospace;font-size:12px;background:#F2F4F7;color:#475467;padding:2px 8px;border-radius:6px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:12px 0}.box{background:#F9FAFB;border-radius:10px;padding:12px 14px}.box p,.notes{margin:0;white-space:pre-line}ol{margin:0;padding-left:20px}.media{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:12px}figure{margin:0;border:1px solid #E4E7EC;border-radius:10px;overflow:hidden}figure img,figure video{width:100%;display:block;max-height:360px;object-fit:contain;background:#F2F4F7}figcaption{font-size:12px;color:#475467;padding:6px 10px}figure img{cursor:zoom-in}figure :fullscreen{background:#000}.full{position:fixed;inset:0;z-index:9;height:100%;max-height:none!important;background:#000!important;cursor:zoom-out}.missing{padding:24px 12px;text-align:center;color:#475467;font-size:12px;background:#F2F4F7}@media(max-width:640px){main{margin:0;border-radius:0;padding:24px 18px}}';

const VIDEO_TO_BLOB =
  'document.querySelectorAll("video[data-att][src^=\'data:\']").forEach(function(v){var u=v.getAttribute("src"),i=u.indexOf(","),s=atob(u.slice(i+1)),b=new Uint8Array(s.length);for(var k=0;k<s.length;k++)b[k]=s.charCodeAt(k);v.src=URL.createObjectURL(new Blob([b],{type:u.slice(5,i).split(";")[0]}))})';

// Click an image or video to open it full screen. iPhone has no element fullscreen for images, so they fall back to a fixed overlay.
const FULLSCREEN =
  'document.addEventListener("click",function(e){var m=e.target.closest&&e.target.closest("figure img,figure video");if(!m)return;var d=document;if(d.fullscreenElement||d.webkitFullscreenElement){if(m.tagName=="IMG")(d.exitFullscreen||d.webkitExitFullscreen).call(d);return}var f=m.requestFullscreen||m.webkitRequestFullscreen||m.webkitEnterFullscreen;if(f)f.call(m);else m.classList.toggle("full")})';

export function buildHtml(r: Report, cases: TestCase[], accent: string) {
  const badge = (s: string) => {
    const c = statusColors(s);
    return `<span class="badge" style="background:${c.bg};color:${c.fg}"><i style="background:${c.dot}"></i>${esc(s)}</span>`;
  };
  const meta = [['Ticket', r.ticket], ['Environment', r.env], ['Tested by', r.tester], ['Date', r.date]].filter((m) => m[1]);
  const h: string[] = [];
  h.push('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
  h.push('<title>' + esc(r.title || 'QA Test Report') + '</title>');
  h.push('<style>' + HTML_CSS(accent) + '</style></head><body><main>');
  h.push('<div class="eyebrow">QA test report</div>');
  h.push('<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap"><h1>' + esc(r.title || 'Untitled report') + '</h1>' + badge(overall(cases)) + '</div>');
  if (meta.length) {
    h.push('<dl>' + meta.map(([label, value]) => {
      const link = label === 'Ticket' ? ticketUrl(value) : '';
      const val = link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" style="color:${accent}">${esc(ticketKey(value))}</a>`
        : esc(value);
      return `<div><dt>${esc(label)}</dt><dd>${val}</dd></div>`;
    }).join('') + '</dl>');
  }
  const parts = countParts(cases);
  h.push('<p style="color:#475467;margin:12px 0 0">' + plural(cases.length) + (parts.length ? '. ' + esc(parts.join(', ')) : '') + '</p>');
  if (r.summary?.trim()) h.push('<h2>Summary</h2><p class="notes">' + esc(r.summary.trim()) + '</p>');
  if (cases.length) {
    h.push('<h2>Results overview</h2><div class="wrap"><table><thead><tr><th>ID</th><th>Test case</th><th>Status</th><th>Files</th></tr></thead><tbody>');
    cases.forEach((c) => {
      h.push(`<tr><td style="font-family:ui-monospace,monospace;color:#475467">${esc(c.caseId || '-')}</td><td>${esc(c.title || 'Untitled')}</td><td>${badge(c.status)}</td><td>${c.attachments.length}</td></tr>`);
    });
    h.push('</tbody></table></div>');
  }
  cases.forEach((c) => {
    h.push('<section class="case"><div class="head">' + (c.caseId ? `<span class="id">${esc(c.caseId)}</span>` : '') + `<h3 style="flex:1 1 200px">${esc(c.title || 'Untitled test case')}</h3>` + badge(c.status) + '</div>');
    const steps = splitSteps(c.steps);
    if (steps.length) h.push('<h4>Steps</h4><ol>' + steps.map((s) => `<li>${esc(s)}</li>`).join('') + '</ol>');
    let boxes = '';
    if (c.expected?.trim()) boxes += `<div class="box"><h4>Expected</h4><p>${esc(c.expected.trim())}</p></div>`;
    if (c.actual?.trim()) boxes += `<div class="box" style="background:${statusColors(c.status).soft}"><h4>Actual</h4><p>${esc(c.actual.trim())}</p></div>`;
    if (boxes) h.push('<div class="grid">' + boxes + '</div>');
    if (c.notes?.trim()) h.push('<p class="notes"><strong>Notes: </strong>' + esc(c.notes.trim()) + '</p>');
    if (c.attachments.length) {
      h.push('<div class="media">');
      c.attachments.forEach((a) => {
        let body;
        if (!a.src) body = `<div class="missing" data-att="${esc(a.id)}">File not embedded: ${esc(a.name)}</div>`;
        else if (/^video\//.test(a.type)) body = `<video controls data-att="${esc(a.id)}" src="${a.src}"></video>`;
        else body = `<img alt="${esc(a.name)}" data-att="${esc(a.id)}" src="${a.src}">`;
        h.push(`<figure>${body}<figcaption>${esc(a.name)} (${fileSize(a.size)})</figcaption></figure>`);
      });
      h.push('</div>');
    }
    h.push('</section>');
  });
  h.push('</main><script type="application/json" id="qa-report-data">' + JSON.stringify(serialize(r, cases)).replace(/</g, '\\u003c') + '<\/script>');
  // Chrome rejects data:video/quicktime and Safari rejects large data: videos, but both play the same bytes
  // from a Blob URL. The data: src stays in the markup so import and no-JS viewers still get the file.
  h.push('<script>' + VIDEO_TO_BLOB + ';' + FULLSCREEN + '<\/script></body></html>');
  return h.join('\n');
}

/* ---------- import ---------- */

// Imported files are untrusted: every field is optional until merged onto defaults.
type ReportData = { report?: Partial<Report>; cases?: Array<Partial<TestCase>> };

function loadData(data: ReportData, srcMap: Record<string, string> | null) {
  const cases = (data.cases || []).map((c, i): TestCase => ({
    ...newCase(i + 1),
    ...c,
    id: uid('c'),
    open: true,
    status: c.status && c.status in STATUS ? c.status : 'Pending',
    attachments: (c.attachments || []).map((a) => {
      const src = srcMap?.[a.id] || '';
      return { ...a, src, missing: !src, loading: false };
    }),
  }));
  return { report: { ...emptyReport(), ...data.report }, cases };
}

export function parseMdBlocks(text: string): Block[] {
  const lines = String(text).replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const blocks: Block[] = [];
  let para: string[] = [];
  let code: string[] | null = null;
  let lastRow = false;
  const flush = () => { if (para.length) { blocks.push({ kind: 'p', text: stripInline(para.join('\n')) }); para = []; } };
  for (const line of lines) {
    if (code !== null) {
      if (/^\s*```/.test(line)) { blocks.push({ kind: 'code', text: code.join('\n') }); code = null; } else code.push(line);
      continue;
    }
    if (/^\s*```/.test(line)) { flush(); code = []; lastRow = false; continue; }
    let m: RegExpMatchArray | null;
    if (/^\s*\|/.test(line)) {
      flush();
      if (/^\s*\|?\s*:?-{2,}/.test(line.replace(/\|/g, ' |').trim()) && /^[\s|:\-]+$/.test(line)) continue;
      const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => stripInline(c.trim().replace(/\\\|/g, '|')));
      blocks.push({ kind: 'row', cells, header: !lastRow });
      lastRow = true;
      continue;
    }
    lastRow = false;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^\s*(#{1,6})\s+(.*)$/))) {
      flush();
      blocks.push({ kind: m[1].length === 1 ? 'h1' : m[1].length === 2 ? 'h2' : 'h3', text: stripInline(m[2]) });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); blocks.push({ kind: 'hr' }); continue; }
    if ((m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)[^)]*\)\s*$/))) { flush(); blocks.push({ kind: 'img', text: m[1] || m[2], src: m[2] }); continue; }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { flush(); blocks.push({ kind: 'quote', text: stripInline(m[1]) }); continue; }
    if ((m = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/))) {
      flush();
      blocks.push({ kind: 'li', marker: /\d/.test(m[1]) ? m[1] : '•', text: stripInline(m[2]) });
      continue;
    }
    para.push(line.trim());
  }
  if (code !== null) blocks.push({ kind: 'code', text: code.join('\n') });
  flush();
  return blocks;
}

function parseHtmlBlocks(doc: Document): Block[] {
  const blocks: Block[] = [];
  const text = (n: Node) => (n.textContent || '').replace(/\s+/g, ' ').trim();
  const walk = (node: Node) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) { const t = text(n); if (t) blocks.push({ kind: 'p', text: t }); return; }
      if (!(n instanceof Element)) return;
      const tag = n.tagName.toLowerCase();
      if (/^(script|style|head|template|noscript)$/.test(tag)) return;
      if (tag === 'h1') { blocks.push({ kind: 'h1', text: text(n) }); return; }
      if (tag === 'h2') { blocks.push({ kind: 'h2', text: text(n) }); return; }
      if (/^h[3-6]$/.test(tag)) { blocks.push({ kind: 'h3', text: text(n) }); return; }
      if (/^(p|figcaption|dt|dd|span)$/.test(tag)) { const t = text(n); if (t) blocks.push({ kind: 'p', text: t }); return; }
      if (tag === 'li') {
        const parent = n.parentElement;
        const idx = parent ? Array.prototype.indexOf.call(parent.children, n) + 1 : 1;
        blocks.push({ kind: 'li', marker: parent?.tagName.toLowerCase() === 'ol' ? idx + '.' : '•', text: text(n) });
        return;
      }
      if (tag === 'blockquote') { blocks.push({ kind: 'quote', text: text(n) }); return; }
      if (tag === 'pre') { blocks.push({ kind: 'code', text: n.textContent || '' }); return; }
      if (tag === 'hr') { blocks.push({ kind: 'hr' }); return; }
      if (tag === 'img') { blocks.push({ kind: 'img', text: n.getAttribute('alt') || '', src: n.getAttribute('src') || '' }); return; }
      if (tag === 'video') {
        const src = n.getAttribute('src') || n.querySelector('source')?.getAttribute('src') || '';
        blocks.push({ kind: 'video', text: 'Video', src });
        return;
      }
      if (tag === 'tr') { blocks.push({ kind: 'row', cells: Array.from(n.children, text), header: !!n.querySelector('th') }); return; }
      walk(n);
    });
  };
  walk(doc.body || doc);
  return blocks;
}

/** Parses an imported file. Throws on malformed embedded report data. */
export function importText(name: string, text: string): Imported {
  const isHtml = /\.html?$/i.test(name) || /^\s*(<!doctype html|<html|<body|<div|<h1|<p)/i.test(text);
  if (isHtml) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const dataEl = doc.getElementById('qa-report-data');
    if (dataEl) {
      const srcMap: Record<string, string> = {};
      doc.querySelectorAll('[data-att]').forEach((el) => {
        const s = el.getAttribute('src');
        if (s) srcMap[el.getAttribute('data-att')!] = s;
      });
      return { name, kind: 'QA report (HTML)', isReport: true, ...loadData(JSON.parse(dataEl.textContent || '{}'), srcMap) };
    }
    return { name, kind: 'HTML document', isReport: false, blocks: parseHtmlBlocks(doc) };
  }
  const m = String(text).match(/<!--\s*qa-report-data:([A-Za-z0-9+/=]+)\s*-->/);
  if (m) {
    return { name, kind: 'QA report (Markdown, media not embedded)', isReport: true, ...loadData(JSON.parse(unB64(m[1])), null) };
  }
  return { name, kind: 'Markdown document', isReport: false, blocks: parseMdBlocks(text) };
}

/* ---------- browser helpers ---------- */

export function downloadFile(filename: string, data: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Resolves true when the text reached the clipboard. With html, rich editors paste that and plain ones get text. */
export async function copyText(text: string, html?: string) {
  try {
    if (html) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })]);
    } else await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const onCopy = (e: ClipboardEvent) => {
      if (!html || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', text);
      e.clipboardData.setData('text/html', html);
    };
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.addEventListener('copy', onCopy);
    const ok = document.execCommand('copy');
    document.removeEventListener('copy', onCopy);
    ta.remove();
    return ok;
  }
}
