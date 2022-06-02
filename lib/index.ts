import { schedule } from 'node-cron';
import { doBackup, doPrune, doListSnapshots } from './renovate';
import { BACKUP_CRON, BACKUP_OPTS, PRUNE_OPTS, DRY_RUN } from './config';
import { logger } from './logger';

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup([...BACKUP_OPTS, DRY_RUN])
			.then(() => doPrune([DRY_RUN, ...PRUNE_OPTS]))
			.then(() => {
				doListSnapshots();
			});
	});
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run', ...BACKUP_OPTS]).then(() => {
		doListSnapshots();
	});
};

dryRun();
