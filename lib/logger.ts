import * as winston from 'winston';

export const logger = winston.createLogger({
	transports: [
		new winston.transports.Console({
			handleExceptions: true,
		}),
	],
	level: process.env.LOG_LEVEL || 'info',
	format: winston.format.cli(),
	exitOnError: true,
});
