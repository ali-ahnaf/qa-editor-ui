import { useState } from 'react';
import { IMPORT_ACCEPT, type Block, type Imported } from '../lib';
import { FileIcon, FilePicker, ImageIcon } from './ui';
import ReportView from './ReportView';

interface Props {
  imported: Imported | null;
  onImport: (file: File | undefined) => void;
  onEdit: () => void;
  onClose: () => void;
}

export default function Viewer({ imported, onImport, onEdit, onClose }: Props) {
  const [dragging, setDragging] = useState(false);

  if (!imported) {
    return (
      <div
        className={'import-drop' + (dragging ? ' active' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onImport(e.dataTransfer.files[0]);
        }}
      >
        <div className="import-icon">
          <FileIcon size={24} strokeWidth={1.8} lines />
        </div>
        <h1 className="page-title" style={{ fontSize: 18, letterSpacing: 0 }}>Open a Markdown or HTML file</h1>
        <p className="muted m0" style={{ maxWidth: 440 }}>
          Drop a .md or .html file here to read it. Reports exported from this editor open fully, including embedded
          media, and can be edited again.
        </p>
        <FilePicker className="btn-choose" accept={IMPORT_ACCEPT} onFiles={(f) => onImport(f[0])}>
          Choose file
        </FilePicker>
      </div>
    );
  }

  return (
    <>
      <div className="import-bar">
        <span className="import-name">
          <FileIcon />
          <span className="ellipsis" style={{ fontWeight: 600 }}>{imported.name}</span>
          <span style={{ color: '#667085' }}>{imported.kind}</span>
        </span>
        <span className="btn-group">
          {imported.isReport && (
            <button type="button" className="btn btn-primary" onClick={onEdit}>Open in editor</button>
          )}
          <button type="button" className="btn" onClick={onClose}>Close file</button>
        </span>
      </div>
      {imported.isReport ? (
        <ReportView report={imported.report} cases={imported.cases} />
      ) : (
        <article className="card doc" style={{ gap: 10 }}>
          {imported.blocks.map((b, i) => (
            <div key={i} style={{ minWidth: 0 }}>
              <BlockView b={b} />
            </div>
          ))}
        </article>
      )}
    </>
  );
}

function BlockView({ b }: { b: Block }) {
  const text = b.text || (b.kind === 'img' ? 'Image' : '');
  switch (b.kind) {
    case 'h1': return <h1 className="doc-h1">{text}</h1>;
    case 'h2': return <h2 className="doc-h2">{text}</h2>;
    case 'h3': return <h3 className="doc-h3">{text}</h3>;
    case 'p': return <p className="pre-line m0" style={{ color: '#344054' }}>{text}</p>;
    case 'quote': return <p className="doc-quote">{text}</p>;
    case 'code': return <pre className="doc-code mono">{text}</pre>;
    case 'hr': return <hr className="doc-hr" />;
    case 'li':
      return (
        <div className="doc-li">
          <span className="doc-marker">{b.marker}</span>
          <span>{text}</span>
        </div>
      );
    case 'row': {
      const cells = b.cells || [];
      return (
        <div style={{ overflowX: 'auto' }}>
          <div
            className="doc-row"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, cells.length)}, minmax(110px, 1fr))`,
              background: b.header ? '#F9FAFB' : '#FFFFFF',
              fontWeight: b.header ? 600 : 400,
            }}
          >
            {cells.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        </div>
      );
    }
    case 'img':
    case 'video': {
      // Only embedded data URLs render; external links from an imported file are not fetched.
      if (!/^data:(image|video)\//.test(b.src || '')) {
        return (
          <div className="doc-missing">
            <ImageIcon />
            Linked file not embedded: {text || b.src}
          </div>
        );
      }
      return b.kind === 'img' ? (
        <figure className="m0">
          <img src={b.src} alt={text} className="doc-img" />
          <figcaption className="doc-caption">{text}</figcaption>
        </figure>
      ) : (
        <video src={b.src} controls className="doc-video" />
      );
    }
  }
}
