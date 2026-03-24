import { cloneRepo } from '../services/githubService.js';
import { crawlRepo } from '../services/crawlerService.js';
import { indexCodebase } from '../services/embeddingService.js';
import { queryCodebase } from '../services/queryService.js';
import { Groq } from 'groq-sdk';
import crypto from 'crypto';
const getNamespace = (repoUrl) => {
  return crypto.createHash('sha256').update(repoUrl).digest('hex').substring(0, 16);
};

const retryWithBackoff = async (fn, maxRetries = 6, initialDelay = 5000) => {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // 1. Broad detection of rate limits
      const errorStr = JSON.stringify(error).toLowerCase() + (error.message || '').toLowerCase();
      const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        errorStr.includes('429') || 
        errorStr.includes('exhausted') || 
        errorStr.includes('quota') ||
        errorStr.includes('403');

      if (isRateLimit && i < maxRetries - 1) {
        // 2. Try to extract specific retryDelay from Google's error metadata (e.g. "47s")
        let waitTime = delay;
        try {
          // Look for "retryDelay":"X s" in the stringified error
          const match = errorStr.match(/"retrydelay":"(\d+)s"/);
          if (match && match[1]) {
            waitTime = (parseInt(match[1]) + 2) * 1000; // Add 2s buffer
          }
        } catch (e) {
          console.warn("[Retry] Failed to parse retryDelay from error, using backoff.");
        }

        console.log(`[Gemini Quota] Limit hit. Waiting ${waitTime}ms before attempt ${i + 2}/${maxRetries}...`);
        await new Promise(res => setTimeout(res, waitTime));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

export const indexRepository = async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  try {
    const namespace = getNamespace(repoUrl);
    
    // 1. Clone
    const repoPath = await cloneRepo(repoUrl);
    
    // 2. Crawl
    const files = await crawlRepo(repoPath);
    
    // 3. Index
    await indexCodebase(files, undefined, namespace);

    res.status(200).json({
      message: 'Repository indexed successfully',
      namespace,
      fileCount: files.length
    });
  } catch (error) {
    console.error('Indexing Error:', error);
    res.status(500).json({ error: 'We encountered an issue indexing this repository. Please ensure the URL is correct and public.' });
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

  try {
    // 1. Clone & crawl (reuse existing services)
    const repoPath = await cloneRepo(repoUrl);
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

    // 4. Ask Gemini to generate both Diagram and Route Details
    const prompt = `
You are an expert software architect analyzing a codebase.
Map out the architecture of this repository.

Repository: ${repoUrl}

== FILE TREE ==
${fileTree}

== KEY FILE SNIPPETS ==
${keyFiles}

Instructions:
You must provide EXACTLY two outputs separated by custom boundaries.
Do not use markdown blocks (\`\`\`). Just use the exact boundaries below.

First, output the diagram inside these exact boundaries:
---MERMAID---
(your valid Mermaid.js flowchart code here, e.g. graph TD)
---END MERMAID---

Second, output the detailed components inside these exact boundaries:
---ROUTES---
[
  {
    "name": "Name of the API, Function, Database, etc.",
    "type": "API" | "Function" | "Database" | "Component",
    "desc": "Detailed 1-2 sentence description of what it does."
  }
]
---END ROUTES---
`;

    const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const result = await retryWithBackoff(async () => {
      return await ai.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Fast model compatible with Groq
        messages: [{ role: 'user', content: prompt }]
      });
    });

    const aiOutput = result.choices[0]?.message?.content || "";
    
    let diagram = 'graph TD\nError["Failed to parse diagram. Please retry."]';
    let routes = [];

    // Extract Mermaid
    const mermaidMatch = aiOutput.match(/---MERMAID---([\s\S]*?)---END MERMAID---/);
    if (mermaidMatch) {
      diagram = mermaidMatch[1]
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
        
      if (!diagram.startsWith('graph') && !diagram.startsWith('flowchart')) {
        diagram = 'graph TD\n' + diagram;
      }
    }

    // Extract Routes
    const routesMatch = aiOutput.match(/---ROUTES---([\s\S]*?)---END ROUTES---/);
    if (routesMatch) {
      const routesStr = routesMatch[1]
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      try {
        routes = JSON.parse(routesStr);
        if (!Array.isArray(routes)) routes = [];
      } catch (e) {
        console.error("Failed to parse AI JSON routes block", e);
      }
    }

    res.status(200).json({ diagram, routes, fileCount: files.length });



  } catch (error) {
    console.error('Diagram Error:', error);
    if (error.status) console.error('Error Status:', error.status);
    if (error.message) console.error('Error Message:', error.message);
    res.status(500).json({ error: 'Failed to generate diagram. Please try again.' });
  }
};
