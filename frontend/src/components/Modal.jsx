import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ title, onClose, children, size = 'medium' }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} title="Cerrar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
