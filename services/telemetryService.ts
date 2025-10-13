

const isTelemetryEnabled = true; // Could be controlled by a setting

const sanitizePayload = (payload: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const value = payload[key];
            // Truncate long strings to avoid polluting the console (e.g., base64 data)
            if (typeof value === 'string' && value.length > 500) {
                sanitized[key] = `${value.substring(0, 100)}... (truncated)`;
            } else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
};


export const logEvent = (eventName: string, payload: Record<string, any> = {}) => {
  if (!isTelemetryEnabled) return;

  console.log(
    `%c[TELEMETRY EVENT]%c ${eventName}`,
    'color: #84cc16; font-weight: bold;',
    'color: inherit;',
    sanitizePayload(payload)
  );
};

export const logError = (error: Error, context: Record<string, any> = {}) => {
  if (!isTelemetryEnabled) return;

  console.error(
    `%c[TELEMETRY ERROR]%c ${error.message}`,
    'color: #ef4444; font-weight: bold;',
    'color: inherit;',
    {
      error,
      context: sanitizePayload(context),
      stack: error.stack,
    }
  );
};

export const measurePerformance = async <T>(
  metricName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await operation();
    const end = performance.now();
    const duration = end - start;

    if (isTelemetryEnabled) {
      console.log(
        `%c[TELEMETRY PERF]%c ${metricName}`,
        'color: #3b82f6; font-weight: bold;',
        'color: inherit;',
        { duration: `${duration.toFixed(2)}ms` }
      );
    }
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
     if (isTelemetryEnabled) {
        console.warn(
          `%c[TELEMETRY PERF FAILED]%c ${metricName}`,
          'color: #f97316; font-weight: bold;',
          'color: inherit;',
          { duration: `${duration.toFixed(2)}ms`, error }
        );
      }
    throw error;
  }
};