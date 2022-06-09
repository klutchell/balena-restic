import { executeInContainer, inspectSelf, listVolumesFilter } from './docker';
import {
	INCLUDE_VOLUMES,
	EXCLUDE_VOLUMES,
	RESTIC_ENV_VARS,
	BIND_ROOT_PATH,
	TMPDIR,
	BACKUP_OPTS,
	RESTORE_OPTS,
	PRUNE_OPTS,
} from './config';
import { getStateStatus, stopServices, startServices } from './supervisor';
import { VolumeInspectInfo, ContainerInspectInfo } from 'dockerode';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logger } from './logger';
import { boolean } from 'boolean';

const execSync = promisify(exec);

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
	logger.info('Searching for restic volumes...');

	// restic volumes for cache and snapshots are excluded from backups
	const resticVolumes = self.Mounts.filter(
		(f) =>
			f.Destination === process.env.RESTIC_REPOSITORY ||
			f.Destination === process.env.RESTIC_CACHE_DIR,
	);

	logger.debug(JSON.stringify(resticVolumes, null, 3));

	logger.info('Searching for data volumes...');

	// data volumes are locally discovered volumes that are not directly
	// mount on the volume-keeper container as filtered above
	const dataVolumes = (
		isSupervised(self)
			? await listVolumesFilter(supervisedFilter.bind(null, getAppId(self)))
			: await listVolumesFilter(composedFilter.bind(null, getProjectName(self)))
	).filter((f) => !resticVolumes.map((m) => m.Name).includes(f.Name));

	logger.debug(JSON.stringify(dataVolumes, null, 3));

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

	logger.info('Configuring container...');

	const opts = {
		Env: envs,
		Hostconfig: {
			NetworkMode: 'host',
			AutoRemove: true,
			Binds: binds,
			Tmpfs: { [TMPDIR]: 'rw,noexec,nosuid' },
		},
	};

	logger.debug(JSON.stringify(opts, null, 3));

	return [self.Image, opts];
};

const checkRepoPath = (self: ContainerInspectInfo): void => {
	if (
		process.env.RESTIC_REPOSITORY &&
		!/.+:.+/.test(process.env.RESTIC_REPOSITORY) &&
		!self.Mounts.find((f) => f.Destination === process.env.RESTIC_REPOSITORY)
	) {
		logger.error('RESTIC_REPOSITORY path must be mounted as a volume!');
		process.exit(1);
	}
};

const prependExtraArgs = (args: string[], extra: string[]): string[] => {
	// put dry-run at the front of the extra args
	if (boolean(process.env.DRY_RUN)) {
		extra.unshift('--dry-run');
	}

	// give the passed-in args the highest priority by appending them last
	return extra.concat(args);
};

// https://restic.readthedocs.io/en/latest/040_backup.html
export const doBackup = async (args: string[] = []): Promise<void> => {
	const self = await inspectSelf();

	checkRepoPath(self);
	args = prependExtraArgs(args, BACKUP_OPTS);

	return getContainerOpts(self, 'ro') // read-only
		.then(([image, opts]) => {
			const cmd = `restic init 2>/dev/null ; restic backup ${BIND_ROOT_PATH} -vv ${args.join(
				' ',
			)} | cat`;
			return executeInContainer(image, ['sh', '-c', '--', cmd], opts);
		});
};

// https://restic.readthedocs.io/en/latest/050_restore.html
export const doRestore = async (args: string[] = ['latest']): Promise<void> => {
	const self = await inspectSelf();

	checkRepoPath(self);
	args = prependExtraArgs(args, RESTORE_OPTS);

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
			const cmd = `restic restore --target=${BIND_ROOT_PATH} -vv ${args.join(
				' ',
			)} | cat`;
			return executeInContainer(image, ['sh', '-c', '--', cmd], opts);
		})
		.then(() => {
			return fnPost();
		});
};

// https://restic.readthedocs.io/en/latest/060_forget.html
export const doPrune = async (args: string[] = []): Promise<void> => {
	args = prependExtraArgs(args, PRUNE_OPTS);

	const cmd = `restic forget --prune -vv ${args.join(' ')} | cat`;

	logger.info('Executing in shell...');
	logger.debug(cmd);

	return execSync(cmd).then(({ stdout, stderr }) => {
		if (stdout) {
			console.log(stdout);
		}
		if (stderr) {
			console.error(stderr);
		}
	});
};
