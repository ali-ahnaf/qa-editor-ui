export default function MarkdownView({ markdown, onCopy, onDownload }: { markdown: string; onCopy: () => void; onDownload: () => void }) {
  return (
    <div className="narrow stack-12">
      <div className="row-between wrap">
        <div>
          <h1 className="page-title" style={{ fontSize: 18, letterSpacing: 0 }}>Markdown for Jira</h1>
          <p className="page-sub">
            Paste into a Jira comment. Upload the listed files to the ticket so image and video references resolve.
          </p>
        </div>
        <span className="btn-group">
          <button type="button" className="btn" onClick={onCopy}>Copy</button>
          <button type="button" className="btn btn-primary" onClick={onDownload}>Download .md</button>
        </span>
      </div>
      <label htmlFor="md-out" className="sr-only">Generated Markdown</label>
      <textarea id="md-out" readOnly value={markdown} rows={28} className="md-out mono" />
    </div>
  );
}
