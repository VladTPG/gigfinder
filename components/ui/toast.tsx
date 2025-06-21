"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  duration?: number;
  onClose?: () => void;
  show: boolean;
}

export function Toast({ message, type = "info", duration = 5000, onClose, show }: ToastProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    info: "bg-blue-600 border-blue-500",
    success: "bg-green-600 border-green-500",
    warning: "bg-yellow-600 border-yellow-500",
    error: "bg-red-600 border-red-500",
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-white max-w-sm",
          typeStyles[type]
        )}
      >
        <MessageCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastManagerProps {
  children: React.ReactNode;
}

export function ToastManager({ children }: ToastManagerProps) {
  return (
    <>
      {children}
      <div id="toast-container" />
    </>
  );
} 