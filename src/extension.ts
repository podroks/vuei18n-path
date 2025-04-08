import * as vscode from "vscode";

import extractorCommand from "./extractor/command";
import extractorContext from "./extractor/context";
import finderCommand from "./finder/command";
import finderContext, { desactivateFinderContext } from "./finder/context";

export function activate(context: vscode.ExtensionContext) {
  extractorContext(context);
  finderContext();

  const commands = [
    vscode.commands.registerCommand("vuei18n-path.extract", extractorCommand),
    vscode.commands.registerCommand("vuei18n-path.find", finderCommand),
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {
  desactivateFinderContext();
}
