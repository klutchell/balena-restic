import { Response } from 'node-fetch';
import fetch from 'node-fetch';
import { SUPERVISOR_ADDRESS, SUPERVISOR_API_KEY } from './config';

class HTTPResponseError extends Error {
	public readonly response: Response;

	constructor(response: Response) {
		super(`HTTP Error Response: ${response.status} ${response.statusText}`);
		this.response = response;
	}
}

const checkStatus = (response: Response) => {
	if (response.ok) {
		// response.status >= 200 && response.status < 300
		return response;
	} else {
		throw new HTTPResponseError(response);
	}
};

/**
 * This will return a list of images, containers, the overall download progress and the status of the state engine.
 * https://www.balena.io/docs/reference/supervisor/supervisor-api/#get-v2statestatus
 */
export const getStateStatus = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/state/status?apikey=${SUPERVISOR_API_KEY}`,
	)
		.then((response) => {
			return checkStatus(response).json();
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getLocalTargetState = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/local/target-state?apikey=${SUPERVISOR_API_KEY}`,
	)
		.then((response) => {
			return checkStatus(response).json();
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getDeviceHostConfig = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v1/device/host-config?apikey=${SUPERVISOR_API_KEY}`,
	)
		.then((response) => {
			return checkStatus(response).json();
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getDeviceName = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/device/name?apikey=${SUPERVISOR_API_KEY}`,
	)
		.then((response) => {
			return checkStatus(response).json();
		})
		.catch((err) => {
			throw new Error(err);
		});
};

export const getDeviceTags = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/device/tags?apikey=${SUPERVISOR_API_KEY}`,
	)
		.then((response) => {
			return checkStatus(response).json();
		})
		.catch((err) => {
			throw new Error(err);
		});
};
