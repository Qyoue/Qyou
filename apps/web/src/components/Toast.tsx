import React from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span>{message}</span>
      {onClose && <button onClick={onClose}>×</button>}
    </div>
  );
}
