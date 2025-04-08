import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let watcher: vscode.FileSystemWatcher;

export function updateContext() {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (workspaceFolders && workspaceFolders.length > 0) {
    const found = workspaceFolders.some((folder) =>
      findI18nFolder(folder.uri.fsPath)
    );

    vscode.commands.executeCommand(
      "setContext",
      "vuei18n-path.hasI18nFolder",
      found
    );
  } else {
    vscode.commands.executeCommand(
      "setContext",
      "vuei18n-path.hasI18nFolder",
      false
    );
  }
}

function findI18nFolder(dir: string, maxDepth = 3): boolean {
  if (maxDepth < 0) {
    return false;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "i18n") {
        return true;
      }

      if (findI18nFolder(fullPath, maxDepth - 1)) {
        return true;
      }
    }
  }

  return false;
}

export default function () {
  // Appel initial
  updateContext();

  watcher = vscode.workspace.createFileSystemWatcher(
    "**/i18n",
    false,
    false,
    false
  );

  // Si le dossier i18n est créé
  watcher.onDidCreate(updateContext);

  // Si le dossier i18n est supprimé
  watcher.onDidDelete(updateContext);

  // Si le dossier i18n est modifié
  watcher.onDidChange(updateContext);
}

export function desactivateFinderContext() {
  watcher.dispose();
}
