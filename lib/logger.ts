import { getDb } from './db';
import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    module: string;
    timestamp?: string;
}

class Logger {
    private logDir: string;

    constructor() {
        this.logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    private writeToFile(entry: LogEntry): void {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}\n`;
        const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);

        try {
            fs.appendFileSync(logFile, logLine);
        } catch {
            console.error('Failed to write log file');
        }
    }

    private writeToDb(entry: LogEntry): void {
        try {
            const db = getDb();
            db.prepare(
                'INSERT INTO logs (level, message, module) VALUES (?, ?, ?)'
            ).run(entry.level, entry.message, entry.module);
        } catch {
            console.error('Failed to write log to database');
        }
    }

    log(level: LogLevel, message: string, module: string = 'system'): void {
        const entry: LogEntry = { level, message, module };
        this.writeToDb(entry);
        this.writeToFile(entry);

        if (process.env.NODE_ENV === 'development') {
            const prefix = `[${level.toUpperCase()}] [${module}]`;
            switch (level) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                default:
                    console.log(prefix, message);
            }
        }
    }

    info(message: string, module?: string): void {
        this.log('info', message, module);
    }

    warn(message: string, module?: string): void {
        this.log('warn', message, module);
    }

    error(message: string, module?: string): void {
        this.log('error', message, module);
    }

    debug(message: string, module?: string): void {
        this.log('debug', message, module);
    }
}

export const logger = new Logger();
export default logger;
