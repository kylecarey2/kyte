import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 bg-opacity-50 flex justify-center z-50 mt-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg p-6 rounded-lg shadow-lg max-w-lg m-20 w-full h-fit border-2 border-border"
      >
        <div>{children}</div>
      </div>
    </div>,
    document.body, // Append modal to body
  );
}

export default Modal;
