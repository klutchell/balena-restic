import { schedule } from 'node-cron';
import { doBackup, doPrune, doListSnapshots } from './renovate';
import { logger } from './logger';

const BACKUP_CRON = process.env.BACKUP_CRON;

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup(['--tag=scheduled'])
			.then(() => doPrune(['--tag=scheduled']))
			.then(() => {
				doListSnapshots();
			});
	});
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run']).then(() => {
		doListSnapshots();
	});
};

dryRun();
