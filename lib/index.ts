import { schedule } from 'node-cron';
import { doBackup, doPrune } from './renovate';
import { logger } from './logger';
import { BACKUP_CRON, DATA_PART_LABEL, DATA_MOUNT_PATH } from './config';
import { childProcess } from './spawn';

const resticArgs = ['--tag=scheduled'];

if (process.env.BALENA_APP_NAME != null) {
	resticArgs.push(`--tag=${process.env.BALENA_APP_NAME}`);
}

if (process.env.BALENA_DEVICE_NAME_AT_INIT != null) {
	resticArgs.push(`--tag=${process.env.BALENA_DEVICE_NAME_AT_INIT}`);
}

if (process.env.BALENA_DEVICE_UUID != null) {
	resticArgs.push(`--host=${process.env.BALENA_DEVICE_UUID}`);
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run', ...resticArgs]);
};

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup(resticArgs).then(() => doPrune(resticArgs));
	});
}

(async () => {
	try {
		const dev = await await childProcess('blkid', ['-L', `${DATA_PART_LABEL}`]);
		await childProcess('mkdir', ['-p', `${DATA_MOUNT_PATH}`]);
		await childProcess('mount', ['-v', `${dev}`, `${DATA_MOUNT_PATH}`]);
		await dryRun();
	} catch (e) {
		logger.error(e);
	}
})();
