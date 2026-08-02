import * as build from './build.js';
import * as design from './design.js';
import * as qa from './qa.js';
import * as plan from './plan.js';
import * as status from './status.js';
import * as kb from './kb.js';
import * as rebuildKb from './rebuild-kb.js';
import type {
  ChatInputCommandInteraction,
  SharedSlashCommand,
} from 'discord.js';

export interface Command {
  data: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const commands: Command[] = [
  build,
  design,
  qa,
  plan,
  status,
  kb,
  rebuildKb,
];
