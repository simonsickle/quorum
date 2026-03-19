import { ipcMain } from 'electron';
import { StackDetector } from '../services/stack/detector';
import { StackContextBuilder } from '../services/stack/context';

export function registerStackHandlers(): void {
  ipcMain.handle(
    'stack:detect',
    async (_event, repoPath: string, branch: string) => {
      const detector = new StackDetector();
      return detector.detectStack(repoPath, branch);
    }
  );

  ipcMain.handle(
    'stack:get-context',
    async (_event, repoPath: string, stackId: string) => {
      const builder = new StackContextBuilder();
      return builder.buildContext(repoPath, stackId);
    }
  );
}
