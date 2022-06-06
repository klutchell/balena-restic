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
  volume-keeper:
    # where <arch> is one of aarch64, armv7hf or amd64
    image: bh.cr/gh_klutchell/volume-keeper-<arch>
    labels:
      io.balena.features.supervisor-api: 1
      io.balena.features.balena-socket: 1
    # note that any volumes added here are not eligible for backup
    # instead the eligible backup volumes are mounted automatically
    volumes:
      - cache:/cache
      - snapshots:/snapshots
```

To pin to a specific version of this block use:

```yml
version: "2"

volumes:
  cache:
  backups:

services:
  volume-keeper:
    # where <version> is the release semver or release commit ID
    image: bh.cr/gh_klutchell/volume-keeper-<arch>/<version>
    labels:
      io.balena.features.supervisor-api: 1
      io.balena.features.balena-socket: 1
    # note that any volumes added here are not eligible for backup
    # instead the eligible backup volumes are mounted automatically
    volumes:
      - cache:/cache
      - snapshots:/snapshots
```

## Customization

### Environment Variables

| Name                | Description                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RESTIC_REPOSITORY` | [Repository](https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html) for encrypted snapshots. Defaults to a local volume but offsite cloud storage is strongly recommended! |
| `RESTIC_PASSWORD`   | Repository password for encrypted snapshots. Do not change this unless you are starting a new repository!                                                                                  |
| `BACKUP_CRON`       | Cron schedule for creating backups. See [this page](https://crontab.guru/examples.html) for examples. Default is every 8 hours.                                                            |
| `TZ`                | The timezone in your location. Find a [list of all timezone values here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).                                                    |
| `INCLUDE_VOLUMES`   | Named volumes to include in backups. Default is all local volumes.                                                                                                                         |
| `EXCLUDE_VOLUMES`   | Named volumes to exclude from backups. Default is none.                                                                                                                                    |
| `BACKUP_OPTS`       | Arguments to pass to the scheduled backup command. Defaults to `--tag=scheduled`.                                                                                                          |
| `PRUNE_OPTS`        | Arguments to pass to the scheduled prune command. Defaults to `--tag=scheduled --keep-hourly=24 --keep-daily=7 --keep-weekly=5 --keep-monthly=12 --group-by=hosts,tags`.                   |
| `HOST`              | Set a preferred `--host` value for all commands. Defaults to the device name if supervised, or the hostname if standalone.                                                                 |
| `TAGS`              | Set a preferred `--tag` value for all commands.                                                                                                                                            |
| `DRY_RUN`           | Set to a true to add the `--dry-run` flag to all supported scheduled actions.                                                                                                              |

All restic environment variables are outlined [in their documentation](https://restic.readthedocs.io/en/latest/040_backup.html#environment-variables).

### Backup

Backups are executed automatically on a cron schedule and will back up all local volumes by default.

To backup manually you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# create a new backup with optional args
npm run backup --tag=manual-reason
```

See all the available backup options here: <https://restic.readthedocs.io/en/latest/040_backup.html>

## List Snapshots

To list snapshots you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# list snapshots with optional args
npm run list-snapshots --group-by=hosts,tags
```

See all the available filter options here: <https://restic.readthedocs.io/en/latest/045_working_with_repos.html#listing-all-snapshots>

### Restore

To restore a snapshot you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# restore a specific snapshot id or 'latest'
npm run restore 4bba301e
```

See all the available restore options here: <https://restic.readthedocs.io/en/latest/050_restore.html>

### Prune

Snapshot pruning is performed automatically after every backup following the policy in `PRUNE_OPTS`.

To manually prune you must open a shell in the `volume-keeper` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# prune snapshots following your choice of policy
npm run prune --keep-daily=7 --keep-weekly=5 --keep-monthly=12 --keep-yearly=75 --dry-run
```

See all the available prune options here: <https://restic.readthedocs.io/en/latest/060_forget.html>

## Contributing

Please open an issue or submit a pull request with any features, fixes, or changes.
