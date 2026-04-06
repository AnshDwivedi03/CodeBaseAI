import fs from 'fs/promises';
import path from 'path';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'out', 'coverage', '.next', '.cache']);
const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store']);
const ALLOWED_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.go', '.java', '.c', '.cpp', '.h', '.hpp',
  '.rs', '.php', '.rb', '.md', '.txt', '.json', '.html', '.css'
]);

export const crawlRepo = async (dirPath, currentPath = '') => {
  const fullPath = path.join(dirPath, currentPath);
  let files = [];

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const promises = entries.map(async (entry) => {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) return [];
        return await crawlRepo(dirPath, entryPath);
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) return [];
        
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) return [];

        try {
          const content = await fs.readFile(path.join(dirPath, entryPath), 'utf-8');
          return [{
            path: entryPath,
            content
          }];
        } catch (readError) {
          console.warn(`Failed to read file ${entryPath}:`, readError.message);
          return [];
        }
      }
      return [];
    });

    const results = await Promise.all(promises);
    files = results.flat();
  } catch (error) {
    console.error(`Error crawling directory ${fullPath}:`, error);
    throw error;
  }

  return files;
};
