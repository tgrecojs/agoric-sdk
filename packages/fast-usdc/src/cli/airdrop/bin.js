#!/usr/bin/env node
import '@endo/init/legacy.js';
import { initProgram } from '../airdrop-cli.js';

const program = initProgram();
program.parse();
