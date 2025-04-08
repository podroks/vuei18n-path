import * as path from "path";
import * as vscode from "vscode";

export default async function () {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  const position = selection.start;
  const text = document.getText();

  const json = getJsonFromDocumentText(text);
  if (!json) {
    vscode.window.showErrorMessage("The file is not a valid JSON!");
    return;
  }

  const keyPath = getJsonKeyPathByLine(text, position.line + 1);
  if (!keyPath) {
    vscode.window.showErrorMessage("Unable to extract the key!");
    return;
  }

  const relativePath = getRelativePath(document.fileName);
  if (!relativePath) {
    vscode.window.showErrorMessage(
      "The file must be in a folder 'i18n/{locale}/'!"
    );
    return;
  }

  const fullKey = `${relativePath}.${keyPath}`;

  vscode.env.clipboard.writeText(fullKey);
  vscode.window.showInformationMessage(`${fullKey} (copied to clipboard)`);
}

function getJsonFromDocumentText(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    return;
  }
}

function getJsonKeyPathByLine(
  jsonText: string,
  targetLine: number
): string | null {
  const lines = jsonText.split("\n");
  if (targetLine < 1 || targetLine > lines.length) {
    return null;
  }

  interface MatchInfo {
    path: (string | number)[];
    line: number;
    key: string;
  }

  const json = JSON.parse(jsonText);
  const matches: MatchInfo[] = [];

  function walk(obj: any, path: (string | number)[]) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        walk(item, [...path, index]);
      });
    } else if (typeof obj === "object" && obj !== null) {
      for (const key of Object.keys(obj)) {
        const keyPattern = new RegExp(`"${key}"\\s*:`);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(keyPattern)) {
            const matchAlreadyFound = matches.find(
              (m) => m.line === i + 1 && m.key === key
            );
            if (!matchAlreadyFound) {
              matches.push({
                path: [...path, key],
                line: i + 1,
                key: key,
              });
              break;
            }
          }
        }

        walk(obj[key], [...path, key]);
      }
    }
  }

  walk(json, []);

  const found = matches.find((m) => m.line === targetLine);
  return found ? found.path.join(".") : null;
}

function getRelativePath(filePath: string): string | null {
  const parts = filePath.split(path.sep);
  const i18nIndex = parts.indexOf("i18n");
  if (i18nIndex === -1 || i18nIndex >= parts.length - 2) {
    return null;
  }

  const localeIndex = i18nIndex + 1;

  return parts
    .slice(localeIndex + 1)
    .join(".")
    .replace(".json", "");
}
