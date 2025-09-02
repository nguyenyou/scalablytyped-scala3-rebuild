/**
 * Logging interface for the phases framework
 * Port of the Scala logging system
 */

/**
 * Generic logger interface
 */
export interface Logger<T> {
  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): T;

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): T;

  /**
   * Log an error message
   */
  error(message: string, error?: Error): T;

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): T;
}

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements Logger<void> {
  constructor(private prefix: string = '') {}

  info(message: string, ...args: any[]): void {
    console.log(`${this.prefix}[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix}[WARN] ${message}`, ...args);
  }

  error(message: string, error?: Error): void {
    if (error) {
      console.error(`${this.prefix}[ERROR] ${message}`, error);
    } else {
      console.error(`${this.prefix}[ERROR] ${message}`);
    }
  }

  debug(message: string, ...args: any[]): void {
    console.debug(`${this.prefix}[DEBUG] ${message}`, ...args);
  }
}

/**
 * No-op logger that discards all messages
 */
export class DevNullLogger implements Logger<void> {
  info(_message: string, ..._args: any[]): void {
    // Do nothing
  }

  warn(_message: string, ..._args: any[]): void {
    // Do nothing
  }

  error(_message: string, _error?: Error): void {
    // Do nothing
  }

  debug(_message: string, ..._args: any[]): void {
    // Do nothing
  }
}

/**
 * Logger that collects messages for testing
 */
export class CollectingLogger implements Logger<void> {
  private messages: Array<{ level: string; message: string; args: any[]; error?: Error }> = [];

  info(message: string, ...args: any[]): void {
    this.messages.push({ level: 'INFO', message, args });
  }

  warn(message: string, ...args: any[]): void {
    this.messages.push({ level: 'WARN', message, args });
  }

  error(message: string, error?: Error): void {
    this.messages.push({ level: 'ERROR', message, args: [], error });
  }

  debug(message: string, ...args: any[]): void {
    this.messages.push({ level: 'DEBUG', message, args });
  }

  getMessages(): Array<{ level: string; message: string; args: any[]; error?: Error }> {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  get size(): number {
    return this.messages.length;
  }
}

/**
 * Factory functions for common loggers
 */
export const Logger = {
  /**
   * Creates a console logger
   */
  Console: (prefix: string = ''): Logger<void> => new ConsoleLogger(prefix),

  /**
   * Creates a dev null logger
   */
  DevNull: (): Logger<void> => new DevNullLogger(),

  /**
   * Creates a collecting logger for testing
   */
  Collecting: (): CollectingLogger => new CollectingLogger()
};

/**
 * Custom exception for logged errors
 */
export class LoggedException extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'LoggedException';
  }
}
