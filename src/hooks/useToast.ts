import { useCallback } from 'react';
import { toast } from 'react-toastify';

export const useToast = () => {
  const showSuccess = useCallback((message: string) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }, []);

  const showError = useCallback((message: string) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }, []);

  const showWarning = useCallback((message: string) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }, []);

  const showInfo = useCallback((message: string) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
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
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showErrorFromResponse,
  };
};
