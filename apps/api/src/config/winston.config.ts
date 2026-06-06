import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

export const winstonConfig = (config: ConfigService) => {
  const isProduction = config.get('NODE_ENV') === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ level, message, timestamp, context }) =>
                `${timestamp} [${context ?? 'App'}] ${level}: ${message}`,
            ),
          ),
    }),
  ];

  return {
    transports,
    level: isProduction ? 'info' : 'debug',
  };
};
