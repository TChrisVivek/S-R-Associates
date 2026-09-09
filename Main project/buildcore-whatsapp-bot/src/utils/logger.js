const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
            return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`;
        })
    ),
    transports: [
        // Console output with colors
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({ format: 'HH:mm:ss' }),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            )
        }),
        // File output for all logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/bot.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 3
        }),
        // Separate file for errors only
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/bot-errors.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3
        })
    ]
});

module.exports = logger;
