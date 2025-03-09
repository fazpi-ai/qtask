/**
 * Supported log levels
 */
export type LogLevel = 'silent' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Class for handling logs with different levels
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;

  /**
   * Constructor
   * @param level Log level
   * @param prefix Prefix for log messages
   */
  constructor(level: LogLevel = 'info', prefix: string = '') {
    this.level = level;
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  /**
   * Gets the current log level
   */
  get logLevel(): LogLevel {
    return this.level;
  }

  /**
   * Debug level log
   * @param message Message to log
   */
  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.debug(`${this.prefix}${message}`);
    }
  }

  /**
   * Info level log
   * @param message Message to log
   */
  info(message: string): void {
    if (this.shouldLog('info')) {
      console.info(`${this.prefix}${message}`);
    }
  }

  /**
   * Warning level log
   * @param message Message to log
   */
  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.prefix}${message}`);
    }
  }

  /**
   * Error level log
   * @param message Message to log
   */
  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(`${this.prefix}${message}`);
    }
  }

  /**
   * Determines if a message should be logged based on the configured level
   * @param level Log level to check
   * @returns true if the message should be logged, false otherwise
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.level === 'silent') return false;
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    
    return targetLevelIndex >= currentLevelIndex;
  }
} 