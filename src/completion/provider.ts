import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { findI18nFolderRecursive } from "../finder/util";

const SUPPORTED_LANGUAGES = [
  "vue",
  "vue-html",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact",
  "html",
  "json",
  "jsonc"
];

const TRIGGER_CHARACTERS = ["."];

export function registerTranslationCompletionProvider(
  context: vscode.ExtensionContext
) {
  const provider = new TranslationKeyCompletionProvider();

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      SUPPORTED_LANGUAGES,
      provider,
      ...TRIGGER_CHARACTERS
    )
  );

  const watcher = vscode.workspace.createFileSystemWatcher("**/i18n/**/*.json");

  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => provider.clearCache()),
    watcher.onDidCreate(() => provider.clearCache()),
    watcher.onDidDelete(() => provider.clearCache())
  );

  // 👇 Ajoute ce bloc :
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;

    const change = event.contentChanges[0];
    if (!change || change.text !== ".") return;

    const position = editor.selection.active;
    const document = editor.document;

    const prefixInfo = extractPrefix(document, position);
    if (!prefixInfo) return;

    vscode.commands.executeCommand("editor.action.triggerSuggest");
  });
}


class TranslationKeyCompletionProvider
  implements vscode.CompletionItemProvider<vscode.CompletionItem>
{
  private cache: { keys: string[]; timestamp: number } | null = null;
  private readonly cacheTtl = 3000;

  clearCache() {
    this.cache = null;
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[] | undefined> {
    const prefixInfo = extractPrefix(document, position);

    if (!prefixInfo) {
      return;
    }

    const { prefix, range } = prefixInfo;
    const keys = await this.getKeys();

    if (!keys.length) {
      return;
    }

    const normalizedPrefix = prefix.trim();
    let filtered: string[];

    // ✅ Dès qu’il y a un ".", on propose des suggestions
    if (normalizedPrefix.includes(".")) {
      const lastSegment = normalizedPrefix.replace(/^.*\./, ""); // partie après le dernier point
      filtered = lastSegment
        ? keys.filter((key) => key.includes(lastSegment))
        : keys;
    } else {
      return;
    }

    if (!filtered.length) {
      return;
    }

    return filtered.map((key) => {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Value
      );

      item.range = range;
      item.insertText = key;
      item.sortText = key;
      item.filterText = key;
      item.detail = "i18n";

      return item;
    });
  }

  private async getKeys(): Promise<string[]> {
    if (this.cache && Date.now() - this.cache.timestamp < this.cacheTtl) {
      return this.cache.keys;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    const allKeys = new Set<string>();

    for (const folder of workspaceFolders) {
      const i18nFolder = await findI18nFolderRecursive(folder.uri.fsPath);

      if (!i18nFolder) {
        continue;
      }

      const keys = collectKeysFromFolder(i18nFolder);

      for (const key of keys) {
        allKeys.add(key);
      }
    }

    const orderedKeys = Array.from(allKeys).sort();

    this.cache = { keys: orderedKeys, timestamp: Date.now() };

    return orderedKeys;
  }
}

function extractPrefix(
  document: vscode.TextDocument,
  position: vscode.Position
): { prefix: string; range: vscode.Range } | undefined {
  const lineText = document.lineAt(position.line).text;
  const linePrefix = lineText.slice(0, position.character);

  const prefixMatch = linePrefix.match(/[\w.-]*$/);
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const rangeStart = position.character - prefix.length;
  const beforePrefix = linePrefix.slice(0, rangeStart);

  const candidates: Array<{ index: number; char: string }> = [
    { index: beforePrefix.lastIndexOf("'"), char: "'" },
    { index: beforePrefix.lastIndexOf('"'), char: '"' },
    { index: beforePrefix.lastIndexOf("`"), char: "`" }
  ].filter((entry) => entry.index !== -1);

  if (!candidates.length) {
    return;
  }

  const quoteInfo = candidates.reduce((max, current) =>
    current.index > max.index ? current : max
  );

  if (quoteInfo.index === -1) {
    return;
  }

  const quoteCount = countUnescapedOccurrences(linePrefix, quoteInfo.char);

  if (quoteCount % 2 === 0) {
    return;
  }

  const start = new vscode.Position(position.line, rangeStart);
  const range = new vscode.Range(start, position);

  // 🚫 Si aucun point dans le préfixe (ex: "_global"), on n’affiche rien
  // ✅ Exception : si préfixe finit par '.' (ex: "_.", "_global.")
  if (!prefix.includes(".") && !prefix.endsWith(".")) {
    return;
  }

  return { prefix, range };
}

function countUnescapedOccurrences(text: string, char: string): number {
  let count = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== char) {
      continue;
    }

    if (isEscaped(text, i)) {
      continue;
    }

    count++;
  }

  return count;
}

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;

  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
    backslashCount++;
  }

  return backslashCount % 2 === 1;
}

function collectKeysFromFolder(i18nFolderPath: string): string[] {
  const jsonFiles = getAllJsonFiles(i18nFolderPath);
  const keys = new Set<string>();

  for (const filePath of jsonFiles) {
    let content: string;

    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      continue;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      continue;
    }

    if (typeof parsed !== "object" || parsed === null) {
      continue;
    }

    const basePrefix = buildPrefixFromPath(i18nFolderPath, filePath);

    collectKeysFromObject(parsed as Record<string, unknown>, basePrefix, keys);
  }

  return Array.from(keys);
}

function getAllJsonFiles(dir: string): string[] {
  let files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(getAllJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function buildPrefixFromPath(i18nFolderPath: string, filePath: string): string {
  const relativePath = path
    .relative(i18nFolderPath, filePath)
    .replace(/\\/g, "/");

  const segments = relativePath.split("/");

  if (segments.length === 0) {
    return "";
  }

  if (segments.length > 1) {
    segments.shift();
  }

  const fileName = segments.pop();

  if (!fileName) {
    return "";
  }

  if (segments.length === 0) {
    return fileName.replace(/\.json$/, "");
  }

  const prefixSegments = segments.concat(fileName.replace(/\.json$/, ""));

  return prefixSegments.join(".");
}

function collectKeysFromObject(
  obj: Record<string, unknown>,
  currentPath: string,
  keys: Set<string>
) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const nextPath = currentPath ? `${currentPath}.${key}` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      keys.add(nextPath);
      continue;
    }

    if (typeof value === "object") {
      collectKeysFromObject(value as Record<string, unknown>, nextPath, keys);
      continue;
    }

    keys.add(nextPath);
  }
}
