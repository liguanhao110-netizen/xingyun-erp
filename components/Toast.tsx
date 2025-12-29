import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto dismiss after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  const icons = {
    success: 'fas fa-check-circle text-emerald-500',
    error: 'fas fa-exclamation-circle text-rose-500',
    info: 'fas fa-info-circle text-blue-500'
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
      <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border ${styles[type]} min-w-[300px] justify-center backdrop-blur-sm bg-opacity-95`}>
        <i className={`${icons[type]} text-lg`}></i>
        <span className="font-bold text-sm tracking-wide">{message}</span>
      </div>
    </div>
  );
};