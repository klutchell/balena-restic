#!/usr/bin/env node

import { doRestore } from './renovate';

doRestore(process.argv.slice(2));
