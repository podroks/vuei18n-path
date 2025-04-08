import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { findI18nFolderRecursive } from "./util";

export default async function () {
  const key = await vscode.window.showInputBox({
    prompt: "Enter the i18n key to search for (e.g., home.title)",
    placeHolder: "home.title",
  });

  if (!key) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("No folder is open.");
    return;
  }

  const i18nFolderPath = await findI18nFolderRecursive(
    workspaceFolders[0].uri.fsPath
  );
  if (!i18nFolderPath) {
    vscode.window.showErrorMessage("The 'i18n' folder was not found.");
    return;
  }

  const resultList: { lang: string; filePath: string; line: number }[] = [];

  const files = getAllJsonFilesRecursive(i18nFolderPath);

  searchKeyInFiles(files, i18nFolderPath, key, resultList);

  if (resultList.length === 0) {
    vscode.window.showInformationMessage(
      `Key "${key}" not found in i18n files.`
    );
    return;
  }

  const selected = await vscode.window.showQuickPick(
    resultList.map((r) => formatSelectOption(r)),
    { placeHolder: "Select a language where the key exists" }
  );

  if (!selected) {
    return;
  }

  const match = resultList.find((r) => formatSelectOption(r) === selected);
  if (!match) {
    return;
  }

  const doc = await vscode.workspace.openTextDocument(match.filePath);
  const editor = await vscode.window.showTextDocument(doc);
  const lineText = doc.lineAt(match.line).text;

  const keyName = key.split(".").pop() || "";
  const keyPos = lineText.indexOf(`"${keyName}"`);

  const start = new vscode.Position(match.line, keyPos >= 0 ? keyPos + 1 : 0);
  const end = new vscode.Position(
    match.line,
    keyPos >= 0 ? keyPos + keyName.length + 1 : 0
  );

  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(
    new vscode.Range(start, end),
    vscode.TextEditorRevealType.InCenter
  );
}

function getAllJsonFilesRecursive(dir: string): string[] {
  let results: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getAllJsonFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results;
}

function searchKeyInFiles(
  files: string[],
  i18nFolderPath: string,
  key: string,
  resultList: { lang: string; filePath: string; line: number }[]
) {
  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    let json: any;

    try {
      json = JSON.parse(content);
    } catch (e) {
      console.warn(`Invalid JSON file: ${file}`);
      continue;
    }

    const lang = detectLangFromPath(file);
    const langFolder = path.join(i18nFolderPath, lang);
    const relativePath = path.relative(langFolder, file);
    const prefixFromPath = relativePath
      .replace(/\\/g, "/")
      .replace(/\.json$/, "")
      .split("/")
      .join(".");

    let trimmedKey = key;

    if (trimmedKey.startsWith(`${prefixFromPath}.`)) {
      trimmedKey = trimmedKey.slice(prefixFromPath.length + 1);
    }

    const foundPath = findKeyPathInJson(json, trimmedKey);
    if (foundPath) {
      const lineIndex = findLineOfKey(content, foundPath);

      resultList.push({
        lang,
        filePath: file,
        line: lineIndex >= 0 ? lineIndex : 0,
      });
    }
  }
}

function findKeyPathInJson(
  obj: any,
  targetKey: string,
  parentKey = ""
): string | null {
  for (const key of Object.keys(obj)) {
    const currentPath = parentKey ? `${parentKey}.${key}` : key;

    if (currentPath === targetKey) {
      return currentPath;
    }

    if (typeof obj[key] === "object" && obj[key] !== null) {
      const result = findKeyPathInJson(obj[key], targetKey, currentPath);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

function detectLangFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  const i18nIndex = parts.lastIndexOf("i18n");
  return parts[i18nIndex + 1] || "unknown";
}

function findLineOfKey(content: string, fullKey: string): number {
  const keyParts = fullKey.split(".");
  const lines = content.split(/\r?\n/);
  let currentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(`"${keyParts[keyParts.length - 1]}"`)) {
      let match = true;
      for (let j = 0; j < keyParts.length - 1; j++) {
        const parentKey = keyParts[j];
        const parentFound = lines
          .slice(0, i)
          .some((l) => l.includes(`"${parentKey}"`));
        if (!parentFound) {
          match = false;
          break;
        }
      }
      if (match) {
        return i;
      }
    }
  }

  return 0;
}

function formatSelectOption(option: {
  lang: string;
  filePath: string;
  line: number;
}) {
  const steps = option.filePath.split(path.sep);
  const filePathFromLang = steps.slice(steps.indexOf("i18n") + 2).join(".");
  const lineNumber = option.line + 1;
  return `${option.lang} - ${filePathFromLang}:${lineNumber}`;
}
