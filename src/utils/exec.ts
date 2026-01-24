import { $ } from 'bun';

export async function exec(command: string): Promise<string> {
  try {
    const result = await $`sh -c ${command}`.text();
    return result;
  } catch (error) {
    return '';
  }
}
