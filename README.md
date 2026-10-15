# Test Report Studio

QA test report editor: write test cases, attach screenshots and recordings, and export the
report as Markdown (for Jira comments) or a self-contained HTML file. Exported files can be
imported again and edited.

React 19 + TypeScript + Vite. Drafts (text only, not media) are saved in the
browser's localStorage.

## Run

```sh
npm install
npm run dev       # http://localhost:5173
npm test          # vitest
npm run build     # typecheck + production build into dist/
```

## Install as a command

Needs Node 20.12 or newer.

```sh
# install or update
npm install -g https://github.com/ali-ahnaf/qa-editor-ui/releases/latest/download/qa-editor-ui.tgz
# start
qa-editor-ui
```

Every push to `main` (except Markdown-only changes) runs `.github/workflows/release.yml`: it
tests, builds and publishes a GitHub release. The version is `major.minor` from `package.json`
plus the workflow run number, so bump `major` or `minor` there by hand when needed.

Installing straight from the git URL does not work: npm runs the `prepare` build of git
dependencies without their devDependencies during a global install.

On first start it asks for a Claude OAuth token (from `claude setup-token`) and saves it to
`~/.qa-editor-ui.env`. Press Enter to use the machine's Claude Code login instead. Delete
that file to be asked again. The server uses port 3001, or any free port if 3001 is taken, and
prints the URL. Drafts in localStorage are tied to the port, so they only show up again on the
same URL.

## AI title and summary

The sparkle buttons on the Report title and Summary fields call `server.js`, which runs the
Claude Agent SDK and also serves `dist/`.

```sh
cp .env.example .env   # optional: CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY
npm run build && npm start   # http://127.0.0.1:3001
```

With no token in `.env`, the SDK uses this machine's Claude Code login. For development run
`npm run server` next to `npm run dev`; Vite proxies `/api` to it. When the report has a Jira
link, Claude may read the ticket through a Jira/Atlassian MCP server from your Claude Code
config (read-only tools only). Without one, the link is ignored.

The chat button in the bottom right corner uses the same server (`/api/chat`). Paste test
cases in any format and ask Claude to add them; returned cases are appended to the report.

## Layout

- `src/lib.ts` - types, status rules, Markdown/HTML export, import parsers. No React.
- `src/App.tsx` - app state, header, draft autosave, export/import actions.
- `src/components/` - `Editor`, `CaseCard`, `ReportView` (preview and imported reports),
  `MarkdownView`, `Viewer`, and `ui.tsx` (icons, status badge, file picker).
- `src/styles.css` - all styling. Theme colors are CSS variables set on `.app`.

## Design reference

`Main.dc.html` is the original design mockup the app was built from. `support.js` and
`vendor/` are only its preview runtime and are not used by the app.
