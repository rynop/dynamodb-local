import { ChildProcess } from 'child_process';

type argValues = '-cors' | '-dbPath' | '-delayTransientStatuses' | '-help' | '-inMemory' | '-optimizeDbBeforeStartup' | '-port' | '-sharedDb';

export interface InstallerConfig {
  installPath?: string;
  downloadUrl?: string;
}

export function configureInstaller(config: InstallerConfig): void;
export function launch(portNumber: number, dbPath?: string | null, args?: argValues[], verbose?: boolean, detached?: any, javaOpts?: string): Promise<ChildProcess>;
export function stop(portNumber: number): void;
export function stopChild(child: ChildProcess): void;
export function relaunch(portNumber: number, dbPath?:string): void;
