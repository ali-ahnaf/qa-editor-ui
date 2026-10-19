import { useEffect, useRef, useState } from 'react';
import type { ChatResult } from '../lib';
import { ChatIcon, CloseIcon } from './ui';

interface Message { role: 'user' | 'assistant'; text: string }

interface Props {
  markdown: () => string;
  onResult: (result: ChatResult) => void;
}

/** Floating button that opens a chat with Claude. Cases, edits and removals Claude returns are applied to the report. */
export default function ChatFab({ markdown, onResult }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    // Keep the request small: the last 20 messages are enough context.
    const next = [...messages, { role: 'user' as const, text }].slice(-20);
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next, markdown: markdown() }),
      });
      const data = await res.json().catch(() => ({ error: 'The chat server is not running. Start it with npm start.' }));
      if (!res.ok) throw new Error(data.error);
      const pick = (v: unknown) => (Array.isArray(v) ? v : []);
      const result = { cases: pick(data.cases), edits: pick(data.edits), remove: pick(data.remove) };
      if (result.cases.length || result.edits.length || result.remove.length) onResult(result);
      setMessages((m) => [...m, { role: 'assistant', text: String(data.reply || '') }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Error: ' + (e instanceof Error ? e.message : 'Chat failed') }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="fab" aria-label="Open chat with Claude" title="Chat with Claude" onClick={() => dialog.current?.showModal()}>
        <ChatIcon size={22} />
      </button>
      <dialog
        ref={dialog}
        className="chat"
        aria-labelledby="chat-title"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="chat-head">
          <h2 id="chat-title" className="panel-title">Chat with Claude</h2>
          <button type="button" className="icon-btn icon-btn-sm" aria-label="Close chat" onClick={() => dialog.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        <div ref={log} className="chat-log" aria-live="polite">
          {!messages.length && (
            <p className="text-13 muted m0">Paste test cases in any format and ask Claude to add them, or ask it to edit or remove cases and report fields.</p>
          )}
          {messages.map((m, i) => (
            <p key={i} className={'chat-msg pre-line ' + m.role}>{m.text}</p>
          ))}
          {busy && <p className="chat-msg assistant muted">Thinking...</p>}
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            className="input"
            rows={3}
            aria-label="Message"
            placeholder="Paste test cases and say: add these to the report"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
        </form>
      </dialog>
    </>
  );
}
