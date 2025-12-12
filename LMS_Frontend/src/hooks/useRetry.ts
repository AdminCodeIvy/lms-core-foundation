import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

export const useRetry = (options: UseRetryOptions = {}) => {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> => {
    setIsRetrying(true);
    setAttempts(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setAttempts(attempt);
        const result = await fn();
        setIsRetrying(false);
        setAttempts(0);
        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        
        if (onError) {
          onError(error as Error, attempt);
        }

        if (isLastAttempt) {
          setIsRetrying(false);
          setAttempts(0);
          throw error;
        }

        // Wait before retrying
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    setIsRetrying(false);
    setAttempts(0);
    throw new Error('Max retry attempts reached');
  }, [maxAttempts, delay, backoff]);

  return { retry, isRetrying, attempts };
};