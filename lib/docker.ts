import * as Docker from 'dockerode';
import { readFile } from 'fs';
import { logger } from './logger';

const docker = new Docker();

export const listVolumesFilter = async (
	fn: (info: Docker.VolumeInspectInfo) => boolean,
): Promise<Docker.VolumeInspectInfo[]> => {
	return await docker.listVolumes().then((data) => {
		return data.Volumes.filter((f: Docker.VolumeInspectInfo) => fn(f));
	});
};

export const listContainersFilter = async (
	fn: (info: Docker.ContainerInfo) => boolean,
): Promise<Docker.ContainerInfo[]> => {
	return await docker.listContainers().then((data) => {
		return data.filter((f: Docker.ContainerInfo) => fn(f));
	});
};

export const executeInContainer = async (
	image: string,
	command: string[],
	opts: {},
): Promise<void> => {
	logger.info('Running container...');
	logger.debug(JSON.stringify(opts, null, 3));
	return (
		docker
			.run(image, command, process.stdout, { ...opts, Tty: true })
			// .run(image, command, [process.stdout, process.stderr], {...opts, Tty: false})
			.then(function (data) {
				logger.debug('Container exited with code: ' + data[0].StatusCode);
				return data[1].remove();
			})
			.then(function (_data) {
				logger.debug('Container removed');
			})
			.catch(function (err) {
				// ignore in progress and missing codes
				if (err.statusCode !== 409 && err.statusCode !== 404) {
					logger.error(err);
				}
			})
	);
};

export const inspectSelf = async (): Promise<Docker.ContainerInspectInfo> => {
	const readFilePromise = require('util').promisify(readFile);
	return readFilePromise('/proc/self/cgroup', 'utf8')
		.then((data: string) => {
			const re = /(?:docker-|:cpuset:\/docker\/)(?<containerId>[a-f0-9]+)/;
			return data
				.split('\n')
				.filter((f) => re.test(f))
				.shift()
				?.match(re)?.groups?.containerId;
		})
		.then((id: string) => {
			return docker.getContainer(id);
		})
		.then((container: Docker.Container) => {
			return container.inspect();
		})
		.catch((err: NodeJS.ErrnoException) => {
			if (err.code === 'ENOENT') {
				logger.error(err); // Not on Linux or using cgroups v2
			} else if (err) {
				logger.error(err);
			}
		});
};
