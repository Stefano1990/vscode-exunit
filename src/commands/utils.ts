import { dirname, relative } from "path";
import { ExtensionContext, window, workspace, Terminal } from "vscode";
export type Command = { cwd: string; cmd: string } | undefined;

const defaultRoot = "";
const terminalName = "ExUnit Test Run";

const getTerminal = (cwd: string): Terminal => {
  let terminal = window.terminals.find((term) => term.name === terminalName);

  if (terminal) {
    terminal.sendText(`cd ${cwd}`);
  } else {
    terminal =
      terminal || window.createTerminal({ name: terminalName, cwd: cwd });
  }

  return terminal;
};

const getConfigValue = (key: string): any =>
  workspace.getConfiguration("exunit").get(key);

const isInDirectory = (dir: string, file: string): Boolean =>
  !relative(dir, file).startsWith("..");

const isCloserToFile = (dir: string, otherDir: string): Boolean =>
  dir.length > otherDir.length;

const isFartherFromFile = (dir: string, otherDir: string): Boolean =>
  dir.length < otherDir.length;

const findFiles = async (glob: string): Promise<string[]> => {
  return workspace
    .findFiles(glob)
    .then((files) => files.map((file) => file.fsPath));
};

export function runLastCommand(context: ExtensionContext): void {
  const command: Command = context.workspaceState.get("exunit.lastCommand");

  if (command) {
    runCommand(context, command.cwd, command.cmd);
  } else {
    window.showErrorMessage("No previous command found.");
  }
}

export function runCommand(
  context: ExtensionContext,
  directory: string,
  command: string
): void {
  context.workspaceState.update("exunit.lastCommand", {
    cwd: directory,
    cmd: command,
  });

  const terminal = getTerminal(directory);
  if (getConfigValue("clearBetweenRuns")) terminal.sendText("clear");
  
  command = command + ' --color';

  terminal.sendText(command);
  terminal.show(true);
}

export async function findAppRoot(
  filePath: string,
  finder: (glob: string) => Promise<string[]> = findFiles
): Promise<string> {
  const mixFiles = await finder("**/mix.exs");

  if (!mixFiles || mixFiles.length <= 0) {
    return defaultRoot;
  }

  return mixFiles.reduce((acc: string, uri: string): string => {
    const dir = dirname(uri);

    if (isInDirectory(dir, filePath) && isCloserToFile(dir, acc)) {
      return dir;
    } else {
      return acc;
    }
  }, defaultRoot);
}

export async function findUmbrellaRoot(
  filePath: string,
  finder: (glob: string) => Promise<string[]> = findFiles
): Promise<string> {
  const mixFiles = await finder("**/mix.exs");

  if (!mixFiles || mixFiles.length <= 0) {
    return defaultRoot;
  }

  return mixFiles.reduce((acc: string, uri: string): string => {
    const dir = dirname(uri);

    if (
      isInDirectory(dir, filePath) &&
      (acc === defaultRoot || isFartherFromFile(dir, acc))
    ) {
      return dir;
    } else {
      return acc;
    }
  }, defaultRoot);
}
