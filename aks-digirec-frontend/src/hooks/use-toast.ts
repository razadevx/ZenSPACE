import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    if (options.variant === 'destructive') {
      sonnerToast.error(options.title, {
        description: options.description
      });
    } else if (options.variant === 'success') {
      sonnerToast.success(options.title, {
        description: options.description
      });
    } else {
      sonnerToast(options.title, {
        description: options.description
      });
    }
  }, []);

  return { toast };
}
