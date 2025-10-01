import type { Command } from '../utils/types.js';

import { addUser } from './add-user.js';

export const Commands = {
  addUser: {
    name: 'add',
    alias: 'a',
    description: 'Adiciona um novo usuário',
    execute: addUser,
  },
} satisfies Record<string, Command>;
