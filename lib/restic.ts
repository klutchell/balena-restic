import {
	BALENA_APP_ID,
	BALENA_SERVICE_NAME,
	DATA_ROOT_DIR,
	RESTIC_CACHE_DIR,
	RESTIC_REPOSITORY,
} from './config';
import { getLocalTargetState } from './supervisor';
import { childProcess } from './spawn';

const getDataVolumes = async (
	appId: string,
	serviceName: string,
	exclude: string[],
): Promise<string[]> => {
	const targetState = await getLocalTargetState();

	const excludedVolumes = targetState.state.local.apps[appId].services
		.find((f: any) => f.serviceName === serviceName)
		.config.volumes.filter((f: string) => exclude.includes(f.split(':')[1]))
		.map((m: string) => m.split(':').shift());

	return Object.values(targetState.state.local.apps[appId].volumes)
		.map((m: any) => [m.appId, m.name].join('_'))
		.filter((f) => !excludedVolumes.includes(f));
};

// https://restic.readthedocs.io/en/latest/040_backup.html
export const doBackup = async (args: string[] = []): Promise<void> => {
	if (!RESTIC_REPOSITORY) {
		throw new Error('RESTIC_REPOSITORY is required!');
	}

	if (!RESTIC_CACHE_DIR) {
		throw new Error('RESTIC_CACHE_DIR is required!');
	}

	if (!BALENA_APP_ID) {
		throw new Error('BALENA_APP_ID is required!');
	}

	if (!BALENA_SERVICE_NAME) {
		throw new Error('BALENA_SERVICE_NAME is required!');
	}

	const dataVolumes = await getDataVolumes(BALENA_APP_ID, BALENA_SERVICE_NAME, [
		RESTIC_CACHE_DIR,
		RESTIC_REPOSITORY,
	]);

	return childProcess('sh', [
		'-c',
		'--',
		`restic init 2>/dev/null || true`,
	]).then(async () => {
		for (const v of dataVolumes) {
			await childProcess('sh', [
				'-c',
				'--',
				`restic backup ${[DATA_ROOT_DIR, v].join('/')} ${args.join(' ')} | cat`,
			]);
		}
	});
};

// https://restic.readthedocs.io/en/latest/060_forget.html
export const doPrune = async (args: string[] = []): Promise<string> => {
	return childProcess('restic', ['forget', '--prune', ...args]);
};
