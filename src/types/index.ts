export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  message: string;
}
