import { logger } from './logger';

/**
 * Determine whether an error message indicates a transient network issue.
 */
export function isNetworkError(message: string): boolean {
  const patterns = [
    'fetch', 'network', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
    'ENOTFOUND', 'timeout', 'socket hang up', 'EAI_AGAIN',
    'EHOSTUNREACH', 'EPIPE', 'request to', 'getaddrinfo',
  ];
  const lower = message.toLowerCase();
  return patterns.some(p => lower.includes(p.toLowerCase()));
}

/**
 * Retry a network operation with exponential backoff.
 * Only retries on transient network errors; non-network errors are thrown immediately.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  initialDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        logger.info(`Retry ${attempt}/${maxRetries} for ${operationName} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return await operation();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(msg);

      if (!isNetworkError(msg)) {
        // Non-network error — do not retry
        throw error;
      }

      if (attempt < maxRetries) {
        logger.warn(`Network error in ${operationName} (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`);
      }
    }
  }

  throw lastError;
}
