import type { Command } from '../utils/types.js';

import { addUser } from './add-user.js';
import { listUsers } from './list-users.js';
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
} satisfies Record<string, Command>;
