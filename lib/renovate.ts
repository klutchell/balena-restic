import { executeInContainer, inspectSelf, listVolumesFilter } from './docker';
import {
	INCLUDE_VOLUMES,
	EXCLUDE_VOLUMES,
	RESTIC_ENV_VARS,
	BIND_ROOT_PATH,
	TAGS,
} from './config';
import {
	getStateStatus,
	stopServices,
	startServices,
	getDeviceName,
} from './supervisor';
import { VolumeInspectInfo, ContainerInspectInfo } from 'dockerode';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logger } from './logger';

const execSync = promisify(exec);

const getHost = async (): Promise<string> => {
	return process.env.HOST
		? Promise.resolve('--host=' + process.env.HOST)
		: getDeviceName()
				.then((data) => '--host=' + data.deviceName)
				.catch((_err) => '');
};

const isSupervised = (info: ContainerInspectInfo): boolean => {
	return (
		info.Config &&
		info.Config.Labels &&
		info.Config.Labels['io.balena.supervised'] === 'true'
	);
};

const getAppId = (info: ContainerInspectInfo): string => {
	return info.Config.Labels['io.balena.app-id'];
};

const getProjectName = (info: ContainerInspectInfo): string => {
	return info.Config.Labels['com.docker.compose.project'];
};

const supervisedFilter = (appId: string, info: VolumeInspectInfo): boolean => {
	return (
		info.Labels &&
		typeof info.Name === 'string' &&
		info.Labels['io.balena.supervised'] === 'true' &&
		!EXCLUDE_VOLUMES.includes([appId, info.Name].join('_')) &&
		!EXCLUDE_VOLUMES.includes(info.Name) &&
		(INCLUDE_VOLUMES.length < 1 ||
			INCLUDE_VOLUMES.includes(info.Name) ||
			INCLUDE_VOLUMES.includes([appId, info.Name].join('_')))
	);
};

const composedFilter = (project: string, info: VolumeInspectInfo): boolean => {
	return (
		info.Labels &&
		typeof info.Name === 'string' &&
		info.Labels['com.docker.compose.project'] === project &&
		!EXCLUDE_VOLUMES.includes(info.Labels['com.docker.compose.volume']) &&
		!EXCLUDE_VOLUMES.includes(info.Name) &&
		(INCLUDE_VOLUMES.length < 1 ||
			INCLUDE_VOLUMES.includes(info.Name) ||
			INCLUDE_VOLUMES.includes(info.Labels['com.docker.compose.volume']))
	);
};

const getContainerOpts = async (
	self: ContainerInspectInfo,
	mode: 'ro' | 'rw' = 'ro',
): Promise<[string, {}]> => {
	const resticVolumes = self.Mounts.filter((f) => f.Name);

	const dataVolumes = (
		isSupervised(self)
			? await listVolumesFilter(supervisedFilter.bind(null, getAppId(self)))
			: await listVolumesFilter(composedFilter.bind(null, getProjectName(self)))
	).filter((f) => !resticVolumes.map((m) => m.Name).includes(f.Name));

	if (dataVolumes.length < 1) {
		logger.error(
			'No data volumes found! Check that volumes exist and have not be excluded.',
		);
	}

	logger.debug('Found eligible volumes:');
	if (logger.isDebugEnabled()) {
		console.debug(dataVolumes.map((m) => m.Name));
	}

	const binds: string[] = dataVolumes
		.map((m) => `${m.Name}:${BIND_ROOT_PATH}/${m.Name}:${mode}`)
		.concat(
			resticVolumes.map(
				(m) => `${m.Name}:${m.Destination}:${m.RW ? 'rw' : 'ro'}`,
			),
		);

	// clone the supported env vars to the new container
	const envs = RESTIC_ENV_VARS.filter((f) => process.env[f] != null).map(
		(m) => `${m}=${process.env[m]}`,
	);

	const opts = {
		Env: envs,
		Hostconfig: {
			NetworkMode: 'host',
			AutoRemove: true,
			Binds: binds,
		},
	};

	return [self.Image, opts];
};

// https://restic.readthedocs.io/en/latest/040_backup.html
export const doBackup = async (args: string[] = []): Promise<void> => {
	const self = await inspectSelf();

	// do not append default HOST if --host is provided as an arg
	if (!args.find((f) => f.startsWith('--host'))) {
		await getHost().then((host: string) => host && args.push(host));
	}

	// if tags are provided append them to the command as they are additive
	if (TAGS) {
		args.push(TAGS);
	}

	return execSync('restic init || true')
		.then(({ stdout, stderr }) => {
			if (stdout) {
				console.log(stdout);
			}
			if (stderr) {
				// console.error(stderr);
			}
		})
		.then(() => {
			return getContainerOpts(self, 'ro'); // read-only
		})
		.then(([image, opts]) => {
			return executeInContainer(
				image,
				[
					'sh',
					'-c',
					'--',
					`restic backup ${BIND_ROOT_PATH} -vv ${args.join(' ')} | cat`,
				],
				opts,
			);
		});
};

// https://restic.readthedocs.io/en/latest/050_restore.html
export const doRestore = async (args: string[] = ['latest']): Promise<void> => {
	const self = await inspectSelf();

	// do not append default HOST if --host is provided as an arg
	if (!args.find((f) => f.startsWith('--host'))) {
		await getHost().then((host: string) => host && args.push(host));
	}

	// if tags are provided append them to the command as they are additive
	if (TAGS) {
		args.push(TAGS);
	}

	let services = [];
	let fnPre = (..._args: any) => Promise.resolve();
	let fnPost = (..._args: any) => Promise.resolve();

	if (isSupervised(self)) {
		services = await getStateStatus().then((state) =>
			state.containers
				.filter((f: any) => f.containerId !== self.Id)
				.map((m: any) => m.serviceName),
		);

		fnPre = stopServices.bind(null, getAppId(self), services);
		fnPost = startServices.bind(null, getAppId(self), services);
	}

	return fnPre()
		.then(() => {
			return getContainerOpts(self, 'rw'); // read-write
		})
		.then(([image, opts]) => {
			return executeInContainer(
				image,
				[
					'sh',
					'-c',
					'--',
					`restic restore --target=${BIND_ROOT_PATH} -vv ${args.join(
						' ',
					)} | cat`,
				],
				opts,
			);
		})
		.then(() => {
			return fnPost();
		});
};

// https://restic.readthedocs.io/en/latest/060_forget.html
export const doPrune = async (args: string[] = []): Promise<void> => {
	logger.info('Pruning snapshot(s)...');

	// do not append default HOST if --host is provided as an arg
	if (!args.find((f) => f.startsWith('--host'))) {
		await getHost().then((host: string) => host && args.push(host));
	}

	// if tags are provided append them to the command as they are additive
	if (TAGS) {
		args.push(TAGS);
	}

	return execSync(`restic forget --prune -vv ${args.join(' ')} | cat`).then(
		({ stdout, stderr }) => {
			if (stdout) {
				console.log(stdout);
			}
			if (stderr) {
				console.error(stderr);
			}
		},
	);
};

// https://restic.readthedocs.io/en/latest/045_working_with_repos.html#listing-all-snapshots
export const doListSnapshots = async (args: string[] = []): Promise<void> => {
	logger.info('Listing snapshots...');

	// do not append default HOST if --host is provided as an arg
	if (!args.find((f) => f.startsWith('--host'))) {
		await getHost().then((host: string) => host && args.push(host));
	}

	// if tags are provided append them to the command as they are additive
	if (TAGS) {
		args.push(TAGS);
	}

	return execSync(
		`restic snapshots --group-by=hosts,tags ${args.join(' ')} | cat`,
	).then(({ stdout, stderr }) => {
		if (stdout) {
			console.log(stdout);
		}
		if (stderr) {
			console.error(stderr);
		}
	});
};
