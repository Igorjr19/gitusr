#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

function main() {
  yargs(hideBin(process.argv))
    .scriptName('gitusr')
    .usage(chalk.blue('$0 <comando> [opções]'))

    /**
     * Comandos mínimos
     */
    .demandCommand(1, chalk.red('Você deve especificar um comando'))

    /**
     * Ajuda
     */
    .help('h')
    .alias('h', 'help')

    /**
     * Versão
     */
    .version('gitusr 1.0.0')
    .alias('v', 'version')

    /**
     * Mais informações
     */
    .epilog(
      chalk.gray(
        'Para mais informações, visite: https://github.com/Igorjr19/gitusr'
      )
    )

    .parse();
}

main();
