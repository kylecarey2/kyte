import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import ToastContainer from "./ToastContainer";

export type ToastType = "success" | "error"; // add warning / info later on if needed

export type ToastItem = {
  id: string;
  content: ReactNode;
  duration?: number;
  closable?: boolean;
  type?: ToastType;
};

type AddToastOptions = {
  duration?: number;
  closable?: boolean;
  type?: ToastType;
};

type ToastContextValue = {
  addToast: (content: ReactNode, options?: AddToastOptions) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

type ToastProviderProps = {
  children: ReactNode;
};

function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  // Remove a toast by its id
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Add a toast with optional duration and closable flag
  const addToast = useCallback(
    (content: ReactNode, options?: AddToastOptions) => {
      counterRef.current += 1;
      const id = `toast-${Date.now()}-${counterRef.current}`;

      setToasts((prev) => [
        ...prev,
        {
          id,
          content,
          duration: options?.duration,
          closable: options?.closable,
          type: options?.type,
        },
      ]);
    },
    [],
  );

  // Provide the addToast and removeToast functions to the context
  const value = useMemo(
    () => ({
      addToast,
      removeToast,
    }),
    [addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

export default ToastProvider;
