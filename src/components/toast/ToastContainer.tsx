import Toast from "./Toast";
import { ToastItem } from "./ToastProvider";

type ToastContainerProps = {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
};

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  // Map toasts to render them all in a container
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          duration={toast.duration}
          closable={toast.closable}
          type={toast.type}
          onClose={removeToast}
        >
          {toast.content}
        </Toast>
      ))}
    </div>
  );
}

export default ToastContainer;
