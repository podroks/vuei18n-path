import * as fs from "fs";
import * as path from "path";

export async function findI18nFolderRecursive(
  dir: string,
  maxDepth = 3
): Promise<string | null> {
  if (maxDepth < 0) {
    return null;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "i18n") {
        return fullPath;
      }

      const deeper = await findI18nFolderRecursive(fullPath, maxDepth - 1);
      if (deeper) {
        return deeper;
      }
    }
  }

  return null;
}
