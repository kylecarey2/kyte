import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ToastType } from "./ToastProvider";

type ToastProps = {
  id: string;
  children: ReactNode;
  duration?: number;
  closable?: boolean;
  onClose: (id: string) => void;
  type?: ToastType;
};

const CLOSE_ANIMATION_MS = 150;

function Toast({
  id,
  children,
  duration,
  closable,
  onClose,
  type,
}: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);
    removeTimerRef.current = setTimeout(() => {
      onClose(id);
    }, CLOSE_ANIMATION_MS);
  }, [id, isClosing, onClose]);

  // Close the toast after the duration if specified
  useEffect(() => {
    if (!duration) return;

    const timer = setTimeout(() => {
      requestClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, requestClose]);

  useEffect(() => {
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  // Render the toast icon based on the type
  const toastIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5 text-primary select-none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5 text-error select-none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-bg shadow-md border-2 border-border text-text-secondary p-2 rounded flex flex-row items-center gap-2 max-w-lg min-w-sm transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
    >
      {toastIcon()}
      <div className="flex-1">{children}</div>
      {closable && (
        <div
          onClick={requestClose}
          className="bg-transparent leading-none hover:bg-hover p-1 rounded flex items-center cursor-pointer"
          aria-label="Close message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="size-5 text-text-muted select-none"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default Toast;
