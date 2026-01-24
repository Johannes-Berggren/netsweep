import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(execCb);

export async function exec(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command);
    return stdout;
  } catch (error) {
    return '';
  }
}
