import * as Docker from 'dockerode';
// import _ = require('lodash');

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
			throw new Error(err);
		});
};
