#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

import type {
  AddUserOptions,
  RemoveUserOptions,
  SwitchUserOptions,
} from './utils/types.js';

import { addUser } from './commands/add-user.js';
import { Commands } from './commands/commands.js';
import { listUsers } from './commands/list-users.js';
import { switchUser } from './commands/switch-user.js';
import { removeUser } from './commands/remove-user.js';
import { status } from './commands/status.js';

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
     * Alternar usuário
     */
    .command(
      [Commands.switchUser.name, Commands.switchUser.alias],
      chalk.yellow('Alterna para um usuário específico'),
      yargs => {
        return yargs
          .option('id', {
            type: 'string',
            describe: 'ID do usuário',
          })
          .option('email', {
            alias: 'e',
            type: 'string',
            describe: 'Email do usuário',
          })
          .check(argv => {
            if (!argv.id && !argv.email) {
              throw new Error('Você deve fornecer --id ou --email');
            }
            return true;
          })
          .example(
            `$0 ${Commands.switchUser.name} --id abc123`,
            'Alterna para usuário por ID'
          )
          .example(
            `$0 ${Commands.switchUser.name} --email joao@example.com`,
            'Alterna para usuário por email'
          );
      },
      async argv => {
        const options: SwitchUserOptions = {};
        if (argv.id) options.id = argv.id as string;
        if (argv.email) options.email = argv.email as string;
        await switchUser(options);
      }
    )

    /**
     * Remover usuário
     */
    .command(
      [Commands.removeUser.name, Commands.removeUser.alias],
      chalk.yellow('Remove um usuário Git'),
      yargs => {
        return yargs
          .option('id', {
            type: 'string',
            describe: 'ID do usuário',
          })
          .option('email', {
            alias: 'e',
            type: 'string',
            describe: 'Email do usuário',
          })
          .check(argv => {
            if (!argv.id && !argv.email) {
              throw new Error('Você deve fornecer --id ou --email');
            }
            return true;
          })
          .example(
            `$0 ${Commands.removeUser.name} --id abc123`,
            'Remove usuário por ID'
          )
          .example(
            `$0 ${Commands.removeUser.name} --email joao@example.com`,
            'Remove usuário por email'
          );
      },
      async argv => {
        const options: RemoveUserOptions = {};
        if (argv.id) options.id = argv.id as string;
        if (argv.email) options.email = argv.email as string;
        await removeUser(options);
      }
    )

    /**
     * Status atual
     */
    .command(
      [Commands.status.name, Commands.status.alias],
      chalk.yellow('Mostra o usuário ativo atual'),
      () => {},
      status
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
