import { schedule } from 'node-cron';
import { doBackup, doPrune } from './renovate';
import { logger } from './logger';
import { DATA_PART_LABEL, DATA_MOUNT_PATH } from './config';
import { childProcess } from './spawn';
import * as fs from 'fs';

const BACKUP_CRON = process.env.BACKUP_CRON;

const RESTIC_ARGS = ['--tag=scheduled'];

if (process.env.BALENA_APP_NAME != null) {
	RESTIC_ARGS.push(`--tag=${process.env.BALENA_APP_NAME}`);
}

if (process.env.BALENA_DEVICE_NAME_AT_INIT != null) {
	RESTIC_ARGS.push(`--tag=${process.env.BALENA_DEVICE_NAME_AT_INIT}`);
}

if (process.env.BALENA_DEVICE_UUID != null) {
	RESTIC_ARGS.push(`--host=${process.env.BALENA_DEVICE_UUID}`);
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run', ...RESTIC_ARGS]);
};

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup(RESTIC_ARGS).then(() => doPrune(RESTIC_ARGS));
	});
}

(async () => {
	try {
		if (!fs.existsSync(DATA_MOUNT_PATH)) {
			fs.mkdirSync(DATA_MOUNT_PATH, { recursive: true });
		}

		const dev = await await childProcess('blkid', ['-L', `${DATA_PART_LABEL}`]);
		await childProcess('mount', ['-v', `${dev}`, `${DATA_MOUNT_PATH}`]);
		await dryRun();
	} catch (e) {
		logger.error(e);
	}
})();
