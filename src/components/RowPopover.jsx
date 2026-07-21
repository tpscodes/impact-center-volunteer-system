import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./RowPopover.css";

export default function RowPopover({ open, rect, options, onClose }) {
  const el = useRef(null);

  useEffect(() => {
    if (!open || !rect || !el.current) return;
    el.current.style.top = `${rect.bottom + 6}px`;
    el.current.style.left = `${Math.max(8, rect.right - 210)}px`;
  }, [open, rect]);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open, onClose]);

  return createPortal(
    <div
      ref={el}
      className={`rp${open ? " rp--open" : ""}`}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          role="menuitem"
          className={`rp__option${opt.danger ? " rp__option--danger" : ""}`}
          onClick={() => { opt.onClick(); onClose(); }}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
