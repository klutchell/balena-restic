#!/usr/bin/env node

import { doBackup } from './renovate';

doBackup(process.argv.slice(2));
