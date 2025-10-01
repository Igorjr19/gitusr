import type { Command } from '../utils/types.js';

import { addUser } from './add-user.js';
import { listUsers } from './list-users.js';

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
} satisfies Record<string, Command>;
