import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { Attachment } from '../lib';
import { ArrowToolIcon, CloseIcon, EditIcon, RedoIcon, TextIcon, UndoIcon } from './ui';

type Pt = [number, number];
type Shape =
  | { kind: 'pen'; color: string; width: number; points: Pt[] }
  | { kind: 'arrow'; color: string; width: number; points: [Pt, Pt] }
  | { kind: 'text'; color: string; size: number; at: Pt; text: string };
type Tool = Shape['kind'];

const TOOLS: { tool: Tool; label: string; Icon: typeof EditIcon }[] = [
  { tool: 'pen', label: 'Pen', Icon: EditIcon },
  { tool: 'arrow', label: 'Arrow', Icon: ArrowToolIcon },
  { tool: 'text', label: 'Text', Icon: TextIcon },
];

// ponytail: full redraw on every pointer move; fine for screenshots, cache the base layer if huge images lag.
function draw(ctx: CanvasRenderingContext2D, img: CanvasImageSource, shapes: Shape[]) {
  ctx.drawImage(img, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of shapes) {
    ctx.strokeStyle = ctx.fillStyle = s.color;
    if (s.kind === 'text') {
      ctx.font = `600 ${s.size}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(s.text, s.at[0], s.at[1]);
      continue;
    }
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(...s.points[0]);
    s.points.forEach((p) => ctx.lineTo(...p));
    if (s.kind === 'arrow') {
      const [[x1, y1], [x2, y2]] = s.points;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = s.width * 4;
      for (const side of [-1, 1]) {
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(angle + side * Math.PI / 6), y2 - head * Math.sin(angle + side * Math.PI / 6));
      }
    }
    ctx.stroke();
  }
}

type Media = HTMLImageElement | HTMLVideoElement;
const dims = (m: Media) => (m instanceof HTMLVideoElement ? [m.videoWidth, m.videoHeight] : [m.naturalWidth, m.naturalHeight]);

// Burns the shapes into every frame by playing the video into a canvas and recording it, so it takes as long as the video.
// ponytail: real-time re-encode with MediaRecorder (slows down in a background tab); use WebCodecs if long videos need it.
function recordVideo(src: string, w: number, h: number, shapes: Shape[], onProgress: (p: number) => void, signal: AbortSignal) {
  return new Promise<Blob>((resolve, reject) => {
    const v = document.createElement('video');
    v.playsInline = true;
    v.src = src;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    // Route the sound through Web Audio so it is recorded but not played out loud.
    const ac = new AudioContext();
    const sound = ac.createMediaStreamDestination();
    ac.createMediaElementSource(v).connect(sound);
    const stream = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...sound.stream.getAudioTracks()]);
    const mimeType = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    const stop = () => {
      v.pause();
      if (rec.state !== 'inactive') rec.stop();
      else ac.close();
    };
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      ac.close();
      if (signal.aborted) reject(signal.reason);
      else resolve(new Blob(chunks, { type: rec.mimeType.split(';')[0] }));
    };
    v.onended = stop;
    v.onerror = () => {
      stop();
      reject(new Error('Could not play the video'));
    };
    signal.onabort = stop;
    const frame = () => {
      draw(ctx, v, shapes);
      onProgress(v.currentTime / v.duration);
      if (rec.state === 'recording') requestAnimationFrame(frame);
    };
    ac.resume();
    v.play().then(() => {
      if (signal.aborted) return;
      rec.start();
      frame();
    }, (e) => {
      stop();
      reject(e);
    });
  });
}

interface Props {
  a: Attachment;
  onClose: () => void;
  onSave: (src: string, type: string) => void;
}

export default function ImageEditor({ a, onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isVideo = /^video\//.test(a.type);
  const [img, setImg] = useState<Media | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [redo, setRedo] = useState<Shape[]>([]);
  const [current, setCurrent] = useState<Shape | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#F04438');
  const [size, setSize] = useState(3);
  const [textAt, setTextAt] = useState<{ at: Pt; left: number; top: number; scale: number } | null>(null);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const render = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isVideo) {
      // Shows the first frame to draw on.
      const v = document.createElement('video');
      v.muted = v.playsInline = true;
      v.preload = 'auto';
      v.onloadeddata = () => setImg(v);
      v.src = a.src;
    } else {
      const i = new Image();
      i.onload = () => setImg(i);
      i.src = a.src;
    }
  }, [a.src, isVideo]);

  useEffect(() => () => render.current?.abort(), []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!img || !cv) return;
    const [w, h] = dims(img);
    if (cv.width !== w) {
      cv.width = w;
      cv.height = h;
    }
    draw(cv.getContext('2d')!, img, current ? [...shapes, current] : shapes);
  }, [img, shapes, current]);

  // Stroke and font sizes follow the image size, so a 4K screenshot gets marks as visible as a small one.
  const unit = img ? Math.max(...dims(img)) / 500 : 1;

  const add = (s: Shape) => {
    setShapes((prev) => [...prev, s]);
    setRedo([]);
  };
  const undo = () => {
    if (!shapes.length) return;
    setRedo((r) => [...r, shapes[shapes.length - 1]]);
    setShapes((prev) => prev.slice(0, -1));
  };
  const redoLast = () => {
    if (!redo.length) return;
    setShapes((prev) => [...prev, redo[redo.length - 1]]);
    setRedo((r) => r.slice(0, -1));
  };
  const close = () => {
    if (shapes.length && !confirm('Discard your edits?')) return;
    render.current?.abort();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') close();
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoLast();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toImage = (e: MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const scale = e.currentTarget.width / r.width;
    return { at: [(e.clientX - r.left) * scale, (e.clientY - r.top) * scale] as Pt, left: e.clientX - r.left, top: e.clientY - r.top, scale };
  };

  const commitText = () => {
    if (textAt && text.trim()) add({ kind: 'text', color, size: size * unit * 5, at: textAt.at, text: text.trim() });
    setTextAt(null);
    setText('');
  };

  // Text opens on click, not pointerdown: mousedown moves focus to the page, which would blur and close a box opened earlier.
  // Clicking elsewhere while a box is open commits it (on blur) and opens a new one at the click.
  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'text') setTextAt(toImage(e));
  };

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text') return;
    const p = toImage(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const width = size * unit;
    setCurrent(tool === 'pen' ? { kind: 'pen', color, width, points: [p.at] } : { kind: 'arrow', color, width, points: [p.at, p.at] });
  };
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!current || current.kind === 'text') return;
    const { at } = toImage(e);
    setCurrent(current.kind === 'pen' ? { ...current, points: [...current.points, at] } : { ...current, points: [current.points[0], at] });
  };
  const onUp = () => {
    if (current) add(current);
    setCurrent(null);
  };

  const save = () => {
    const cv = canvasRef.current;
    if (!cv || !img) return;
    if (isVideo) {
      render.current = new AbortController();
      setProgress(0);
      recordVideo(a.src, cv.width, cv.height, shapes, setProgress, render.current.signal)
        .then((blob) => {
          const fr = new FileReader();
          fr.onload = () => onSave(String(fr.result), blob.type);
          fr.readAsDataURL(blob);
        })
        .catch((e) => {
          if (e?.name === 'AbortError') return;
          setProgress(null);
          alert('Could not save the video: ' + (e?.message || e));
        });
      return;
    }
    // Canvas can't write GIF; anything that isn't JPEG becomes PNG.
    const type = a.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    onSave(cv.toDataURL(type, 0.92), type);
  };

  return (
    <div className="img-editor" role="dialog" aria-modal="true" aria-label={`Edit ${a.name}`}>
      <div className="img-editor-bar">
        <div role="group" aria-label="Tool" className="icon-row">
          {TOOLS.map(({ tool: t, label, Icon }) => (
            <button key={t} type="button" className="icon-btn" aria-label={label} title={label} aria-pressed={tool === t} onClick={() => setTool(t)}>
              <Icon />
            </button>
          ))}
        </div>
        <input type="color" aria-label="Color" title="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <label className="img-editor-size">
          Size
          <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <div className="icon-row">
          <button type="button" className="icon-btn" aria-label="Undo" title="Undo" disabled={!shapes.length} onClick={undo}>
            <UndoIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Redo" title="Redo" disabled={!redo.length} onClick={redoLast}>
            <RedoIcon />
          </button>
        </div>
        <div className="btn-group img-editor-end">
          <button type="button" className="btn-sm" onClick={close}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!img || progress !== null} onClick={save}>
            {progress === null ? 'Save' : `Rendering ${Math.round(progress * 100)}%`}
          </button>
          <button type="button" className="icon-btn" aria-label="Close editor" title="Close" onClick={close}>
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="img-editor-stage">
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ cursor: tool === 'text' ? 'text' : 'crosshair' }}
            onClick={onClick}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {textAt && (
            <input
              autoFocus
              className="img-editor-text"
              aria-label="Text to add"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitText();
                if (e.key === 'Escape') {
                  setTextAt(null);
                  setText('');
                }
              }}
              style={{ left: textAt.left, top: textAt.top, color, fontSize: (size * unit * 5) / textAt.scale }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
