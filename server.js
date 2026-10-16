#!/usr/bin/env node
// Serves dist/, generates the report title or summary, and runs the chat assistant with the Claude Agent SDK.
// Run `npm run build` first, then `npm start`. Config comes from .env (see .env.example).
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { query } from '@anthropic-ai/claude-agent-sdk';

const CONFIG = join(homedir(), '.qa-editor-ui.env');
// Claude Code model aliases; each resolves to the latest model of that family.
const MODELS = ['opus', 'sonnet', 'haiku'];

// Auth comes from this machine's Claude Code login, or CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_API_KEY in the env.
try { process.loadEnvFile(); } catch { /* no .env: rely on the shell env or the local Claude Code login */ }
if (!existsSync(CONFIG) && !process.env.ANTHROPIC_MODEL && process.stdin.isTTY) {
  await askModel();
}
try { process.loadEnvFile(CONFIG); } catch { /* no saved config */ }
// Unset means the Claude Code default model. .env and the shell env win over CONFIG.
const MODEL = process.env.ANTHROPIC_MODEL || undefined;

/** First run: asks for a model and saves it to CONFIG. Enter keeps the Claude Code default. */
async function askModel() {
  console.log('Info: AI features (title, summary, chat) use your existing Claude Code login and its subscription usage.');
  console.log(`Model:\n  0) Claude Code default\n${MODELS.map((m, i) => `  ${i + 1}) ${m}`).join('\n')}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const model = MODELS[Number(await rl.question(`Choose 0-${MODELS.length} [0]: `)) - 1];
  rl.close();
  await writeFile(CONFIG, model ? `ANTHROPIC_MODEL=${model}\n` : '# No model: use the Claude Code default.\n', { mode: 0o600 });
  console.log(`Saved to ${CONFIG}. Delete that file to be asked again.`);
}

const REPO = 'ali-ahnaf/qa-editor-ui';

/** Prints the reinstall command when a newer GitHub release exists. Skipped in a git checkout; errors are ignored. */
async function checkUpdate() {
  if (existsSync(join(import.meta.dirname, '.git'))) return;
  try {
    const { version } = JSON.parse(await readFile(join(import.meta.dirname, 'package.json'), 'utf8'));
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: AbortSignal.timeout(3000) });
    const latest = (await res.json()).tag_name?.replace(/^v/, '');
    if (latest && latest !== version) {
      console.log(`Update available: ${version} -> ${latest}. Stop the app and run:\n  npm install -g https://github.com/${REPO}/releases/latest/download/qa-editor-ui.tgz`);
    }
  } catch { /* offline or rate limited: skip the check */ }
}

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';
const DIST = join(import.meta.dirname, 'dist');
const MAX_BODY = 512 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
};

const ASK = {
  title: 'Write the report title: one short line, at most 80 characters, no quotes, no trailing period. Name the feature or flow tested, not the result.',
  summary: 'Write the report summary: 2 to 5 sentences of plain text, no Markdown, no headings. Cover the scope of the run, the overall result, and any failed or blocked cases reviewers should look at.',
};

// Only read-only Jira/Atlassian MCP tools may run. Everything else is denied.
const JIRA_READ = /^mcp__.*(jira|atlassian).*(get|search|fetch|lookup)/i;

async function generate(field, markdown, ticket) {
  const jira = ticket
    ? `\n\nJira ticket: ${ticket}\nIf a Jira or Atlassian tool is available, read this ticket and use its summary and description as context. If no such tool is available or the read fails, ignore the ticket and do not mention it.`
    : '';
  const q = query({
    prompt: `${ASK[field]}${jira}\n\nThe current report, as Markdown. Replace any existing ${field}:\n\n${markdown}`,
    options: {
      systemPrompt: 'You write concise, factual QA test report text. Use only facts from the report and the Jira ticket. Plain professional English, no em dashes, no emoji, no marketing language.',
      model: MODEL,
      tools: [],
      settingSources: [],
      // No ticket: skip loading the user's MCP servers entirely.
      ...(ticket ? {} : { strictMcpConfig: true }),
      permissionMode: 'default',
      canUseTool: async (name) =>
        JIRA_READ.test(name) ? { behavior: 'allow' } : { behavior: 'deny', message: 'Only read-only Jira tools are allowed.' },
      outputFormat: {
        type: 'json_schema',
        schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      },
      maxTurns: 8,
      persistSession: false,
    },
  });
  return (await structured(q, `${field} text`)).text.trim();
}

/** Returns the structured output of a query run, or throws. */
async function structured(q, what) {
  for await (const msg of q) {
    if (msg.type !== 'result') continue;
    if (msg.subtype === 'success' && msg.structured_output) return msg.structured_output;
    throw new Error(`Claude did not return ${what} (${msg.subtype}).`);
  }
  throw new Error('Claude ended without a result.');
}

const STATUSES = ['Passed', 'Failed', 'Blocked', 'In progress', 'Pending', 'Skipped'];
const CASE_SCHEMA = {
  type: 'object',
  properties: {
    caseId: { type: 'string' }, title: { type: 'string' }, status: { type: 'string', enum: STATUSES },
    steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['caseId', 'title', 'status', 'steps', 'expected', 'actual', 'notes'],
  additionalProperties: false,
};

/** Chat turn. Returns a reply and any test cases Claude wants added to the report. */
async function chat(messages, markdown) {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n\n');
  const q = query({
    prompt: `The current report, as Markdown:\n\n${markdown}\n\nConversation so far:\n\n${transcript}\n\nReply to the last user message.`,
    options: {
      systemPrompt: [
        'You are the assistant inside a QA test report editor.',
        'When the user pastes test cases or asks you to create them, convert them into structured test cases and return them in "cases"; the app appends them to the report.',
        'Each case: caseId (continue the TC-NN numbering after the cases already in the report unless the user gives IDs), a short title, status (Pending unless the input states a result), steps as one step per line without numbering, expected result, actual result and notes (empty string when unknown).',
        'Do not repeat cases that are already in the report. Return "cases" as an empty array when nothing should be added.',
        '"reply" is a short plain-text answer to the user, no Markdown. When you add cases, say how many and list their IDs.',
        'Use only facts from the user input and the report. Plain professional English, no em dashes, no emoji.',
      ].join(' '),
      model: MODEL,
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      canUseTool: async () => ({ behavior: 'deny', message: 'No tools are available.' }),
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { reply: { type: 'string' }, cases: { type: 'array', items: CASE_SCHEMA } },
          required: ['reply', 'cases'],
          additionalProperties: false,
        },
      },
      maxTurns: 4,
      persistSession: false,
    },
  });
  return structured(q, 'a chat reply');
}

async function readBody(req, max) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('Request too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const readJson = async (req) => JSON.parse((await readBody(req, MAX_BODY)).toString('utf8'));

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function serveStatic(req, res) {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  let file = join(DIST, path);
  if (!file.startsWith(DIST + sep) && file !== DIST) return send(res, 403, { error: 'Forbidden' });
  try {
    return send(res, 200, await readFile(file), TYPES[extname(file)] || 'application/octet-stream');
  } catch {
    // SPA fallback
    file = join(DIST, 'index.html');
    try { return send(res, 200, await readFile(file), TYPES['.html']); } catch { return send(res, 404, 'Run npm run build first.', 'text/plain'); }
  }
}

const validMessages = (m) =>
  Array.isArray(m) && m.length > 0 && m.length <= 50 && m.at(-1).role === 'user' &&
  m.every((x) => (x?.role === 'user' || x?.role === 'assistant') && typeof x.text === 'string');

const server = createServer(async (req, res) => {
  if (!['/api/generate', '/api/chat'].includes(req.url)) {
    return req.method === 'GET' ? serveStatic(req, res) : send(res, 405, { error: 'Method not allowed' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    if (req.url === '/api/chat') {
      const { messages, markdown } = await readJson(req);
      if (!validMessages(messages) || typeof markdown !== 'string') return send(res, 400, { error: 'Invalid request.' });
      return send(res, 200, await chat(messages, markdown));
    }
    const { field, markdown, ticket } = await readJson(req);
    if (!ASK[field] || typeof markdown !== 'string' || (ticket && !/^https:\/\/\S+$/.test(ticket))) {
      return send(res, 400, { error: 'Invalid request.' });
    }
    send(res, 200, { text: await generate(field, markdown, ticket || '') });
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message || 'Generation failed.' });
  }
});
server.on('listening', () => {
  console.log(`QA editor on http://${HOST}:${server.address().port} (model: ${MODEL || 'Claude Code default'})`);
  checkUpdate();
});
// An explicit PORT must be free (the Vite dev proxy expects it). Otherwise prefer 3001 so the URL, and
// the drafts in localStorage tied to it, stay the same; fall back to any free port.
server.once('error', (e) => {
  if (e.code !== 'EADDRINUSE' || process.env.PORT) throw e;
  server.listen(0, HOST);
});
server.listen(PORT, HOST);
