import { counts, overall, splitSteps, statusColors, ticketKey, ticketUrl, type Report, type TestCase } from '../lib';
import { Badge } from './ui';

/** Read-only rendering of a report, used by the Preview tab and for imported QA reports. */
export default function ReportView({ report, cases }: { report: Report; cases: TestCase[] }) {
  const failed = counts(cases).Failed;
  const meta = (
    [['Ticket', report.ticket], ['Environment', report.env], ['Tested by', report.tester], ['Date', report.date]] as const
  ).filter(([, v]) => v);

  return (
    <article className="card doc report">
      <header className="report-head">
        <span className="eyebrow">QA test report</span>
        <div className="row-between wrap" style={{ alignItems: 'flex-start', gap: 16 }}>
          <h1 className="report-title">{report.title || 'Untitled report'}</h1>
          <Badge status={overall(cases)} size="lg" />
        </div>
        <dl className="meta">
          {meta.map(([label, value]) => {
            const href = label === 'Ticket' ? ticketUrl(value) : '';
            return (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">{ticketKey(value)}</a>
                  ) : (
                    <span>{label === 'Ticket' ? ticketKey(value) : value}</span>
                  )}
                </dd>
              </div>
            );
          })}
          <div>
            <dt>Test cases</dt>
            <dd>{cases.length + (failed ? ` (${failed} failed)` : '')}</dd>
          </div>
        </dl>
      </header>

      {report.summary?.trim() && (
        <section>
          <h2 className="section-title" style={{ marginBottom: 6 }}>Summary</h2>
          <p className="pre-line m0" style={{ color: '#344054' }}>{report.summary.trim()}</p>
        </section>
      )}

      <section>
        <h2 className="section-title" style={{ marginBottom: 10 }}>Results overview</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Test case</th>
                <th>Status</th>
                <th>Files</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td className="mono muted">{c.caseId || '-'}</td>
                  <td>{c.title || 'Untitled test case'}</td>
                  <td><Badge status={c.status} size="sm" /></td>
                  <td className="muted">{c.attachments.length || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cases.map((c) => {
        const steps = splitSteps(c.steps);
        const expected = c.expected?.trim();
        const actual = c.actual?.trim();
        const notes = c.notes?.trim();
        return (
          <section key={c.id} className="report-case">
            <div className="report-case-head">
              <span className="mono id-chip">{c.caseId || '-'}</span>
              <h3 className="report-case-title">{c.title || 'Untitled test case'}</h3>
              <Badge status={c.status} />
            </div>
            {steps.length > 0 && (
              <div>
                <h4 className="kicker">Steps</h4>
                <ol className="steps">
                  {steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}
            <div className="grid-fit-220">
              {expected && (
                <div className="box">
                  <h4 className="kicker">Expected</h4>
                  <p className="pre-line m0">{expected}</p>
                </div>
              )}
              {actual && (
                <div className="box" style={{ background: statusColors(c.status).soft }}>
                  <h4 className="kicker">Actual</h4>
                  <p className="pre-line m0">{actual}</p>
                </div>
              )}
            </div>
            {notes && (
              <p className="pre-line m0 muted">
                <strong style={{ color: '#344054', fontWeight: 600 }}>Notes: </strong>
                {notes}
              </p>
            )}
            {c.attachments.length > 0 && (
              <div className="media">
                {c.attachments.map((a) => {
                  const ready = !!a.src && !a.loading;
                  return (
                    <figure key={a.id} className="media-item">
                      {ready && /^image\//.test(a.type) && <img src={a.src} alt={a.name} />}
                      {ready && /^video\//.test(a.type) && <video src={a.src} controls />}
                      {!ready && (
                        <div className="media-pending">
                          {a.loading ? 'Processing...' : 'Not embedded. Re-attach to include it.'}
                        </div>
                      )}
                      <figcaption>{a.name}</figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </article>
  );
}
