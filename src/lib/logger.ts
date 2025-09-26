// Centralized logging system for TryIt-AI Kit
// Replaces scattered console.log statements with structured logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void;
}

class CentralizedLogger implements Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = this.isDevelopment ? 'debug' : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const levelIndex = levels.indexOf(level);
    const minIndex = levels.indexOf(this.minLevel);
    return levelIndex >= minIndex;
  }

  private formatLogEntry(level: LogLevel, component: string, message: string, metadata?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      metadata
    };
  }

  private output(entry: LogEntry): void {
    const { timestamp, level, component, message, metadata } = entry;
    const prefix = `[${level.toUpperCase()}] ${component}:`;
    
    if (this.isDevelopment) {
      // Rich console output for development
      const style = this.getConsoleStyle(level);
      console.log(`%c${prefix}`, style, message, metadata || {});
    } else {
      // Structured output for production
      console.log(JSON.stringify(entry));
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #666; font-weight: normal;',
      info: 'color: #0066cc; font-weight: bold;',
      warn: 'color: #ff6600; font-weight: bold;',
      error: 'color: #cc0000; font-weight: bold; background: #ffe6e6;'
    };
    return styles[level] || styles.info;
  }

  public debug(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatLogEntry('debug', 'System', message, metadata));
    }
  }

  public info(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.output(this.formatLogEntry('info', 'System', message, metadata));
    }
  }

  public warn(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatLogEntry('warn', 'System', message, metadata));
    }
  }

  public error(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.output(this.formatLogEntry('error', 'System', message, metadata));
    }
  }

  public log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog(level)) {
      this.output(this.formatLogEntry(level, 'System', message, metadata));
    }
  }

  // Create component-specific logger
  public createComponentLogger(component: string): Logger {
    return {
      debug: (message: string, metadata?: Record<string, unknown>) => {
        if (this.shouldLog('debug')) {
          this.output(this.formatLogEntry('debug', component, message, metadata));
        }
      },
      info: (message: string, metadata?: Record<string, unknown>) => {
        if (this.shouldLog('info')) {
          this.output(this.formatLogEntry('info', component, message, metadata));
        }
      },
      warn: (message: string, metadata?: Record<string, unknown>) => {
        if (this.shouldLog('warn')) {
          this.output(this.formatLogEntry('warn', component, message, metadata));
        }
      },
      error: (message: string, metadata?: Record<string, unknown>) => {
        if (this.shouldLog('error')) {
          this.output(this.formatLogEntry('error', component, message, metadata));
        }
      },
      log: (level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
        if (this.shouldLog(level)) {
          this.output(this.formatLogEntry(level, component, message, metadata));
        }
      }
    };
  }
}

// Singleton instance
const centralizedLogger = new CentralizedLogger();

// Legacy compatibility - gradually replace console.log calls
export const log = {
  debug: (message: string, ...args: any[]) => logger.debug(message, { args }),
  info: (message: string, ...args: any[]) => logger.info(message, { args }),
  warn: (message: string, ...args: any[]) => logger.warn(message, { args }),
  error: (message: string, ...args: any[]) => logger.error(message, { args })
};

// Main logger instance for direct use
export const logger = centralizedLogger;

// Factory function for component-specific loggers
export function createLogger(component: string): Logger {
  return centralizedLogger.createComponentLogger(component);
}

// Default export for convenience
export default logger;
