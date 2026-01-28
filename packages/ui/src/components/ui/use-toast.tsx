"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastCount = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryToasts: Toast[] = [];

function dispatch(toasts: Toast[]) {
  memoryToasts = toasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast({
  title,
  description,
  variant = "default",
}: Omit<Toast, "id">) {
  const id = String(++toastCount);
  const newToast: Toast = { id, title, description, variant };

  dispatch([...memoryToasts, newToast]);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dispatch(memoryToasts.filter((t) => t.id !== id));
  }, 5000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useState(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  });

  return {
    toasts,
    toast,
    dismiss: useCallback((id: string) => {
      dispatch(memoryToasts.filter((t) => t.id !== id));
    }, []),
  };
}
