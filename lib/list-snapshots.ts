#!/usr/bin/env node

import { doListSnapshots } from './renovate';

doListSnapshots(process.argv.slice(2));
