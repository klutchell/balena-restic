export const RESTIC_CACHE_DIR = process.env.RESTIC_CACHE_DIR || '/cache';
export const RESTIC_REPOSITORY = process.env.RESTIC_REPOSITORY || '/snapshots';

export const DATA_PART_LABEL = process.env.DATA_PART_LABEL || 'resin-data';
export const DATA_MOUNT_PATH = process.env.DATA_MOUNT_PATH || '/data';
export const DATA_ROOT_DIR =
	process.env.DATA_ROOT_DIR || DATA_MOUNT_PATH + '/docker/volumes';
