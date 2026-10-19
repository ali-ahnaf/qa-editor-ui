import { useState } from 'react';
import { STATUS, STATUS_ORDER, fileSize, type Attachment, type TestCase } from '../lib';
import ImageEditor from './ImageEditor';
import {
  ArrowDownIcon, ArrowUpIcon, Badge, ChevronIcon, CloseIcon, CopyIcon, EditIcon, FilePicker, ImageIcon, TrashIcon,
} from './ui';

interface Props {
  c: TestCase;
  num: number;
  patch: (fn: (c: TestCase) => Partial<TestCase>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onFiles: (files: FileList) => void;
}

type TextKey = 'caseId' | 'title' | 'steps' | 'expected' | 'actual' | 'notes';

export default function CaseCard({ c, num, patch, onMoveUp, onMoveDown, onDuplicate, onRemove, onFiles }: Props) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<Attachment | null>(null);
  const field = (k: TextKey) => ({
    value: c[k],
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      patch(() => ({ [k]: v }));
    },
  });

  return (
    <article
      className="card case"
      onPaste={(e) => {
        if (e.clipboardData.files.length) {
          e.preventDefault();
          onFiles(e.clipboardData.files);
        }
      }}
    >
      <div className="case-head" style={{ borderBottomColor: c.open ? '#EAECF0' : 'transparent' }}>
        <span className="mono case-num">{String(num).padStart(2, '0')}</span>
        <input type="text" aria-label="Test case ID" placeholder="TC-01" className="mono case-id" {...field('caseId')} />
        <input type="text" aria-label="Test case title" placeholder="Describe what this case verifies" className="case-title" {...field('title')} />
        <Badge status={c.status} />
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Move up" title="Move up" onClick={onMoveUp}>
            <ArrowUpIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Move down" title="Move down" onClick={onMoveDown}>
            <ArrowDownIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={onDuplicate}>
            <CopyIcon />
          </button>
          <button type="button" className="icon-btn danger" aria-label="Delete test case" title="Delete" onClick={onRemove}>
            <TrashIcon />
          </button>
          <button
            type="button"
            className="icon-btn toggle"
            aria-label={c.open ? 'Collapse' : 'Expand'}
            aria-expanded={c.open}
            title={c.open ? 'Collapse' : 'Expand'}
            onClick={() => patch((x) => ({ open: !x.open }))}
          >
            <ChevronIcon style={{ transform: `rotate(${c.open ? 180 : 0}deg)` }} />
          </button>
        </div>
      </div>

      {c.open && (
        <div className="case-body">
          <div role="group" aria-label="Status" className="status-opts">
            {STATUS_ORDER.map((name) => {
              const on = c.status === name;
              const s = STATUS[name];
              return (
                <button
                  key={name}
                  type="button"
                  className="status-opt"
                  aria-pressed={on}
                  onClick={() => patch(() => ({ status: name }))}
                  style={{ borderColor: on ? s.dot : '#E4E7EC', background: on ? s.bg : '#FFFFFF', color: on ? s.fg : '#475467' }}
                >
                  <span className="dot" style={{ background: s.dot }} />
                  {name}
                </button>
              );
            })}
          </div>

          <div className="field">
            <label htmlFor={`steps-${c.id}`} className="label">
              Steps to reproduce <span className="label-hint">(one per line)</span>
            </label>
            <textarea
              id={`steps-${c.id}`}
              rows={4}
              className="input"
              style={{ lineHeight: 1.55 }}
              placeholder={'Open the login page\nEnter valid credentials\nClick Sign in'}
              {...field('steps')}
            />
          </div>

          <div className="grid-fit-240">
            <div className="field">
              <label htmlFor={`exp-${c.id}`} className="label">Expected result</label>
              <textarea id={`exp-${c.id}`} rows={3} className="input" placeholder="What should happen" {...field('expected')} />
            </div>
            <div className="field">
              <label htmlFor={`act-${c.id}`} className="label">Actual result</label>
              <textarea id={`act-${c.id}`} rows={3} className="input" placeholder="What actually happened" {...field('actual')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor={`notes-${c.id}`} className="label">Notes</label>
            <textarea id={`notes-${c.id}`} rows={2} className="input" placeholder="Logs, linked bugs, device details" {...field('notes')} />
          </div>

          <div className="field" style={{ gap: 10 }}>
            <span className="label">Attachments</span>
            <div
              className={'dropzone' + (dragging ? ' active' : '')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFiles(e.dataTransfer.files);
              }}
            >
              <ImageIcon size={22} strokeWidth={1.8} stroke="#475467" />
              <span className="muted text-13">Drag images or videos here, paste a screenshot, or</span>
              <FilePicker className="btn-sm" accept="image/*,video/*" multiple onFiles={onFiles}>
                Browse files
              </FilePicker>
            </div>

            {c.attachments.length > 0 && (
              <div className="thumbs">
                {c.attachments.map((a) => {
                  const ready = !!a.src && !a.loading;
                  const isVideo = /^video\//.test(a.type);
                  return (
                    <figure key={a.id} className="thumb">
                      <div className="thumb-media">
                        {ready && !isVideo && <img src={a.src} alt={a.name} />}
                        {ready && isVideo && <video src={a.src} controls muted />}
                        {!ready && <span className="thumb-pending">{a.loading ? 'Processing...' : 'Re-attach file'}</span>}
                      </div>
                      <figcaption className="thumb-caption">
                        <span className="thumb-text">
                          <span className="thumb-name">{a.name}</span>
                          <span className="thumb-meta">{(isVideo ? 'Video' : 'Image') + ' · ' + fileSize(a.size)}</span>
                        </span>
                        {ready && (
                          <button
                            type="button"
                            className="icon-btn icon-btn-sm thumb-edit"
                            aria-label={`Edit ${a.name}`}
                            title="Edit"
                            onClick={() => setEditing(a)}
                          >
                            <EditIcon size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-btn icon-btn-sm"
                          aria-label={`Remove ${a.name}`}
                          onClick={() => patch((x) => ({ attachments: x.attachments.filter((y) => y.id !== a.id) }))}
                        >
                          <CloseIcon size={14} />
                        </button>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <ImageEditor
          a={editing}
          onClose={() => setEditing(null)}
          onSave={(src, type) => {
            const ext = '.' + (type === 'image/jpeg' ? 'jpg' : type.split('/')[1]);
            patch((x) => ({
              attachments: x.attachments.map((y) =>
                y.id === editing.id
                  ? { ...y, src, type, name: type === y.type ? y.name : y.name.replace(/\.[^.]*$/, '') + ext, size: Math.round(((src.length - src.indexOf(',') - 1) * 3) / 4) }
                  : y,
              ),
            }));
            setEditing(null);
          }}
        />
      )}
    </article>
  );
}
