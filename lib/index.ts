import { schedule } from 'node-cron';
import { doBackup, doPrune, getHost, getTags } from './renovate';
import {
	BACKUP_CRON,
	KEEP_YEARLY,
	KEEP_MONTHLY,
	KEEP_WEEKLY,
	KEEP_DAILY,
	KEEP_HOURLY,
} from './config';
import { logger } from './logger';

if (BACKUP_CRON) {
	logger.info(`Scheduling backup cron with schedule '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		const [host, tags] = await Promise.all([getHost(), getTags()]);
		return doBackup([`--host=${host}`, `--tag=${tags}`]).then(() =>
			doPrune([
				`--keep-hourly=${KEEP_HOURLY}`,
				`--keep-daily=${KEEP_DAILY}`,
				`--keep-weekly=${KEEP_WEEKLY}`,
				`--keep-monthly=${KEEP_MONTHLY}`,
				`--keep-yearly=${KEEP_YEARLY}`,
			]),
		);
	});
}

const dryRun = async () => {
	logger.info('Starting dry-run...');
	const [host, tags] = await Promise.all([getHost(), getTags()]);
	return doBackup(['--dry-run', `--host=${host}`, `--tag=${tags}`]);
};

dryRun();
