import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Controlled daisyUI modal on top of <dialog>. */
export default function Modal({ open, onClose, title, children, actions, size = 'max-w-lg' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <div className={`modal-box ${size}`}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="mt-4">{children}</div>
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <form method="dialog" className="modal-backdrop"><button type="submit" onClick={onClose}>close</button></form>
    </dialog>
  );
}
