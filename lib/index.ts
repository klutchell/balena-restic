import { schedule } from 'node-cron';
import { doBackup, doPrune } from './restic';
import { logger } from './logger';
import {
	BACKUP_CRON,
	BACKUP_OPTS,
	BALENA_DEVICE_UUID,
	DRY_RUN,
	PRUNE_OPTS,
	DATA_PART_LABEL,
	DATA_MOUNT_PATH,
} from './config';
import { childProcess } from './spawn';
import * as fs from 'fs';

if (!BALENA_DEVICE_UUID) {
	throw new Error('BALENA_DEVICE_UUID is required!');
}

if (!process.env.RESTIC_PASSWORD) {
	throw new Error('RESTIC_PASSWORD is required!');
}

const extraArgs = (): string[] => {
	const extra: string[] = [];

	// put dry-run at the front of the extra args
	if (DRY_RUN) {
		extra.unshift('--dry-run');
	}

	// append one level of verbosity
	if (logger.isInfoEnabled()) {
		extra.unshift('-v');
	}

	// append one more level of verbosity
	if (logger.isDebugEnabled()) {
		extra.unshift('-v');
	}

	// give the passed-in args the highest priority by appending them last
	return extra;
};

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	return doBackup(['--dry-run', '--tag=dry-run']);
};

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		return doBackup([...BACKUP_OPTS, ...extraArgs()]).then(() =>
			doPrune([...PRUNE_OPTS, ...extraArgs()]),
		);
	});
}

(async () => {
	try {
		if (!fs.existsSync(DATA_MOUNT_PATH)) {
			fs.mkdirSync(DATA_MOUNT_PATH, { recursive: true });
		}

		// mount the data partition
		const dev = await await childProcess('blkid', ['-L', DATA_PART_LABEL]);
		await childProcess('mount', ['-v', dev, DATA_MOUNT_PATH]);

		// set container hostname to the device uuid
		await childProcess('hostname', [BALENA_DEVICE_UUID]);

		// execute a dry run
		await dryRun();
	} catch (e) {
		logger.error(e);
	}
})();
