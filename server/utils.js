/**
 * Generic retry mechanism with exponential backoff.
 * Handles transient errors like 429 (Rate Limit), 503 (Service Unavailable),
 * and network timeouts (ETIMEDOUT).
 */
export const retryWithBackoff = async (fn, maxRetries = 6, initialDelay = 5000) => {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const errorStr = (JSON.stringify(error) || '').toLowerCase() + (error.message || '').toLowerCase() + (error.stack || '').toLowerCase();
      
      // 1. Detection of transient errors
      const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        errorStr.includes('429') || 
        errorStr.includes('too many requests') ||
        errorStr.includes('exhausted') || 
        errorStr.includes('quota');

      const isTransientNetwork = 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        errorStr.includes('etimedout') ||
        errorStr.includes('econnreset') ||
        errorStr.includes('fetch failed') ||
        errorStr.includes('network error') ||
        errorStr.includes('pineconeconnectionerror');

      const isServerError = 
        error.status >= 500 || 
        errorStr.includes('500') ||
        errorStr.includes('502') ||
        errorStr.includes('503') ||
        errorStr.includes('504');

      const shouldRetry = (isRateLimit || isTransientNetwork || isServerError) && (i < maxRetries - 1);

      if (shouldRetry) {
        let waitTime = delay;
        
        // Try to extract specific retryDelay if available (e.g. from Google/Gemini/Groq)
        try {
          const match = errorStr.match(/"retrydelay":"(\d+)s"/);
          if (match && match[1]) {
            waitTime = (parseInt(match[1]) + 2) * 1000;
          }
        } catch (e) {
          // ignore parsing error
        }

        console.warn(`[Retry] Attempt ${i + 2}/${maxRetries} following error: ${error.message || 'Unknown error'}. Waiting ${waitTime}ms...`);
        await new Promise(res => setTimeout(res, waitTime));
        delay *= 2; // Exponential backoff
        continue;
      }

      // If we shouldn't retry, rethrow the error
      throw error;
    }
  }
};
