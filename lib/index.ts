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

const childProcess = async (cmd: string, args: string[]): Promise<string> => {
	const child = spawn(cmd, args);

	let data = '';
	for await (const chunk of child.stdout) {
		logger.info(chunk);
		data += chunk;
	}

	let error = '';
	for await (const chunk of child.stderr) {
		logger.error(chunk);
		error += chunk;
	}

	const exitCode = await new Promise((resolve, _reject) => {
		child.on('close', resolve);
	});

	if (exitCode) {
		throw new Error(`child process error exit ${exitCode}, ${error}`);
	}

	return data;
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
		const dev = await (
			await childProcess('blkid', ['-L', `${DATA_PART_LABEL}`])
		).trim();
		await childProcess('mkdir', ['-p', `${BIND_ROOT_PATH}`]);
		await childProcess('mount', ['-v', `${dev}`, `${BIND_ROOT_PATH}`]);
		await dryRun();
	} catch (e) {
		logger.error(e);
	}
})();
