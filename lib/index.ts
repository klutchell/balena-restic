import { schedule } from 'node-cron';
import { doBackup, doPrune, doListSnapshots } from './renovate';
import { logger } from './logger';

const BACKUP_CRON = process.env.BACKUP_CRON;

const args = ['--tag=scheduled'];

if (process.env.BALENA_APP_NAME) {
	args.push(`--tag=${process.env.BALENA_APP_NAME}`);
}

if (process.env.BALENA_DEVICE_NAME_AT_INIT) {
	args.push(`--tag=${process.env.BALENA_DEVICE_NAME_AT_INIT}`);
}

if (process.env.BALENA_DEVICE_UUID) {
	args.push(`--host=${process.env.BALENA_DEVICE_UUID}`);
}

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup(args)
			.then(() => doPrune(args))
			.then(() => {
				doListSnapshots();
			});
	});
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run', ...args]).then(() => {
		doListSnapshots();
	});
};

dryRun();
