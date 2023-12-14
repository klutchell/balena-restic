# balena-restic

Rest easy knowing that your application data volumes are automatically and securely backed up to local or cloud storage!

## Features

- automatically mount application volumes
- encrypted snapshots are uploaded to your choice of local or cloud storage via [restic](https://restic.net/)
- snapshots are automatically pruned following a configurable retention policy
- application containers are stopped and restarted following data restore

## Usage

To use this image, add a service in your `docker-compose.yml` file as shown below.

```yml
services:
  ...
  restic:
    # where <arch> is one of aarch64, armv7hf or amd64
    image: bh.cr/gh_klutchell/balena-restic-<arch>
    labels:
      io.balena.features.supervisor-api: 1
    volumes:
      - cache:/cache
```

To pin to a specific version of this block use:

```yml
services:
  ...
  restic:
    # where <version> is the release semver or release commit ID
    image: bh.cr/gh_klutchell/balena-restic-<arch>/<version>
    labels:
      io.balena.features.supervisor-api: 1
    volumes:
      - cache:/cache
```

## Customization

### Environment Variables

| Name                | Description                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `RESTIC_REPOSITORY` | [Repository](https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html) for encrypted snapshots.                            |
| `RESTIC_PASSWORD`   | Repository password for encrypted snapshots. Set this once and avoid changing it!                                                       |
| `BACKUP_CRON`       | Cron schedule for creating backups. See [this page](https://crontab.guru/examples.html) for examples. Default is every 8 hours.         |
| `TZ`                | The timezone in your location. Find a [list of all timezone values here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). |
| `BACKUP_OPTS`       | Extra arguments to provide to the scheduled backup action. Defaults can be found in [config.ts](./lib/config.ts).                       |
| `PRUNE_OPTS`        | Extra arguments to provide to the scheduled prune action. Defaults can be found in [config.ts](./lib/config.ts).                        |
| `DRY_RUN`           | Set to true to add the `--dry-run` flag to all supported commands.                                                                      |
| `LOG_LEVEL`         | Control volume of logs sent to console. Default is `info`.                                                                              |

All restic environment variables are outlined [in their documentation](https://restic.readthedocs.io/en/latest/040_backup.html#environment-variables).

### Backup

Backups are executed automatically on a cron schedule and will back up all local volumes by default.

To backup manually you must open a shell in the `restic` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# create a new backup with optional args
npm run backup --tag=manual-reason
```

See all the available backup options here: <https://restic.readthedocs.io/en/latest/040_backup.html>

## List Snapshots

To list snapshots you must open a shell in the `restic` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# list snapshots with optional args
restic snapshots --group-by=hosts,tags,path
```

See all the available filter options here: <https://restic.readthedocs.io/en/latest/045_working_with_repos.html#listing-all-snapshots>

### Restore

To restore a snapshot you must open a shell in the `restic` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# restore a specific snapshot id or 'latest'
restic restore 4bba301e --target=/ -v -v
```

See all the available restore options here: <https://restic.readthedocs.io/en/latest/050_restore.html>

### Prune

Snapshot pruning is performed automatically after every backup following the policy in `PRUNE_OPTS`.

To manually prune you must open a shell in the `restic` service either via balena Dashboard or the balena CLI
and execute the following command(s):

```bash
# prune snapshots following your choice of policy
restic forget --prune --keep-daily=7 --keep-weekly=5 --keep-monthly=12 --keep-yearly=75 --dry-run
```

See all the available prune options here: <https://restic.readthedocs.io/en/latest/060_forget.html>

## Contributing

Please open an issue or submit a pull request with any features, fixes, or changes.
