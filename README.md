# volume-keeper

Rest easy knowing that your application data volumes are automatically and securely backed up to local or cloud storage!

## Features

- supports running in "supervised" mode with balenaOS or in "standalone" mode via docker-compose
- automatically detect local volumes in the same project namespace
- encrypted snapshots are uploaded to your choice of local or cloud storage via [restic](https://restic.net/)
- snapshots are automatically pruned following a configurable retention policy
- application containers are stopped and restarted following data restore (supervised only)

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

### Backup

Backups are executed automatically on a cron schedule and will back up all local volumes by default.

To backup manually you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# create a new backup with optional host and tags
npm run backup --host=my-device --tag=manual-reason
```

See all the available backup options here: <https://restic.readthedocs.io/en/latest/040_backup.html>

### Restore

To restore manually you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# list existing snapshots
restic snapshots

# restore a specific snapshot id or 'latest'
npm run restore 4bba301e
```

See all the available restore options here: <https://restic.readthedocs.io/en/latest/050_restore.html>

### Prune

Backups are executed automatically on a cron schedule and will back up all local volumes by default.

To backup manually you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# forget (prune) snapshots following your choice of policy
npm run prune --keep-daily 7 --keep-weekly 5 --keep-monthly 12 --keep-yearly 75 --dry-run
```

See all the available forget (prune) options here: <https://restic.readthedocs.io/en/latest/060_forget.html>

## Customization

### Environment Variables

| Name                | Description                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `TZ`                | The timezone in your location. Find a [list of all timezone values here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). |
| `RESTIC_REPOSITORY` | Restic repository path for encrypted snapshots. Defaults to a local volume but offsite cloud storage is strongly recommended!           |
| `RESTIC_PASSWORD`   | Restic repository password for encrypted snapshots. Do not change this unless you are starting a new repository!                        |
| `BACKUP_CRON`       | Cron schedule for creating backups. See [this page](https://crontab.guru/examples.html) for examples. Default is every 8 hours.         |
| `INCLUDE_VOLUMES`   | Named volumes to include in backups. Default is including all volumes managed by the supervisor.                                        |
| `EXCLUDE_VOLUMES`   | Named volumes to exclude from backups. Default is excluding no volumes except the ones used by volume-keeper.                           |

All restic environment variables are outlined [in their documentation](https://restic.readthedocs.io/en/latest/040_backup.html#environment-variables).

## Contributing

Please open an issue or submit a pull request with any features, fixes, or changes.
