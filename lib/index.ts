import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import * as _ from 'lodash';
import {
	getSupervisedContainers,
	getSupervisedVolumes,
	getContainerId,
	getContainerImage,
	getContainerMounts,
	resolveVolumeNames,
	runContainer,
} from './docker';
import { ENVIRONMENT_VARIABLES } from './restic';

const BACKUP_CRON = process.env.BACKUP_CRON || '0 */8 * * *'; // default to every 8 hours
const RESTORE_FILE = process.env.RESTORE_FILE || '/tmp/restore';
const INCLUDE_VOLUMES = process.env.INCLUDE_VOLUMES || '';
const EXCLUDE_VOLUMES = process.env.EXCLUDE_VOLUMES || '';

const containerOpts = async (
	mode: 'ro' | 'rw' = 'ro',
): Promise<{ image: string; opts: {} }> => {
	const containers = await getSupervisedContainers();
	const volumes = await getSupervisedVolumes();
	const containerId = await getContainerId();

	const image = getContainerImage(containerId, containers);

	if (image == null) {
		throw new Error(`Failed to get imageID for container ${containerId}`);
	}

	// record the mounts from this container as they are treated differently
	const mounts = getContainerMounts(containerId, containers)?.filter(
		(f) => f.Name != null,
	);

	// read the exclude volumes env var, resolve the names, and append the special mounts
	const excludeVolumes: string[] = _.uniq(
		EXCLUDE_VOLUMES.split(/[\s,;]+/)
			.filter((f) => f != null)
			.map((m) => resolveVolumeNames(m, volumes))
			.flat()
			.concat(mounts?.map((m) => m.Name))
			.filter((f) => f != null) as string[],
	);

	console.error('===================================================');
	console.error(
		'excludeVolumes',
		require('util').inspect(excludeVolumes, {
			depth: null,
			maxArrayLength: Infinity,
		}),
	);
	console.error('===================================================');

	// read the include volumes env var, resolve the names, remove the excluded volumes
	const includeVolumes: string[] = _.uniq(
		INCLUDE_VOLUMES.split(/[\s,;]+/)
			.filter((f) => f != null)
			.map((m) => resolveVolumeNames(m, volumes))
			.flat()
			.filter((f) => f == null || !excludeVolumes.includes(f)) as string[],
	);

	console.error('===================================================');
	console.error(
		'includeVolumes',
		require('util').inspect(includeVolumes, {
			depth: null,
			maxArrayLength: Infinity,
		}),
	);
	console.error('===================================================');

	const binds: string[] = volumes
		.filter((f) =>
			includeVolumes.length > 0
				? includeVolumes.includes(f.Name)
				: !excludeVolumes.includes(f.Name),
		)
		.map((m) => `${m.Name}:/data/${m.Name}:${mode}`)
		.concat(
			mounts?.map((m) => `${m.Name}:${m.Destination}:${m.RW ? 'rw' : 'ro'}`) ||
				[],
		);

	// clone the supported env vars to the new container
	const envs = ENVIRONMENT_VARIABLES.filter((f) => process.env[f] != null).map(
		(m) => `${m}=${process.env[m]}`,
	);

	const opts = {
		Env: envs,
		Hostconfig: {
			AutoRemove: true,
			Binds: binds,
		},
	};

	console.error('===================================================');
	console.error(
		'opts',
		require('util').inspect(opts, { depth: null, maxArrayLength: Infinity }),
	);
	console.error('===================================================');

	return { image, opts };
};

const backup = async (): Promise<void> => {
	try {
		if (fs.existsSync(RESTORE_FILE)) {
			console.log('Restore file detected, skipping backup...');
			return;
		}
	} catch (err) {
		console.error(err);
	}

	const { image, opts } = await containerOpts();

	return await runContainer(image, ['restic', 'version'], opts);
};

// const restore = async (): Promise<void> => {

// };

class FileWatcher {
	file: string;
	constructor(filename: string) {
		this.file = filename;
		this.onChange = this.onChange.bind(this);
		this.onTrigger = this.onTrigger.bind(this);
	}
	onTrigger() {
		console.log('file changed :)');
	}
	onChange(_eventType: string, filename: string | Buffer) {
		if (filename === path.basename(this.file)) {
			_.throttle(this.onTrigger, 100, { trailing: true })();
		}
	}
	observe() {
		fs.watch(path.dirname(this.file), this.onChange);
	}
}

new FileWatcher(RESTORE_FILE).observe();

backup();

console.log(`Starting backup cron with schedule '${BACKUP_CRON}'`);
cron.schedule(BACKUP_CRON, () => {
	console.log('Starting backup process...');
	backup();
});
