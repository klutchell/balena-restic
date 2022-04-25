import { Response } from 'node-fetch';
import fetch from 'node-fetch';

const SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
const SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;

export class HTTPResponseError extends Error {
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
			return checkStatus(response).json() as any;
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
			return checkStatus(response).json() as any;
		})
		.catch((err) => {
			throw new Error(err);
		});
};
