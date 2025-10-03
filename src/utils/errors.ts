export const Errors = {
  // Erros de dados/criptografia
  corruptedEncryptedData: 'Dados criptografados corrompidos',
  userExistsWithEmail: 'Usuário com este email já existe',

  // Erros de SSH
  sshFileNotFound: 'Arquivo de chave SSH não encontrado',
  sshAgentNotRunning:
    'SSH agent não está rodando. Execute: eval "$(ssh-agent -s)"',
  sshKeyLoadFailed: 'Erro ao carregar chave SSH',
  sshKeyUnloadFailed: 'Erro ao remover chave SSH',
  sshKeyPermissions:
    'Chave SSH tem permissões inseguras. Recomendado: chmod 600',

  // Erros de Git
  gitNotAvailable: 'Git não está disponível no sistema',
  gitConfigFailed: 'Erro ao configurar Git',
  gitConfigReadFailed: 'Erro ao ler configurações do Git',
  gitConfigRemoveFailed: 'Erro ao remover configurações do Git',

  // Erros de validação de entrada
  missingRequiredFields: 'Nome, email e caminho da chave SSH são obrigatórios',
  invalidEmail: 'Email deve ser válido',
  missingUserIdentifier: 'ID do usuário, email ou apelido é obrigatório',

  // Erros de usuário
  userNotFound: 'Usuário não encontrado',
  userNotFoundById: (id: string) => `Usuário com ID ${id} não encontrado`,
  userNotFoundByEmail: (email: string) =>
    `Usuário com email ${email} não encontrado`,
  userNotFoundByNickname: (nickname: string) =>
    `Usuário com apelido ${nickname} não encontrado`,
  multipleUsersWithEmail: (email: string, count: string) =>
    `Encontrados ${count} usuários com email ${email}. Use --nickname ou --id para especificar`,
  userRemovalFailed: 'Falha ao remover o usuário',
  userActivationFailed: 'Erro ao ativar usuário',
  userAlreadyActive: 'O usuário selecionado já está ativo',
  duplicateUserData:
    'Já existe um usuário com este email, nickname e chave SSH',

  // Erros gerais
  unknownError: 'Erro desconhecido',
  addUserFailed: 'Erro ao adicionar usuário',
  switchUserFailed: 'Erro ao alternar usuário',
  removeUserFailed: 'Erro ao remover usuário',
  listUsersFailed: 'Erro ao listar usuários',
  statusFailed: 'Erro ao obter status',

  // Erros de sistema
  systemGitUnavailable: 'Git não disponível - configuração global não aplicada',
  systemConfigReadError: 'Erro ao verificar configurações',
  systemCleanupError: 'Erro durante limpeza do sistema',
} as const;

export type ErrorKey = keyof typeof Errors;
export type ErrorMessage = (typeof Errors)[ErrorKey];

export class ErrorHandler {
  static format(message: string): string {
    return `❌ ${message}`;
  }

  static formatWarning(message: string): string {
    return `⚠️  ${message}`;
  }

  static get(key: ErrorKey, ...args: string[]): string {
    const errorValue = Errors[key];

    if (typeof errorValue === 'function') {
      return (errorValue as (...params: string[]) => string)(...args);
    }

    return errorValue as string;
  }

  static create(key: ErrorKey, ...args: string[]): string {
    return this.format(this.get(key, ...args));
  }

  static createWarning(key: ErrorKey, ...args: string[]): string {
    return this.formatWarning(this.get(key, ...args));
  }
}
