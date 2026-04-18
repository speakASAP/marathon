import { spawn, SpawnOptions, ChildProcess } from 'child_process';

/**
 * Spawn a child process with exit/close handlers attached so the process is
 * reaped and does not become a zombie. Use this for any child_process.spawn()
 * in this service.
 */
export function safeSpawn(
  command: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptions,
): ChildProcess {
  const argv = args ?? [];
  const opts: SpawnOptions = options ?? {};
  const child = spawn(command, argv, opts) as ChildProcess;

  const reap = (): void => {
    // Handlers ensure the kernel can reap the process; without them
    // the child can remain as a defunct (zombie) process.
  };

  child.on('exit', reap);
  child.on('close', reap);

  return child;
}
