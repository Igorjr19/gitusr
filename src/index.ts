#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

import type { AddUserOptions } from './utils/types.js';

import { addUser } from './commands/add-user.js';
import { Commands } from './commands/commands.js';
import { listUsers } from './commands/list-users.js';

function main() {
  yargs(hideBin(process.argv))
    .scriptName('gitusr')
    .usage(chalk.blue('$0 <comando> [opções]'))

    /**
     * Adicionar usuário
     */
    .command(
      [Commands.addUser.name, Commands.addUser.alias],
      chalk.yellow('Adiciona um novo usuário Git'),
      yargs => {
        return yargs
          .option('name', {
            alias: 'n',
            type: 'string',
            describe: 'Nome do usuário',
            demandOption: true,
          })
          .option('email', {
            alias: 'e',
            type: 'string',
            describe: 'Email do usuário',
            demandOption: true,
          })
          .option('ssh-key', {
            alias: 's',
            type: 'string',
            describe: 'Caminho para a chave SSH privada',
            demandOption: true,
          })
          .option('description', {
            alias: 'd',
            type: 'string',
            describe: 'Descrição opcional do usuário',
          })
          .option('no-active', {
            type: 'boolean',
            describe: 'Não definir como usuário ativo após adicionar',
            default: false,
          })
          .example(
            `$0 ${Commands.addUser.name} -n "João Silva" -e "joao@example.com" -s "~/.ssh/id_rsa_joao"`,
            'Adiciona um novo usuário'
          );
      },
      async argv => {
        const options: AddUserOptions = {
          name: argv.name as string,
          email: argv.email as string,
          sshKeyPath: argv['ssh-key'] as string,
          setAsActive: !argv['no-active'],
        };
        if (argv.description) {
          options.description = argv.description as string;
        }
        await addUser(options);
      }
    )

    /**
     * Listar usuários
     */
    .command(
      [Commands.listUsers.name, Commands.listUsers.alias],
      chalk.yellow('Lista todos os usuários cadastrados'),
      () => {},
      async () => {
        await listUsers();
      }
    )

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
