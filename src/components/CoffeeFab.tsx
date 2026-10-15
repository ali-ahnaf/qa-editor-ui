import { useRef } from 'react';
import { CloseIcon, CoffeeIcon } from './ui';

/** Button pinned to the right edge that opens a bKash QR code for tips. Images live in public/. */
export default function CoffeeFab() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className="coffee-fab" aria-label="Buy me a coffee" title="Buy me a coffee" onClick={() => dialog.current?.showModal()}>
        <CoffeeIcon size={20} />
      </button>
      <dialog
        ref={dialog}
        className="coffee"
        aria-labelledby="coffee-title"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="chat-head">
          <h2 id="coffee-title" className="panel-title">Buy me a coffee</h2>
          <button type="button" className="icon-btn icon-btn-sm" aria-label="Close" onClick={() => dialog.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        <div className="coffee-body">
          <img src="/logo.png" alt="bKash" className="coffee-logo" />
          <img src="/aliahnaf327-qr.png" alt="bKash payment QR code" className="coffee-qr" />
          <p className="text-13 muted m0">Scan with camera app.</p>
        </div>
      </dialog>
    </>
  );
}
