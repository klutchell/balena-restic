import { spawn } from 'child_process';
import { logger } from './logger';

export const childProcess = async (
	cmd: string,
	args: string[],
): Promise<string> => {
	logger.debug(cmd + ' ' + args.join(' '));
	const child = spawn(cmd, args);

	let data = '';
	for await (const chunk of child.stdout) {
		logger.info(chunk.toString().trim());
		data += chunk;
	}

	let error = '';
	for await (const chunk of child.stderr) {
		logger.error(chunk.toString().trim());
		error += chunk;
	}

	const exitCode = await new Promise((resolve, _reject) => {
		child.on('close', resolve);
	});

	if (exitCode) {
		throw new Error(`child process error exit ${exitCode}, ${error}`);
	}

	return data.trim();
};
