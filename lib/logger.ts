import * as winston from 'winston';
import { LOG_LEVEL } from './config';

export const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			handleExceptions: true,
		}),
	],
	level: LOG_LEVEL,
	format: winston.format.cli(),
	exitOnError: true,
});
