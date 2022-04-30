import * as fs from 'fs';
import * as path from 'path';
// import * as cron from 'node-cron';
// import * as Docker from 'dockerode';
import _ = require('lodash');
import * as supervisor from './supervisor';
import * as engine from './docker';
import { ENVIRONMENT_VARIABLES } from './restic';

const THIS_SERVICE = process.env.BALENA_SERVICE_NAME || '';
// const BACKUP_CRON = process.env.BACKUP_CRON || '0 */8 * * *'; // default to every 8 hours
const RESTORE_FILE = process.env.RESTORE_FILE || '/tmp/restore';
const INCLUDE_VOLUMES = process.env.INCLUDE_VOLUMES || '';
const EXCLUDE_VOLUMES = process.env.EXCLUDE_VOLUMES || '';

const containerOpts = (volumes: string[], mode: 'ro' | 'rw' = 'ro'): {} => {
	const opts = {
		Env: [] as string[],
		Hostconfig: {
			AutoRemove: true,
			Binds: [] as string[],
		},
	};

	// add each volume mount
	volumes.forEach((vol) => {
		opts.Hostconfig.Binds.push(`${vol}:/volumes/${vol}:${mode}`);
	});

	// clone the supported env vars to the new container
	ENVIRONMENT_VARIABLES.forEach((key) => {
		if (process.env[key] != null) {
			opts.Env.push(`${key}=${process.env[key]}`);
		}
	});

	return opts;
};

const filterVolumes = (
	included: string[],
	excluded: string[],
	state: any,
): string[] => {
	// TODO: support multiple apps here
	const volumes = state.local.apps['1'].volumes;
	return _.flow([
		Object.entries,
		(arr) =>
			arr.filter(([_key, value]: any) => {
				return (
					!excluded.includes(value.name) &&
					(included.length < 1 ? true : included.includes(value.name))
				);
			}),
		(arr) => arr.map(([_key, value]: any) => value.name),
	])(volumes);
};

const getServiceVolumes = (service: string, state: any): string[] => {
	// TODO: support multiple apps here
	const services = state.local.apps['1'].services;
	return services
		.filter((item: any) => {
			return item.serviceName === service;
		})[0]
		.config.volumes.map(
			(volume: string) => volume.split('_').slice(1).join('_').split(':')[0],
		);
};

const getServiceImage = (service: string, state: any): string => {
	// TODO: support multiple apps here
	const services = state.local.apps['1'].services;
	return services.filter((item: any) => {
		return item.serviceName === service;
	})[0].imageName;
};

const stateToEngineVolume = async (
	volume: string,
	state: any,
): Promise<string | undefined> => {
	// TODO: support multiple apps here
	const appId = state.local.apps['1'].volumes[volume]?.appId;
	const volumes = await engine.getSupervisedVolumes();

	if (appId != null) {
		return volumes
			.filter((item: any) => {
				return item.Name === [appId, volume].join('_');
			})
			.map((item: any) => item.Name)[0];
	}
};

const getEligibleVolumes = async (state: any): Promise<string[]> => {
	const included = INCLUDE_VOLUMES.split(/[\s,;]+/).filter((elem) => elem);
	const excluded = _.union(
		EXCLUDE_VOLUMES.split(/[\s,;]+/),
		getServiceVolumes(THIS_SERVICE, state),
	).filter((elem) => elem);

	return await Promise.all(
		filterVolumes(included, excluded, state).map(async (volume) => {
			return await stateToEngineVolume(volume, state);
		}),
	).then((values) => {
		return values.filter((value) => value !== undefined) as string[];
	});
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

	const targetState = (await supervisor.getLocalTargetState()).state;

	const volumes = await getEligibleVolumes(targetState);
	const image = getServiceImage(THIS_SERVICE, targetState);

	const opts = containerOpts(volumes);
	console.debug(opts);

	return await engine.runContainer(image, ['restic', 'version'], opts);
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

// console.log(`Starting backup cron with schedule '${BACKUP_CRON}'`);
// cron.schedule(BACKUP_CRON, () => {
// 	console.log('Starting backup process...');
// 	backup();
// });

backup();
