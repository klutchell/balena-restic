import * as Docker from 'dockerode';
import { readFile } from 'fs';

const docker = new Docker();

export const getSupervisedImages = async (): Promise<Docker.ImageInfo[]> => {
	return await docker
		.listImages()
		.then((data) => {
			return data.filter((item: Docker.ImageInfo) => {
				return item.Labels && item.Labels['io.balena.supervised'] === 'true';
			});
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getSupervisedVolumes = async (): Promise<
	Docker.VolumeInspectInfo[]
> => {
	return await docker
		.listVolumes()
		.then((data) => {
			return data.Volumes.filter((item: Docker.VolumeInspectInfo) => {
				return item.Labels && item.Labels['io.balena.supervised'] === 'true';
			});
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getSupervisedContainers = async (): Promise<
	Docker.ContainerInfo[]
> => {
	return await docker
		.listContainers()
		.then((data) => {
			return data.filter((item: Docker.ContainerInfo) => {
				return item.Labels && item.Labels['io.balena.supervised'] === 'true';
			});
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const runContainer = async (
	image: string,
	command: string[],
	createOpts: {},
): Promise<void> => {
	return await docker
		.run(image, command, process.stdout, createOpts)
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

export const getContainerId = async (): Promise<string> => {
	const readFilePromise = require('util').promisify(readFile);
	return readFilePromise('/proc/self/cgroup', 'utf8')
		.then((data: string) => {
			const re = /docker-(?<containerId>[a-f0-9]+)\.scope$/;
			return data
				.split('\n')
				.filter((f) => re.test(f))
				.shift()
				?.match(re)?.groups?.containerId;
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

export const getContainerMounts = (
	id: string,
	containers: Docker.ContainerInfo[],
): any[] | undefined => {
	return containers.filter((f) => f.Id === id).shift()?.Mounts;
};

export const getContainerImage = (
	id: string,
	containers: Docker.ContainerInfo[],
): string | undefined => {
	return containers
		.filter((e) => e.Id === id)
		.map((e) => e.ImageID)
		.pop();
};

export const resolveVolumeNames = (
	name: string,
	volumes: Docker.VolumeInspectInfo[],
): string[] | undefined => {
	if (volumes.map((e) => e.Name).includes(name)) {
		return [name];
	}
	return volumes
		.map((m) => m.Name)
		.filter((f) => new RegExp(`^[0-9]+_${name}$`).test(f));
};
