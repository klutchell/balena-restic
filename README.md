# volume-keeper

Rest easy knowing that your application data volumes are automatically and securely backed up to local or cloud storage!

## Features

- automatically detect application volumes via the balena Supervisor
- encrypted snapshots are uploaded to your choice of local or cloud storage via [restic](https://restic.net/)
- snapshots are automatically pruned following a retention policy
- application containers are stopped and restarted following data restore

## Usage

To use this image, add a service in your `docker-compose.yml` file as shown below.

```yml
version: "2"

volumes:
  cache:
  backups:

services:
  browser:
    image: bh.cr/klutchell/volume-keeper-<arch> # where <arch> is one of aarch64, arm32 or amd64
    labels:
      io.balena.features.supervisor-api: 1
      io.balena.features.balena-socket: 1
    volumes:
      - cache:/cache
      - snapshots:/snapshots
```

To pin to a specific version of this block use:

```yml
services:
  browser:
    image: bh.cr/klutchell/volume-keeper-<arch>/<version>
    labels:
      io.balena.features.supervisor-api: 1
      io.balena.features.balena-socket: 1
    volumes:
      - cache:/cache
      - snapshots:/snapshots
```

### Restore

List existing snapshots with `restic snapshots` in a container shell.

Set to a specific snapshot or `latest` to pause backups and perform a restore.

## Customization

### Environment Variables

| Name                | Description                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `TZ`                | The timezone in your location. Find a [list of all timezone values here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). |
| `RESTIC_REPOSITORY` | Restic repository path for encrypted snapshots. Defaults to local volume, or USB storage if detected.                                   |
| `RESTIC_PASSWORD`   | Restic repository password for encrypted snapshots. Only change this if you also change the repository path.                            |
| `BACKUP_CRON`       | Cron schedule for creating backups. See [this page](https://crontab.guru/examples.html) for examples. Default is every 8 hours.         |
| `INCLUDE_VOLUMES`   | Named volumes to include in backups. Default is including all volumes managed by the supervisor.                                        |
| `EXCLUDE_VOLUMES`   | Named volumes to exclude from backups. Default is excluding no volumes except the ones used by volume-keeper.                           |

All restic environment variables are outlined [in their documentation](https://restic.readthedocs.io/en/latest/040_backup.html#environment-variables).

## Contributing

Please open an issue or submit a pull request with any features, fixes, or changes.
