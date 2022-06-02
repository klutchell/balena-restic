import { schedule } from 'node-cron';
import { doBackup, doPrune } from './renovate';
import {
	BACKUP_CRON,
	BACKUP_OPTS,
	PRUNE_OPTS,
	DRY_RUN,
	RESTIC_HOST,
	RESTIC_TAGS,
} from './config';
import { logger } from './logger';
import { getDeviceName, getDeviceTags } from './supervisor';
import { hostname } from 'os';

const getHost = async (): Promise<string> => {
	return getDeviceName()
		.then((data) => data.deviceName)
		.catch((_err) => RESTIC_HOST || hostname());
};

const getTags = async (): Promise<string> => {
	return getDeviceTags()
		.then((data) =>
			data.tags
				.map((m: any) => (m.value ? `${m.name}=${m.value}` : m.name))
				.join(','),
		)
		.catch((_err) => RESTIC_TAGS || '');
};

if (BACKUP_CRON) {
	logger.info(`Scheduling backup with cron '${BACKUP_CRON}'`);
	schedule(BACKUP_CRON, async () => {
		logger.info('Starting scheduled backup...');
		const [host, tags] = await Promise.all([getHost(), getTags()]);
		return doBackup([
			`--host=${host}`,
			`--tag=${tags}`,
			...BACKUP_OPTS,
			DRY_RUN,
		]).then(() =>
			doPrune([`--host=${host}`, `--tag=${tags}`, ...PRUNE_OPTS, DRY_RUN]),
		);
	});
}

const dryRun = async () => {
	logger.info('Starting dry-run backup...');
	const [host, tags] = await Promise.all([getHost(), getTags()]);
	return doBackup([
		'--dry-run',
		`--host=${host}`,
		`--tag=${tags}`,
		...BACKUP_OPTS,
	]);
};

dryRun();
