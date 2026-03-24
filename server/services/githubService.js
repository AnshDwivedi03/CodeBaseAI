import simpleGit from 'simple-git';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const git = simpleGit();

export const cloneRepo = async (repoUrl) => {
  try {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const tempPath = path.join(os.tmpdir(), `codebase-ai-${Date.now()}-${repoName}`);

    console.log(`Cloning ${repoUrl} to ${tempPath}...`);

    // 3. Clone the repository
    await git.clone(repoUrl, tempPath);

    return tempPath;
  } catch (error) {
    console.error('Error cloning repo:', error);
    throw new Error('Failed to clone repository. Check the URL or your internet connection.');
  }
};
