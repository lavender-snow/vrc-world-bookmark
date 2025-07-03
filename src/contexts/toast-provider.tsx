import React, { createContext, useContext, useState } from 'react';

import { NoticeType } from 'src/consts/const';
import { ToastList } from 'src/utils/toast-list';

type ToastContext = {
  addToast?: (message: string, type?: NoticeType) => void;
};

interface toast {
  id: string;
  message: string;
  noticeType: NoticeType;
}

const ToastContext = createContext<ToastContext>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<toast[]>([]);

  function addToast(message: string, type: NoticeType = NoticeType.info) {
    setToasts(toasts => [...toasts, { id: crypto.randomUUID(), message, noticeType: type }]);
  };

  function removeToast(id: string) {
    setToasts(toasts => toasts.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastList toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
