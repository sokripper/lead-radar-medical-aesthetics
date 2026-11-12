"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export default function DirectoryDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="directory-edit-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label={`关闭${title}弹窗`}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
