import { schedule } from 'node-cron';
import { doBackup, doPrune } from './renovate';
import { logger } from './logger';
import { spawn } from 'child_process';
import { BACKUP_CRON, DATA_PART_LABEL, BIND_ROOT_PATH } from './config';

const resticArgs = ['--tag=scheduled'];

if (process.env.BALENA_APP_NAME) {
	resticArgs.push(`--tag=${process.env.BALENA_APP_NAME}`);
}

if (process.env.BALENA_DEVICE_NAME_AT_INIT) {
	resticArgs.push(`--tag=${process.env.BALENA_DEVICE_NAME_AT_INIT}`);
}

if (process.env.BALENA_DEVICE_UUID) {
	resticArgs.push(`--host=${process.env.BALENA_DEVICE_UUID}`);
}

const childProcess = async (cmd: string, args: string[]) => {
	const p = spawn(cmd, args);

	p.stdout.on('data', function (data) {
		logger.info(data.toString());
	});

	p.stderr.on('data', function (data) {
		logger.error(data.toString());
	});

	p.on('exit', function (code) {
		if (code) {
			logger.info('child process exited with code ' + code.toString());
		} else {
			logger.warn('child process exited');
		}
	});
};

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
		await childProcess('mount', [
			'-v',
			`$(blkid -L ${DATA_PART_LABEL})`,
			`${BIND_ROOT_PATH}`,
		]);
		await dryRun();
	} catch (e) {
		logger.error(e);
	}
})();
