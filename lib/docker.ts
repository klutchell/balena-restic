import * as Docker from 'dockerode';
import { readFile } from 'fs';

const docker = new Docker();

export const listVolumesFilter = async (
	fn: (info: Docker.VolumeInspectInfo) => boolean,
): Promise<Docker.VolumeInspectInfo[]> => {
	return await docker
		.listVolumes()
		.then((data) => {
			return data.Volumes.filter((f: Docker.VolumeInspectInfo) => fn(f));
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const listContainersFilter = async (
	fn: (info: Docker.ContainerInfo) => boolean,
): Promise<Docker.ContainerInfo[]> => {
	return await docker
		.listContainers()
		.then((data) => {
			return data.filter((f: Docker.ContainerInfo) => fn(f));
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const executeInContainer = async (
	image: string,
	command: string[],
	opts: {},
): Promise<void> => {
	return docker
		.run(image, command, process.stdout, opts)
		.then(function (data) {
			// console.log(data[0].StatusCode);
			return data[1].remove();
		})
		.then(function (_data) {
			console.log('container removed');
		})
		.catch(function (err) {
			// ignore in progress and missing codes
			if (err.statusCode !== 409 && err.statusCode !== 404) {
				throw new Error(err);
			}
		});
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
				// Not on Linux or using cgroups v2
				throw err;
			} else if (err) {
				// whoops
				throw err;
			}
		});
};
