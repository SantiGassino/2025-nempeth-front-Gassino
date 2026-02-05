import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Toast';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );

  const showError = useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast],
  );

  const showWarning = useCallback(
    (message: string) => {
      showToast(message, 'warning');
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast(message, 'info');
    },
    [showToast],
  );

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Función helper para extraer mensaje de error del backend
  const showErrorFromResponse = useCallback(
    (error: unknown, defaultMessage = 'Ha ocurrido un error inesperado') => {
      let errorMessage = defaultMessage;

      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;

        if (err.response && typeof err.response === 'object') {
          const response = err.response as Record<string, unknown>;

          if (response.data && typeof response.data === 'object') {
            const data = response.data as Record<string, unknown>;

            if (typeof data.error === 'string') {
              // Error del backend con formato { error: "mensaje" }
              errorMessage = data.error;
            } else if (typeof data.message === 'string') {
              // Error del backend con formato { message: "mensaje" }
              errorMessage = data.message;
            }
          }
        } else if (typeof err.message === 'string') {
          // Error de JavaScript/TypeScript
          errorMessage = err.message;
        }
      } else if (typeof error === 'string') {
        // Error como string directo
        errorMessage = error;
      }

      showError(errorMessage);
    },
    [showError],
  );

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showErrorFromResponse,
    hideToast,
  };
};
