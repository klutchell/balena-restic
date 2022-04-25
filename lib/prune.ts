#!/usr/bin/env node

import { doPrune } from './renovate';

doPrune(process.argv.slice(2));
