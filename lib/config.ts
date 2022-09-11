import { boolean } from 'boolean';

export const RESTIC_CACHE_DIR = process.env.RESTIC_CACHE_DIR;
export const RESTIC_REPOSITORY = process.env.RESTIC_REPOSITORY;

export const BALENA_APP_ID = process.env.BALENA_APP_ID || '';
export const BALENA_DEVICE_UUID = process.env.BALENA_DEVICE_UUID || '';
export const BALENA_SERVICE_NAME = process.env.BALENA_SERVICE_NAME || '';

export const SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
export const SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;

export const DATA_PART_LABEL = process.env.DATA_PART_LABEL || 'resin-data';
export const DATA_MOUNT_PATH = process.env.DATA_MOUNT_PATH || '/data';
export const DATA_ROOT_DIR =
	process.env.DATA_ROOT_DIR || DATA_MOUNT_PATH + '/docker/volumes';

export const BACKUP_CRON = process.env.BACKUP_CRON;

export const BACKUP_OPTS = process.env.BACKUP_OPTS?.split(/\s+/) || [
	'--tag=scheduled',
];

export const PRUNE_OPTS = process.env.PRUNE_OPTS?.split(/\s+/) || [
	'--keep-hourly=24',
	'--keep-daily=7',
	'--keep-weekly=5',
	'--keep-monthly=12',
	'--group-by=hosts,tags,path',
];

export const DRY_RUN = boolean(process.env.DRY_RUN);

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
