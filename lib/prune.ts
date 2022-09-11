#!/usr/bin/env node

import { doPrune } from './restic';

doPrune(process.argv.slice(2));
