import * as vscode from "vscode";
import * as path from "path";

const updateContext = (editor: vscode.TextEditor | undefined) => {
  if (!editor) {
    vscode.commands.executeCommand(
      "setContext",
      "vuei18n-path.isI18nJson",
      false
    );
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const isJson = filePath.endsWith(".json");
  const isInI18nFolder =
    filePath.includes(`${path.sep}i18n${path.sep}`) ||
    filePath.match(/[/\\]i18n([/\\]|$)/);

  const isI18nJson = isJson && isInI18nFolder;
  vscode.commands.executeCommand(
    "setContext",
    "vuei18n-path.isI18nJson",
    isI18nJson
  );
};

export default function (context: vscode.ExtensionContext) {
  // Appel initial
  updateContext(vscode.window.activeTextEditor);

  // À chaque changement d'éditeur
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateContext)
  );

  // À chaque sauvegarde de document
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      updateContext(vscode.window.activeTextEditor);
    })
  );
}
