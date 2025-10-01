#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

function main() {
  yargs()
    .scriptName('gitusr')
    .usage('$0 <cmd> [args]')
    .command(
      'hello [name]',
      'welcome ter yargs!',
      yargs => {
        yargs.positional('name', {
          type: 'string',
          default: 'Cambi',
          describe: 'the name to say hello to',
        });
      },
      function (argv) {
        console.log('hello', argv.name, 'welcome to yargs!');
      }
    )
    .help()
    .parse(hideBin(process.argv));
}

main();
