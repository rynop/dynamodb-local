import { ChildProcess } from 'child_process';

declare module 'dynamodb-local' {
  type argValues = '-cors' | '-dbPath' | '-delayTransientStatuses' | '-help' | '-inMemory' | '-optimizeDbBeforeStartup' | '-port' | '-sharedDb';

  export interface InstallerConfig {
    installPath: string;
    downloadUrl: string;
  }

  namespace DynamoDbLocal {}

  export class DynamoDbLocal {
    static configureInstaller(config: InstallerConfig): void;
    static launch(portNumber: number, dbPath: string | null, args: argValues[], verbose?: boolean): Promise<ChildProcess>;
    static stop(portNumber: number): void;
  }

  export = DynamoDbLocal;
}
