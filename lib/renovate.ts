import { executeInContainer, inspectSelf, listVolumesFilter } from './docker';
import {
	INCLUDE_VOLUMES,
	EXCLUDE_VOLUMES,
	RESTIC_ENV_VARS,
	RESTIC_HOST,
	RESTIC_TAGS,
	BIND_ROOT_PATH,
} from './config';
import {
	getDeviceName,
	getDeviceTags,
	getStateStatus,
	stopServices,
	startServices,
} from './supervisor';
import { hostname } from 'os';
import { VolumeInspectInfo, ContainerInspectInfo } from 'dockerode';
import * as util from 'util';
import { exec } from 'child_process';

const execSync = util.promisify(exec);

export const getHost = async (): Promise<string> => {
	return getDeviceName()
		.then((data) => data.deviceName)
		.catch((_err) => RESTIC_HOST || hostname());
};

export const getTags = async (): Promise<string> => {
	return getDeviceTags()
		.then((data) =>
			data.tags
				.map((m: any) => (m.value ? `${m.name}=${m.value}` : m.name))
				.join(','),
		)
		.catch((_err) => RESTIC_TAGS || '');
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

	const dataVolumes = isSupervised(self)
		? await listVolumesFilter(supervisedFilter.bind(null, getAppId(self)))
		: await listVolumesFilter(composedFilter.bind(null, getProjectName(self)));

	if (dataVolumes.length < 1) {
		throw new Error(
			'No data volumes found! Check that volumes exist and have not be excluded.',
		);
	}

	const binds: string[] = dataVolumes
		.filter((f) => !resticVolumes.map((m) => m.Name).includes(f.Name))
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
			AutoRemove: true,
			Binds: binds,
		},
	};

	return [self.Image, opts];
};

// https://restic.readthedocs.io/en/latest/040_backup.html
export const doBackup = async (resticOpts: string[] = []): Promise<void> => {
	const self = await inspectSelf();

	return execSync('restic init || true')
		.then((out) => {
			if (out.stdout) {
				console.log(out.stdout);
			} else {
				// console.log(out.stderr);
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
					`restic backup ${BIND_ROOT_PATH} -vv ${resticOpts.join(' ')} | cat`,
				],
				opts,
			);
		})
		.then(() => {
			return execSync('restic snapshots');
		})
		.then((out) => {
			if (out.stdout) {
				console.log(out.stdout);
			} else {
				console.log(out.stderr);
			}
		});
};

// https://restic.readthedocs.io/en/latest/050_restore.html
export const doRestore = async (
	resticOpts: string[] = ['latest'],
): Promise<void> => {
	const self = await inspectSelf();

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
					`restic restore --target=${BIND_ROOT_PATH} -vv ${resticOpts.join(
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
export const doPrune = async (resticOpts: string[] = []): Promise<void> => {
	return execSync(
		`restic forget --prune --group-by=paths,tags ${resticOpts.join(
			' ',
		)} -vv | cat`,
	).then((out) => {
		if (out.stdout) {
			console.log(out.stdout);
		} else {
			console.log(out.stderr);
		}
	});
};
