#!/usr/bin/env node

import { doRestore } from './restic';

doRestore(process.argv.slice(2));
