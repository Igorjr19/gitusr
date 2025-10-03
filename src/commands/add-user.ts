import type { AddUserOptions } from '../utils/types.js';

import { SecureUserStorage } from '../utils/secure-user-storage.js';
import { Commands } from './commands.js';
import { Logger } from '../utils/logger.js';
import { GitManager } from '../utils/git-manager.js';
import { SshAgent } from '../utils/ssh-agent.js';
import { ErrorHandler } from '../utils/errors.js';

const command = Commands.addUser;

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateInput(options: AddUserOptions): boolean {
  const allFieldsPresent = options.name && options.email && options.sshKeyPath;

  if (!allFieldsPresent) {
    Logger.error(ErrorHandler.create('missingRequiredFields'));
    Logger.warning(
      `Uso: gitusr ${command.name} --name "Nome" --email "email@example.com" --ssh-key "/path/to/key"`
    );
    return false;
  }

  if (!isValidEmail(options.email)) {
    Logger.error(ErrorHandler.create('invalidEmail'));
    return false;
  }

  return true;
}

export async function addUser(options: AddUserOptions): Promise<void> {
  const storage = new SecureUserStorage();

  if (!validateInput(options)) {
    return;
  }

  try {
    Logger.info('🔧 Adicionando usuário...');

    const newUser = await storage.addUser(
      options.name.trim(),
      options.email.trim(),
      options.sshKeyPath.trim(),
      options.description?.trim(),
      options.nickname?.trim()
    );

    Logger.success('✅ Usuário adicionado com sucesso!');
    Logger.info(`\tID: ${newUser.id}`);
    Logger.info(`\tApelido: ${newUser.nickname || 'N/A'}`);
    Logger.info(`\tNome: ${newUser.name}`);
    Logger.info(`\tEmail: ${newUser.email}`);
    Logger.info(`\tSSH Key: ${newUser.sshKeyPath}`);

    if (newUser.description) {
      Logger.info(`\tDescrição: ${newUser.description}`);
    }

    const shouldSetAsActive = options.setAsActive !== false;
    if (shouldSetAsActive) {
      try {
        Logger.info('🔄 Ativando usuário...');

        await storage.setActiveUser(newUser.id);

        const gitManager = new GitManager();
        if (gitManager.isGitAvailable()) {
          gitManager.setGlobalConfig(newUser.name, newUser.email);
        } else {
          Logger.warning(
            '⚠️  Git não disponível - configuração global não aplicada'
          );
        }

        const sshAgent = new SshAgent();
        try {
          await sshAgent.loadKey(newUser.sshKeyPath);
          Logger.success('🔑 Chave SSH carregada');
        } catch (sshError) {
          Logger.warning(`⚠️  Erro ao carregar chave SSH: ${sshError}`);
        }

        Logger.success('🎯 Usuário definido como ativo e configurado no Git.');
      } catch (activationError) {
        Logger.error(
          `${ErrorHandler.create('userActivationFailed')}: ${activationError}`
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`${ErrorHandler.create('addUserFailed')}: ${error.message}`);
    } else {
      Logger.error(ErrorHandler.create('addUserFailed'));
    }
  }
}
