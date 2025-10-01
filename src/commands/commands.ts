import type { Command } from '../utils/types.js';

import { addUser } from './add-user.js';
import { listUsers } from './list-users.js';
import { removeUser } from './remove-user.js';
import { status } from './status.js';
import { switchUser } from './switch-user.js';

export const Commands = {
  addUser: {
    name: 'add',
    alias: 'a',
    description: 'Adiciona um novo usuário',
    execute: addUser,
  },
  listUsers: {
    name: 'list',
    alias: 'l',
    description: 'Lista todos os usuários cadastrados',
    execute: listUsers,
  },
  switchUser: {
    name: 'switch',
    alias: 's',
    description: 'Alterna o usuário ativo pelo ID ou email',
    execute: switchUser,
  },
  removeUser: {
    name: 'remove',
    alias: 'rm',
    description: 'Remove um usuário pelo ID ou email',
    execute: removeUser,
  },
  status: {
    name: 'status',
    alias: 'st',
    description: 'Mostra o usuário ativo atual',
    execute: status,
  },
} satisfies Record<string, Command>;
