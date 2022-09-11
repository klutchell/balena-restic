#!/usr/bin/env node

import { doBackup } from './restic';

doBackup(process.argv.slice(2));
