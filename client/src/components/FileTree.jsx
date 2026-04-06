import React, { useState, useMemo } from 'react';

/**
 * Builds a nested tree structure from flat file paths.
 * e.g. ["src/App.js", "src/index.js", "package.json"]
 * becomes { name: "root", children: [{ name: "src", children: [...] }, { name: "package.json" }] }
 */
function buildTree(paths, repoName) {
  const root = { name: repoName || 'Repository', children: [], isDir: true };

  paths.forEach(filePath => {
    const parts = filePath.split(/[/\\]/).filter(Boolean);
    let current = root;

    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      let child = current.children.find(c => c.name === part);

      if (!child) {
        child = { name: part, children: [], isDir: !isLast };
        current.children.push(child);
      }

      if (!isLast) {
        child.isDir = true;
      }

      current = child;
    });
  });

  // Sort: folders first, then files, alphabetically within each
  const sortTree = (node) => {
    if (node.children && node.children.length > 0) {
      node.children.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    }
  };
  sortTree(root);

  return root;
}

const FILE_ICONS = {
  js: '⬡', jsx: '⚛', ts: '◆', tsx: '⚛',
  json: '{ }', md: '◉', css: '◈', html: '◇',
  py: '◎', go: '◎', rs: '◎', java: '◎',
  yaml: '◆', yml: '◆', toml: '◆',
  env: '◇', lock: '◳', gitignore: '◻',
  png: '◫', jpg: '◫', svg: '◫', ico: '◫',
  default: '◻'
};

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function getFileColor(name) {
  const ext = name.split('.').pop().toLowerCase();
  const colors = {
    js: '#f5b041', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
    json: '#a0a0a0', md: '#ffffff', css: '#42a5f5', html: '#ef6c00',
    py: '#4caf50', go: '#00bcd4', rs: '#ff7043', java: '#f44336',
    yaml: '#ff9800', yml: '#ff9800', toml: '#ff9800',
    env: '#8bc34a', lock: '#616161', gitignore: '#616161',
    png: '#ce93d8', jpg: '#ce93d8', svg: '#ce93d8',
  };
  return colors[ext] || '#71717a';
}

/** TreeNode renders a single folder/file node with expand/collapse */
const TreeNode = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 1); // auto-expand root level

  const hasChildren = node.children && node.children.length > 0;
  const isDir = node.isDir;

  const handleToggle = () => {
    if (hasChildren) setExpanded(!expanded);
  };

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isDir ? 'tree-dir' : 'tree-file'} ${hasChildren && expanded ? 'tree-expanded' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleToggle}
        role="treeitem"
        aria-selected={false}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {/* Expand/Collapse chevron for folders */}
        {isDir ? (
          <span className={`tree-chevron ${expanded ? 'rotated' : ''}`}>
            ▸
          </span>
        ) : (
          <span className="tree-chevron tree-spacer" />
        )}

        {/* Icon */}
        <span className="tree-icon" style={{ color: isDir ? '#f5b041' : getFileColor(node.name) }}>
          {isDir ? (expanded ? '📂' : '📁') : getFileIcon(node.name)}
        </span>

        {/* Name */}
        <span className="tree-name" style={{ color: isDir ? '#f0f0f0' : '#b0b0b0' }}>
          {node.name}
        </span>

        {/* Item count badge for folders */}
        {isDir && node.children.length > 0 && (
          <span className="tree-badge">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="tree-children">
          {node.children.map((child, idx) => (
            <TreeNode key={`${child.name}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ filePaths, repoUrl }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const repoName = useMemo(() => {
    if (!repoUrl) return 'Repository';
    const parts = repoUrl.replace(/\/$/, '').split('/');
    return parts[parts.length - 1] || 'Repository';
  }, [repoUrl]);

  const tree = useMemo(() => buildTree(filePaths, repoName), [filePaths, repoName]);

  const filteredPaths = useMemo(() => {
    if (!searchTerm.trim()) return filePaths;
    const term = searchTerm.toLowerCase();
    return filePaths.filter(p => p.toLowerCase().includes(term));
  }, [filePaths, searchTerm]);

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return tree;
    return buildTree(filteredPaths, repoName);
  }, [filteredPaths, searchTerm, repoName, tree]);

  // Count folders and files
  const stats = useMemo(() => {
    const folders = new Set();
    filePaths.forEach(p => {
      const parts = p.split(/[/\\]/);
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    });
    return { folders: folders.size, files: filePaths.length };
  }, [filePaths]);

  if (!filePaths || filePaths.length === 0) return null;

  return (
    <div className="file-tree-section">
      <div className="file-tree-header">
        <div className="file-tree-title">
          <span>🗂</span> Complete File Tree
        </div>
        <div className="file-tree-stats">
          <span className="stat-chip">
            <span style={{ color: '#f5b041' }}>📁</span> {stats.folders} folders
          </span>
          <span className="stat-chip">
            <span style={{ color: '#71717a' }}>◻</span> {stats.files} files
          </span>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="file-tree-controls">
        <div className="tree-search-wrapper">
          <span className="tree-search-icon">⌕</span>
          <input
            type="text"
            className="tree-search-input"
            placeholder="Filter files..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="tree-search-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>
        {searchTerm && (
          <span className="tree-match-count">{filteredPaths.length} match{filteredPaths.length !== 1 ? 'es' : ''}</span>
        )}
      </div>

      {/* Tree */}
      <div className="file-tree-content" role="tree">
        <TreeNode node={filteredTree} depth={0} />
      </div>
    </div>
  );
};

export default FileTree;
