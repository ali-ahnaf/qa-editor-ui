import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DRAFT_KEY, IMPORT_ACCEPT, applyChatCases, applyChatReport, THEMES, buildHtml, buildJiraHtml, buildMarkdown, copyText, downloadFile, exportName, fileBase, importText, newCase,
  slimAttachment, zip, today, uid, type ChatResult, type Imported, type Report, type TestCase,
} from './lib';
import { CopyIcon, DownloadIcon, FilePicker, ResetIcon, UploadIcon } from './components/ui';
import Editor from './components/Editor';
import ReportView from './components/ReportView';
import MarkdownView from './components/MarkdownView';
import Viewer from './components/Viewer';
import ChatFab from './components/ChatFab';
import CoffeeFab from './components/CoffeeFab';

type View = 'edit' | 'preview' | 'markdown' | 'viewer';
const TABS: [View, string][] = [['edit', 'Editor'], ['preview', 'Preview'], ['markdown', 'Markdown'], ['viewer', 'Viewer']];

interface Draft { report: Report; cases: TestCase[]; theme: string }

const blankDraft = (): Draft => ({
  report: { title: '', ticket: '', build: '', env: '', tester: '', date: today(), summary: '' },
  cases: [newCase(1)],
  theme: 'Indigo',
});

/** Restores the saved draft. Media bytes are not stored, so attachments come back as "re-attach". */
function loadDraft(): Draft {
  const fallback = blankDraft();
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!d?.report || !Array.isArray(d.cases)) return fallback;
    return {
      report: d.report,
      cases: d.cases.map((c: TestCase) => ({
        ...c,
        attachments: (c.attachments || []).map((a) => ({ ...a, src: '', missing: true, loading: false })),
      })),
      theme: d.theme || fallback.theme,
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [draft] = useState(loadDraft);
  const [view, setView] = useState<View>('edit');
  const [themeName, setThemeName] = useState(draft.theme);
  const [report, setReport] = useState(draft.report);
  const [cases, setCases] = useState(draft.cases);
  const [imported, setImported] = useState<Imported | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>(undefined);

  const theme = THEMES.find((t) => t.name === themeName) || THEMES[0];

  const notify = (msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(''), 2800);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Autosave text fields (not media) shortly after edits stop.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const slim = cases.map((c) => ({ ...c, attachments: c.attachments.map(slimAttachment) }));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ report, cases: slim, theme: themeName }));
      } catch {
        /* storage full or blocked: draft just isn't saved */
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [report, cases, themeName]);

  const save = (filename: string, data: BlobPart, mime: string) => {
    try {
      downloadFile(filename, data, mime);
      notify('Download started: ' + filename);
    } catch {
      notify('Download is not available in this view.');
    }
  };

  const mediaPending = () => {
    const pending = cases.some((c) => c.attachments.some((a) => a.loading));
    if (pending) notify('Attachments are still processing. Try again in a moment.');
    return pending;
  };
  // Clipboard can't carry the media, so the attachments and the full HTML report are downloaded as a zip,
  // named to match the comment, for attaching to the Jira ticket.
  const copyForJira = async () => {
    if (mediaPending()) return;
    const base = fileBase(report);
    const file = base + '.html';
    const ok = await copyText(
      buildMarkdown(report, cases, false) + `\n**Full report with attachments:** ${file} (attached)\n`,
      buildJiraHtml(report, cases) + `<p><strong>Full report with attachments:</strong> ${file} (attached)</p>`,
    );
    const files = [{ name: file, data: new TextEncoder().encode(buildHtml(report, cases, theme.accent)) }];
    let missing = 0;
    for (const [ci, c] of cases.entries()) {
      for (const [i, a] of c.attachments.entries()) {
        if (!a.src) missing++;
        else files.push({ name: exportName(c, ci + 1, i, a), data: new Uint8Array(await (await fetch(a.src)).arrayBuffer()) });
      }
    }
    save(base + '.zip', zip(files), 'application/zip');
    if (!ok) notify('Copy blocked here. Open the Markdown tab and copy manually.');
    else if (missing) notify(`Copied. ${missing} attachment${missing === 1 ? ' needs' : 's need'} re-attaching, so the zip is missing ${missing === 1 ? 'it' : 'them'}.`);
    else notify(`Copied and downloaded ${base}.zip. Paste the comment, then attach the files from the zip.`);
  };
  const exportMd = () => save(fileBase(report) + '.md', buildMarkdown(report, cases, true), 'text/markdown');
  const exportHtml = () => {
    if (mediaPending()) return;
    save(fileBase(report) + '.html', buildHtml(report, cases, theme.accent), 'text/html');
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    if (!/\.(md|markdown|html?|txt)$/i.test(file.name) && !/(markdown|html|text\/plain)/.test(file.type)) {
      notify('Choose a .md or .html file.');
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        setImported(importText(file.name, String(fr.result)));
        setView('viewer');
      } catch {
        notify('Could not read that file.');
      }
    };
    fr.onerror = () => notify('Could not read that file.');
    fr.readAsText(file);
  };

  const editImported = () => {
    if (!imported?.isReport) return;
    setReport(imported.report);
    setCases(imported.cases);
    setView('edit');
    notify('Report loaded into the editor');
  };

  const patchCase = (id: string, fn: (c: TestCase) => Partial<TestCase>) =>
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...fn(c) } : c)));

  const addFiles = (caseId: string, list: FileList) => {
    const files = Array.from(list).filter((f) => /^(image|video)\//.test(f.type));
    if (!files.length) {
      notify('Only image and video files can be attached.');
      return;
    }
    files.forEach((f) => {
      const id = uid('a');
      let name = f.name || 'attachment';
      // Pasted screenshots arrive as "image.png"; give them a unique, readable name.
      if (/^image\.(png|jpe?g|gif|webp)$/i.test(name)) {
        const d = new Date();
        const hms = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join('');
        name = `screenshot-${hms}-${id.slice(-3)}.${name.split('.').pop()}`;
      }
      patchCase(caseId, (c) => ({ attachments: [...c.attachments, { id, name, type: f.type, size: f.size, src: '', loading: true }] }));
      const fr = new FileReader();
      fr.onload = () =>
        patchCase(caseId, (c) => ({
          attachments: c.attachments.map((a) => (a.id === id ? { ...a, src: String(fr.result), loading: false, missing: false } : a)),
        }));
      fr.onerror = () => {
        patchCase(caseId, (c) => ({ attachments: c.attachments.filter((a) => a.id !== id) }));
        notify('Could not read ' + name);
      };
      fr.readAsDataURL(f);
    });
    notify(`Attached ${files.length} file${files.length === 1 ? '' : 's'}`);
  };

  // Autosave writes the blank state back shortly after, so the saved draft is cleared too.
  const resetAll = () => {
    if (!window.confirm('Reset the report? All fields, test cases and attachments will be cleared.')) return;
    const blank = blankDraft();
    setReport(blank.report);
    setCases(blank.cases);
    setImported(null);
    setView('edit');
    notify('Report reset');
  };

  const applyFromChat = (result: ChatResult) => {
    setCases((prev) => applyChatCases(prev, result));
    setReport((prev) => applyChatReport(prev, result));
    setView('edit');
  };

  const themeVars = { '--accent': theme.accent, '--soft': theme.soft, '--ground': theme.ground } as CSSProperties;

  return (
    <div className="app" style={themeVars}>
      <header className="topbar">
        <div className="brand">
          <img src="/matrix-mark.svg" alt="" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">Test Report Studio</span>
            <span className="text-12 muted">Write, attach and export QA results for Jira</span>
          </div>
        </div>

        <nav aria-label="Views" className="tabs">
          {TABS.map(([key, label]) => (
            <button key={key} type="button" className={'tab' + (view === key ? ' active' : '')} onClick={() => setView(key)}>
              {label}
            </button>
          ))}
        </nav>

        <div className="actions">
          <div className="themes">
            <span className="text-12 muted" style={{ marginRight: 2 }}>Theme</span>
            {THEMES.map((t) => (
              <button
                key={t.name}
                type="button"
                className="swatch"
                aria-label={t.name + ' theme'}
                title={t.name}
                onClick={() => setThemeName(t.name)}
                style={{ background: t.accent, boxShadow: t.name === theme.name ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${t.accent}` : undefined }}
              />
            ))}
          </div>
          <FilePicker className="btn" accept={IMPORT_ACCEPT} onFiles={(f) => importFile(f[0])}>
            <UploadIcon />
            Import
          </FilePicker>
          <button type="button" className="btn" onClick={copyForJira}>
            <CopyIcon />
            Copy for Jira
          </button>
          <button type="button" className="btn" onClick={exportMd}>
            <DownloadIcon />
            Markdown
          </button>
          <button type="button" className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={exportHtml}>
            <DownloadIcon />
            HTML
          </button>
          <button type="button" className="btn" onClick={resetAll}>
            <ResetIcon />
            Reset
          </button>
        </div>
      </header>

      {toast && <div role="status" className="toast">{toast}</div>}

      <main className="main">
        {view === 'edit' && (
          <Editor
            report={report}
            setReport={setReport}
            cases={cases}
            setCases={setCases}
            patchCase={patchCase}
            addFiles={addFiles}
            notify={notify}
          />
        )}
        {view === 'preview' && <ReportView report={report} cases={cases} />}
        {view === 'markdown' && (
          <MarkdownView markdown={buildMarkdown(report, cases, false)} onCopy={copyForJira} onDownload={exportMd} />
        )}
        {view === 'viewer' && (
          <Viewer imported={imported} onImport={importFile} onEdit={editImported} onClose={() => setImported(null)} />
        )}
      </main>

      <ChatFab markdown={() => buildMarkdown(report, cases, false)} onResult={applyFromChat} />
      <CoffeeFab />
    </div>
  );
}
