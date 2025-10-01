import chalk from 'chalk';

export class Logger {
  static info(message: string) {
    console.log(chalk.blue(message));
  }

  static success(message: string) {
    console.log(chalk.green(message));
  }

  static warning(message: string) {
    console.log(chalk.yellow(message));
  }

  static error(message: string) {
    console.log(chalk.red(message));
  }

  static debug(message: string) {
    console.log(chalk.gray(message));
  }

  static default(message: string) {
    console.log(chalk.white(message));
  }

  static log(
    message: string,
    color: 'red' | 'green' | 'blue' | 'yellow' | 'gray' = 'gray'
  ) {
    const colorFunc = chalk[color] || chalk.gray;
    console.log(colorFunc(message));
  }

  static activeStatus(isActive: boolean): string {
    return isActive ? chalk.green('● ATIVO') : chalk.gray('○');
  }

  static indexNumber(index: number): string {
    return chalk.gray(`[${index}]`);
  }
}
