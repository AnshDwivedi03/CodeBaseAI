import { cloneRepo } from '../services/githubService.js';
import { crawlRepo } from '../services/crawlerService.js';
import { indexCodebase } from '../services/embeddingService.js';
import { queryCodebase } from '../services/queryService.js';
import { Groq } from 'groq-sdk';
import crypto from 'crypto';
import { retryWithBackoff } from '../utils.js';
import fs from 'fs/promises';
const getNamespace = (repoUrl) => {
  return crypto.createHash('sha256').update(repoUrl).digest('hex').substring(0, 16);
};

// Removed local retryWithBackoff and imported from utils.js

export const indexRepository = async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  let repoPath = null;

  try {
    const namespace = getNamespace(repoUrl);
    
    // 1. Clone
    repoPath = await cloneRepo(repoUrl);
    
    // 2. Crawl
    const files = await crawlRepo(repoPath);
    
    // 3. Index
    await retryWithBackoff(() => indexCodebase(files, undefined, namespace));

    res.status(200).json({
      message: 'Repository indexed successfully',
      namespace,
      fileCount: files.length
    });
  } catch (error) {
    console.error('Indexing Error:', error);
    res.status(500).json({ error: 'We encountered an issue indexing this repository. Please ensure the URL is correct and public.' });
  } finally {
    if (repoPath) {
      await fs.rm(repoPath, { recursive: true, force: true }).catch(e => console.error("Failed to delete temp dir:", e));
    }
  }
};

/**
 * POST /api/query
 * Body: { repoUrl, question }
 */
export const askQuestion = async (req, res) => {
  const { repoUrl, question } = req.body;

  if (!repoUrl || !question) {
    return res.status(400).json({ error: 'repoUrl and question are required' });
  }

  try {
    const namespace = getNamespace(repoUrl);
    const answer = await queryCodebase(question, namespace);

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Query Error:', error);
    res.status(500).json({ error: 'CodeBaseAI is having trouble processing your request right now. Please try again in a moment.' });
  }
};
/**
 * POST /api/diagram
 * Body: { repoUrl }
 * Returns a Mermaid.js diagram of the repo architecture.
 */
export const generateDiagram = async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });

  let repoPath = null;

  try {
    // 1. Clone & crawl (reuse existing services)
    repoPath = await cloneRepo(repoUrl);
    const files = await crawlRepo(repoPath);

    if (files.length === 0) {
      return res.status(422).json({ error: 'No indexable files found in this repository.' });
    }

    // 2. Build a compact file-tree summary (paths only, no content)
    const fileTree = files.map(f => f.path).join('\n');

    // 3. Also grab a snippet of key files (entry points, routes, controllers)
    const keyFiles = files
      .filter(f => {
        const lower = f.path.toLowerCase();
        return lower.includes('index') || lower.includes('app') ||
               lower.includes('route') || lower.includes('controller') ||
               lower.includes('service') || lower.includes('main') ||
               lower.includes('server') || lower.includes('mod') ||
               lower.includes('handler');
      })
      .slice(0, 5) // Reduced from 15 to 5 to avoid token limits
      .map(f => `--- ${f.path} ---\n${f.content.substring(0, 500)}`)
      .join('\n\n');

    console.log(`[Diagram] Prompting Gemini for ${repoUrl}. Files: ${files.length}, Key Files Snippet Length: ${keyFiles.length} chars.`);

    // 4. Ask AI to generate an arrow-based HLD architecture diagram
    const prompt = `Analyze this codebase and create an architecture diagram.

Repository: ${repoUrl}

FILE TREE:
${fileTree}

KEY FILES:
${keyFiles}

Return TWO sections with exact boundaries below. No markdown code fences.

SECTION 1 - Mermaid flowchart:
- Start with: flowchart TD
- Use ONLY simple node IDs like A, B, C or short words like CLIENT, API, DB
- Use arrows: A["Label"] --> B["Label"]  
- Use labeled arrows: A -->|"description"| B
- Keep it to 8-12 nodes maximum
- DO NOT use subgraph, style, classDef, or class keywords
- Every node label MUST be in double quotes inside brackets: A["My Label"]
- NO parentheses or special characters in labels
- DO NOT use shape suffixes like (.circle), (.diamond), (.hexagon), etc.
- ONLY use square brackets for node shapes: A["Label"]
- DO NOT append anything after the closing bracket of a node

Example:
---MERMAID---
flowchart TD
    A["React Frontend"] -->|"API calls"| B["Express Server"]
    B --> C["Auth Controller"]
    B --> D["User Controller"]
    C --> E["JWT Service"]
    D --> F["Database"]
---END MERMAID---

SECTION 2 - Component details as JSON:
---ROUTES---
[{"name":"Component","type":"API","desc":"Description"}]
---END ROUTES---`;

    const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const result = await retryWithBackoff(async () => {
      return await ai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a software architect. Output ONLY the requested format. No extra text, no markdown fences, no explanations.' },
          { role: 'user', content: prompt }
        ]
      });
    });

    const aiOutput = result.choices[0]?.message?.content || "";
    
    let diagram = '';
    let routes = [];

    console.log('[Diagram] Raw AI output length:', aiOutput.length);
    console.log('[Diagram] Raw AI output preview:', aiOutput.substring(0, 800));

    // Deterministically build the Mermaid flowchart mapping EVERY file and folder
    const repoName = repoUrl.split('/').pop() || 'Repository';
    diagram = 'flowchart LR\n';
    diagram += `    ROOT["${repoName}"]\n`;

    const nodeSet = new Set(['ROOT']);
    const edgeSet = new Set();

    files.forEach(f => {
      const parts = f.path.split(/[/\\]/).filter(Boolean);
      let parentId = 'ROOT';
      let currentPath = '';

      parts.forEach(part => {
        // Sanitize node ID
        currentPath += (currentPath ? '_' : '') + part.replace(/[^a-zA-Z0-9]/g, '_');
        const nodeId = `N_${currentPath}`;

        if (!nodeSet.has(nodeId)) {
          diagram += `    ${nodeId}["${part}"]\n`;
          nodeSet.add(nodeId);
        }

        const edge = `    ${parentId} --> ${nodeId}`;
        if (!edgeSet.has(edge)) {
          diagram += `${edge}\n`;
          edgeSet.add(edge);
        }

        parentId = nodeId;
      });
    });

    console.log('[Diagram] Generated deterministic file tree diagram with', nodeSet.size, 'nodes.');

    // Extract Routes
    const routesMatch = aiOutput.match(/---ROUTES---\s*([\s\S]*?)\s*---END ROUTES---/);
    if (routesMatch) {
      const routesStr = routesMatch[1]
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
      try {
        routes = JSON.parse(routesStr);
        if (!Array.isArray(routes)) routes = [];
      } catch (e) {
        console.error("Failed to parse AI JSON routes block:", e.message);
        // Try to extract partial JSON
        try {
          const fixedStr = routesStr.replace(/,\s*\]/g, ']'); // remove trailing commas
          routes = JSON.parse(fixedStr);
          if (!Array.isArray(routes)) routes = [];
        } catch (e2) {
          routes = [];
        }
      }
    }

    const filePaths = files.map(f => f.path);
    res.status(200).json({ diagram, routes, fileCount: files.length, filePaths });



  } catch (error) {
    console.error('Diagram Error:', error);
    if (error.status) console.error('Error Status:', error.status);
    if (error.message) console.error('Error Message:', error.message);
    res.status(500).json({ error: 'Failed to generate diagram. Please try again.' });
  } finally {
    if (repoPath) {
      await fs.rm(repoPath, { recursive: true, force: true }).catch(e => console.error("Failed to delete temp dir:", e));
    }
  }
};
