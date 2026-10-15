import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  buildMarkdown, ENVS, STATUS, STATUS_ORDER, counts, newCase, overall, ticketKey, ticketUrl, uid, type Report, type TestCase,
} from '../lib';
import { Badge, ChevronIcon, LinkIcon, PlusIcon, SparkleIcon } from './ui';
import CaseCard from './CaseCard';

interface Props {
  report: Report;
  setReport: Dispatch<SetStateAction<Report>>;
  cases: TestCase[];
  setCases: Dispatch<SetStateAction<TestCase[]>>;
  patchCase: (id: string, fn: (c: TestCase) => Partial<TestCase>) => void;
  addFiles: (caseId: string, files: FileList) => void;
  notify: (msg: string) => void;
}

export default function Editor({ report, setReport, cases, setCases, patchCase, addFiles, notify }: Props) {
  const field = (k: keyof Report) => ({
    value: report[k],
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      setReport((prev) => ({ ...prev, [k]: v }));
    },
  });

  const link = ticketUrl(report.ticket);
  const ticketInvalid = !!report.ticket.trim() && !link;
  const envValue = ENVS.includes(report.env) ? report.env : '';
  const n = counts(cases);
  const total = cases.length;

  const [busy, setBusy] = useState<'' | 'title' | 'summary'>('');
  const generate = async (k: 'title' | 'summary') => {
    setBusy(k);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ field: k, ticket: link, markdown: buildMarkdown(report, cases, false) }),
      });
      const data = await res.json().catch(() => ({ error: 'The generate server is not running. Start it with npm start.' }));
      if (!res.ok) throw new Error(data.error);
      setReport((prev) => ({ ...prev, [k]: data.text }));
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy('');
    }
  };
  const genButton = (k: 'title' | 'summary') => (
    <button
      type="button"
      className={'icon-btn icon-btn-sm gen-btn' + (busy === k ? ' busy' : '')}
      aria-label={`Generate ${k} with Claude`}
      title={total ? `Generate ${k} with Claude` : 'Add test cases first'}
      aria-busy={busy === k}
      disabled={!!busy || !total}
      onClick={() => generate(k)}
    >
      <SparkleIcon />
    </button>
  );

  const addCase = () => setCases((prev) => [...prev, newCase(prev.length + 1)]);
  const move = (i: number, d: number) =>
    setCases((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const a = prev.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  const duplicate = (i: number) =>
    setCases((prev) => {
      const c = prev[i];
      const copy = {
        ...c,
        id: uid('c'),
        caseId: c.caseId ? c.caseId + '-copy' : '',
        attachments: c.attachments.map((x) => ({ ...x, id: uid('a') })),
      };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  const remove = (id: string) => {
    setCases((prev) => prev.filter((x) => x.id !== id));
    notify('Test case removed');
  };

  return (
    <div className="editor">
      <aside className="editor-side">
        <section className="card panel">
          <h2 className="panel-title">Report details</h2>
          <div className="field">
            <label htmlFor="r-title" className="label">Report title</label>
            <div className="relative">
              <input id="r-title" type="text" className="input" style={{ paddingRight: 40 }} placeholder="Checkout flow regression" {...field('title')} />
              {genButton('title')}
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-ticket" className="label">Jira ticket link</label>
            <div className="relative">
              <LinkIcon stroke="#667085" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="r-ticket"
                type="url"
                inputMode="url"
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="https://your-company.atlassian.net/browse/PROJ-123"
                {...field('ticket')}
              />
            </div>
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="ticket-link">
                Open {ticketKey(report.ticket)} in Jira
              </a>
            )}
            {ticketInvalid && <span className="text-12 error">Enter a full link starting with https://</span>}
          </div>
          <div className="field">
            <label htmlFor="r-date" className="label">Date</label>
            <input id="r-date" type="date" className="input" style={{ padding: '8px 12px' }} {...field('date')} />
          </div>
          <div className="field">
            <label htmlFor="r-env" className="label">Environment</label>
            <div className="relative">
              <select
                id="r-env"
                className="input select"
                style={{ color: envValue ? '#101828' : '#667085' }}
                {...field('env')}
                value={envValue}
              >
                <option value="" disabled>Select environment</option>
                {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <ChevronIcon stroke="#475467" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="r-tester" className="label">Tested by</label>
            <input id="r-tester" type="text" className="input" placeholder="Your name" {...field('tester')} />
          </div>
          <div className="field">
            <label htmlFor="r-summary" className="label">Summary</label>
            <div className="relative">
              <textarea
                id="r-summary"
                rows={5}
                className="input"
                style={{ lineHeight: 1.5, display: 'block', paddingRight: 40 }}
                placeholder="Scope of this run, what changed, anything reviewers should know."
                {...field('summary')}
              />
              {genButton('summary')}
            </div>
          </div>
        </section>

        <section className="card panel">
          <div className="row-between">
            <h2 className="panel-title">Results</h2>
            <Badge status={overall(cases)} />
          </div>
          <div className="progress">
            {STATUS_ORDER.map((s) => (
              <div key={s} style={{ width: `${total ? (n[s] / total) * 100 : 0}%`, background: STATUS[s].dot }} />
            ))}
          </div>
          <div className="stats">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="stat">
                <span className="stat-label">
                  <span className="dot dot-8" style={{ background: STATUS[s].dot }} />
                  {s}
                </span>
                <span className="mono stat-count">{n[s]}</span>
              </div>
            ))}
          </div>
          <p className="text-12 muted m0">
            {total} test case{total === 1 ? '' : 's'} in this report. Draft text saves in this browser automatically.
          </p>
        </section>
      </aside>

      <section className="editor-cases" aria-label="Test cases">
        <div className="row-between wrap">
          <div>
            <h1 className="page-title">Test cases</h1>
            <p className="page-sub">Drop screenshots or recordings on a case, or paste a screenshot while editing it.</p>
          </div>
          <button type="button" className="btn-soft" onClick={addCase}>
            <PlusIcon />
            Add test case
          </button>
        </div>

        {total === 0 && (
          <div className="empty">
            <p className="empty-title">No test cases yet</p>
            <p className="m0">Add your first case to start the report.</p>
          </div>
        )}

        {cases.map((c, i) => (
          <CaseCard
            key={c.id}
            c={c}
            num={i + 1}
            patch={(fn) => patchCase(c.id, fn)}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onDuplicate={() => duplicate(i)}
            onRemove={() => remove(c.id)}
            onFiles={(files) => addFiles(c.id, files)}
          />
        ))}

        <button type="button" className="add-another" onClick={addCase}>
          <PlusIcon />
          Add another test case
        </button>
      </section>
    </div>
  );
}
