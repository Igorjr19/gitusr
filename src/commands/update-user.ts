import { UserStorage } from '../utils/user-storage.js';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/errors.js';

export interface UpdateUserOptions {
  field: string;
  value: string;
  id?: string;
  email?: string;
  nickname?: string;
}

type UpdateableField = 'key' | 'name' | 'email' | 'nickname' | 'description';

const VALID_FIELDS: UpdateableField[] = [
  'key',
  'name',
  'email',
  'nickname',
  'description',
];

export async function updateUser(options: UpdateUserOptions): Promise<void> {
  const storage = new UserStorage();

  if (!options.id && !options.email && !options.nickname) {
    Logger.error(ErrorHandler.create('missingUserIdentifier'));
    Logger.warning(
      'Uso: gitusr update <campo> <valor> --id <user-id>\n' +
        'Exemplo: gitusr update key "/new_path" --id 12345'
    );
    return;
  }

  if (!options.field) {
    Logger.error('❌ Campo a ser atualizado não foi especificado');
    Logger.warning(
      'Uso: gitusr update <campo> <valor> --id <user-id>\n' +
        'Campos disponíveis: key, name, email, nickname, description'
    );
    return;
  }

  const field = options.field.toLowerCase() as UpdateableField;

  if (!VALID_FIELDS.includes(field)) {
    Logger.error(`❌ Campo inválido: ${options.field}`);
    Logger.warning(
      `Campos válidos: ${VALID_FIELDS.join(', ')}\n` +
        'Exemplo: gitusr update key "/new_path" --id 12345'
    );
    return;
  }

  if (!options.value && options.value !== '') {
    Logger.error('❌ Valor não foi especificado');
    Logger.warning(
      'Uso: gitusr update <campo> <valor> --id <user-id>\n' +
        'Exemplo: gitusr update name "João Silva" --id 12345'
    );
    return;
  }

  try {
    let userToUpdate;

    if (options.id) {
      userToUpdate = await storage.getUser(options.id);

      if (!userToUpdate) {
        Logger.error(ErrorHandler.create('userNotFoundById', options.id));
        return;
      }
    } else if (options.email) {
      const usersWithEmail = await storage.findUsersByEmail(options.email);

      if (usersWithEmail.length === 0) {
        Logger.error(ErrorHandler.create('userNotFoundByEmail', options.email));
        return;
      } else if (usersWithEmail.length > 1) {
        Logger.error(
          ErrorHandler.create(
            'multipleUsersWithEmail',
            options.email,
            usersWithEmail.length.toString()
          )
        );
        Logger.info('Usuários encontrados:');
        usersWithEmail.forEach((user, index) => {
          Logger.info(
            `  ${index + 1}. ${user.nickname || 'Sem apelido'} (ID: ${user.id.substring(0, 8)}...)`
          );
        });
        return;
      } else {
        userToUpdate = usersWithEmail[0];
      }
    } else if (options.nickname) {
      userToUpdate = await storage.findUserByNickname(options.nickname);

      if (!userToUpdate) {
        Logger.error(
          ErrorHandler.create('userNotFoundByNickname', options.nickname)
        );
        return;
      }
    } else {
      return;
    }

    if (!userToUpdate) {
      Logger.error(ErrorHandler.create('userNotFound'));
      return;
    }

    Logger.info(`🔧 Atualizando campo '${field}' do usuário...`);
    Logger.debug(`   Usuário: ${userToUpdate.name} (${userToUpdate.email})`);

    let success = false;

    switch (field) {
      case 'key':
        Logger.debug(`   Chave antiga: ${userToUpdate.sshKeyPath}`);
        Logger.debug(`   Chave nova: ${options.value}`);
        success = await storage.updateSshKeyPath(
          userToUpdate.id,
          options.value
        );
        if (success) {
          Logger.success('✅ Chave SSH atualizada com sucesso!');
        }
        break;

      case 'name':
        Logger.debug(`   Nome antigo: ${userToUpdate.name}`);
        Logger.debug(`   Nome novo: ${options.value}`);
        success = await storage.updateUserField(
          userToUpdate.id,
          'name',
          options.value
        );
        if (success) {
          Logger.success('✅ Nome atualizado com sucesso!');
        }
        break;

      case 'email':
        Logger.debug(`   Email antigo: ${userToUpdate.email}`);
        Logger.debug(`   Email novo: ${options.value}`);
        success = await storage.updateUserField(
          userToUpdate.id,
          'email',
          options.value
        );
        if (success) {
          Logger.success('✅ Email atualizado com sucesso!');
        }
        break;

      case 'nickname':
        Logger.debug(`   Nickname antigo: ${userToUpdate.nickname || 'N/A'}`);
        Logger.debug(`   Nickname novo: ${options.value || 'N/A'}`);
        success = await storage.updateUserField(
          userToUpdate.id,
          'nickname',
          options.value || undefined
        );
        if (success) {
          Logger.success('✅ Nickname atualizado com sucesso!');
        }
        break;

      case 'description':
        Logger.debug(
          `   Descrição antiga: ${userToUpdate.description || 'N/A'}`
        );
        Logger.debug(`   Descrição nova: ${options.value || 'N/A'}`);
        success = await storage.updateUserField(
          userToUpdate.id,
          'description',
          options.value || undefined
        );
        if (success) {
          Logger.success('✅ Descrição atualizada com sucesso!');
        }
        break;

      default:
        Logger.error(`❌ Campo não suportado: ${field}`);
        return;
    }

    if (!success) {
      Logger.error(`❌ Falha ao atualizar o campo '${field}'`);
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`❌ Erro ao atualizar usuário: ${error.message}`);
    } else {
      Logger.error('❌ Erro ao atualizar usuário');
    }
  }
}
