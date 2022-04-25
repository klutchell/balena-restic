export const BACKUP_CRON = process.env.BACKUP_CRON;

export const RESTIC_HOST = process.env.RESTIC_HOST;
export const RESTIC_TAGS = process.env.RESTIC_TAGS;

export const KEEP_YEARLY = process.env.RESTIC_KEEP_YEARLY || '3';
export const KEEP_MONTHLY = process.env.RESTIC_KEEP_MONTHLY || '12';
export const KEEP_WEEKLY = process.env.RESTIC_KEEP_WEEKLY || '5';
export const KEEP_DAILY = process.env.RESTIC_KEEP_DAILY || '7';
export const KEEP_HOURLY = process.env.RESTIC_KEEP_HOURLY || '24';

export const SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
export const SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;

export const BIND_ROOT_PATH = '/data';

export const INCLUDE_VOLUMES =
	process.env.INCLUDE_VOLUMES?.split(/[\s,;]+/) || [];
export const EXCLUDE_VOLUMES =
	process.env.EXCLUDE_VOLUMES?.split(/[\s,;]+/) || [];

// https://restic.readthedocs.io/en/latest/040_backup.html#environment-variables
export const RESTIC_ENV_VARS = [
	'RESTIC_REPOSITORY_FILE', // Name of file containing the repository location (replaces --repository-file)
	'RESTIC_REPOSITORY', // Location of repository (replaces -r)
	'RESTIC_PASSWORD_FILE', // Location of password file (replaces --password-file)
	'RESTIC_PASSWORD', // The actual password for the repository
	'RESTIC_PASSWORD_COMMAND', // Command printing the password for the repository to stdout
	'RESTIC_KEY_HINT', // ID of key to try decrypting first, before other keys
	'RESTIC_CACHE_DIR', // Location of the cache directory
	'RESTIC_PROGRESS_FPS', // Frames per second by which the progress bar is updated

	'TMPDIR', // Location for temporary files

	'AWS_ACCESS_KEY_ID', // Amazon S3 access key ID
	'AWS_SECRET_ACCESS_KEY', // Amazon S3 secret access key
	'AWS_DEFAULT_REGION', // Amazon S3 default region
	'AWS_PROFILE', // Amazon credentials profile (alternative to specifying key and region)
	'AWS_SHARED_CREDENTIALS_FILE', // Location of the AWS CLI shared credentials file (default: ~/.aws/credentials)

	'ST_AUTH', // Auth URL for keystone v1 authentication
	'ST_USER', // Username for keystone v1 authentication
	'ST_KEY', // Password for keystone v1 authentication

	'OS_AUTH_URL', // Auth URL for keystone authentication
	'OS_REGION_NAME', // Region name for keystone authentication
	'OS_USERNAME', // Username for keystone authentication
	'OS_USER_ID', // User ID for keystone v3 authentication
	'OS_PASSWORD', // Password for keystone authentication
	'OS_TENANT_ID', // Tenant ID for keystone v2 authentication
	'OS_TENANT_NAME', // Tenant name for keystone v2 authentication

	'OS_USER_DOMAIN_NAME', // User domain name for keystone authentication
	'OS_USER_DOMAIN_ID', // User domain ID for keystone v3 authentication
	'OS_PROJECT_NAME', // Project name for keystone authentication
	'OS_PROJECT_DOMAIN_NAME', // Project domain name for keystone authentication
	'OS_PROJECT_DOMAIN_ID', // Project domain ID for keystone v3 authentication
	'OS_TRUST_ID', // Trust ID for keystone v3 authentication

	'OS_APPLICATION_CREDENTIAL_ID', // Application Credential ID (keystone v3)
	'OS_APPLICATION_CREDENTIAL_NAME', // Application Credential Name (keystone v3)
	'OS_APPLICATION_CREDENTIAL_SECRET', // Application Credential Secret (keystone v3)

	'OS_STORAGE_URL', // Storage URL for token authentication
	'OS_AUTH_TOKEN', // Auth token for token authentication

	'B2_ACCOUNT_ID', // Account ID or applicationKeyId for Backblaze B2
	'B2_ACCOUNT_KEY', // Account Key or applicationKey for Backblaze B2

	'AZURE_ACCOUNT_NAME', // Account name for Azure
	'AZURE_ACCOUNT_KEY', // Account key for Azure

	'GOOGLE_PROJECT_ID', // Project ID for Google Cloud Storage
	'GOOGLE_APPLICATION_CREDENTIALS', // Application Credentials for Google Cloud Storage (e.g. $HOME/.config/gs-secret-restic-key.json)

	'RCLONE_BWLIMIT', // rclone bandwidth limit
];
