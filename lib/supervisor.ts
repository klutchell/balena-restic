import { Response } from 'node-fetch';
import fetch from 'node-fetch';
import { SUPERVISOR_ADDRESS, SUPERVISOR_API_KEY } from './config';
import { logger } from './logger';

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

// https://www.balena.io/docs/reference/supervisor/supervisor-api/#get-v2statestatus
export const getStateStatus = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/state/status?apikey=${SUPERVISOR_API_KEY}`,
	).then((response) => {
		return checkStatus(response).json();
	});
};

export const getLocalTargetState = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/local/target-state?apikey=${SUPERVISOR_API_KEY}`,
	).then((response) => {
		return checkStatus(response).json();
	});
};

export const getDeviceHostConfig = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v1/device/host-config?apikey=${SUPERVISOR_API_KEY}`,
	).then((response) => {
		return checkStatus(response).json();
	});
};

export const getDeviceName = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/device/name?apikey=${SUPERVISOR_API_KEY}`,
	).then((response) => {
		return checkStatus(response).json();
	});
};

export const getDeviceTags = async (): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/device/tags?apikey=${SUPERVISOR_API_KEY}`,
	).then((response) => {
		return checkStatus(response).json();
	});
};

// https://www.balena.io/docs/reference/supervisor/supervisor-api/#post-v2applicationsappidstop-service
export const stopService = async (
	appId: string,
	serviceName: string,
): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/applications/${appId}/stop-service?apikey=${SUPERVISOR_API_KEY}`,
		{
			method: 'post',
			body: JSON.stringify({ serviceName }),
			headers: { 'Content-Type': 'application/json' },
		},
	).then((response) => {
		return checkStatus(response);
	});
};

// https://www.balena.io/docs/reference/supervisor/supervisor-api/#post-v2applicationsappidstart-service
export const startService = async (
	appId: string,
	serviceName: string,
): Promise<any> => {
	return await fetch(
		`${SUPERVISOR_ADDRESS}/v2/applications/${appId}/start-service?apikey=${SUPERVISOR_API_KEY}`,
		{
			method: 'post',
			body: JSON.stringify({ serviceName }),
			headers: { 'Content-Type': 'application/json' },
		},
	).then((response) => {
		return checkStatus(response);
	});
};

export const stopServices = async (
	appId: string,
	services: string[],
): Promise<any> => {
	logger.info('Stopping services...');
	console.debug(services);
	return await Promise.all(services.map((m) => stopService(appId, m)));
};

export const startServices = async (
	appId: string,
	services: string[],
): Promise<any> => {
	logger.info('Starting services...');
	console.debug(services);
	return await Promise.all(services.map((m) => startService(appId, m)));
};
