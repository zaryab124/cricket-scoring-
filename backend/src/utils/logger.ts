import winston from 'winston';
import { config } from '../config/env.js';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const sanitizeLog = winston.format((info) => {
  const sanitizeValue = (val: any): any => {
    if (typeof val === 'string') {
      return val
        .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED]')
        .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"')
        .replace(/"passwordHash"\s*:\s*"[^"]+"/gi, '"passwordHash":"[REDACTED]"')
        .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[REDACTED]"')
        .replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"[REDACTED]"');
    }
    if (val && typeof val === 'object') {
      const sanitized: any = Array.isArray(val) ? [] : {};
      for (const [key, value] of Object.entries(val)) {
        if (['password', 'passwordHash', 'token', 'refreshToken', 'secret'].includes(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeValue(value);
        }
      }
      return sanitized;
    }
    return val;
  };

  if (typeof info.message === 'string') {
    info.message = sanitizeValue(info.message);
  }
  return info;
});

const format = winston.format.combine(
  sanitizeLog(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `[${info.timestamp}] [${info.level}]: ${info.message}`)
);

const transports = [
  new winston.transports.Console(),
];

export const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});
