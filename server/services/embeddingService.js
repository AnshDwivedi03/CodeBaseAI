import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import { retryWithBackoff } from "../utils.js";

let pc;
let embedder;

const getEmbedder = async () => {
  if (!embedder) {
    console.log("Downloading/Loading local embedding model (Xenova/all-MiniLM-L6-v2)...");
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

const getPC = () => {
  if (!pc) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in environment variables.");
    }
    pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pc;
};

export const generateEmbedding = async (text) => {
  try {
    const extractor = await getEmbedder();
    const truncated = text.length > 8000 ? text.substring(0, 8000) : text;
    const output = await extractor(truncated, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("❌ Error generating local embedding:", error.message);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

export const indexCodebase = async (
  files,
  onProgress,
  namespace = "default"
) => {
  try {
    const pinecone = getPC();
    const indexName = "repoinsight-groq";
    
    // Using Pinecone SDK v7's createIndex directly with suppressConflicts.
    try {
      await pinecone.createIndex({
        name: indexName,
        dimension: 384,
        metric: "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
        suppressConflicts: true
      });
    } catch (createErr) {
      // Ignore if index already exists or suppressConflicts fails on old tier
      console.log(`Index ${indexName} might already exist or createIndex threw:`, createErr.message || createErr);
    }
    const index = pinecone.index(indexName);
    const vectors = [];

    console.log(`🚀 Generating embeddings for ${files.length} files in namespace: ${namespace}...`);

    const validFiles = files.filter(f => f.content && f.content.trim() !== "");
    const batchSize = 25;

    for (let i = 0; i < validFiles.length; i += batchSize) {
      const chunk = validFiles.slice(i, i + batchSize);
      
      const batchVectors = (await Promise.all(
        chunk.map(async (file) => {
          try {
            const embedding = await generateEmbedding(file.content);
            const id = Buffer.from(file.path).toString("base64");
            return {
              id,
              values: embedding,
              metadata: {
                path: file.path,
                content: file.content.substring(0, 1000), 
              },
            };
          } catch (fileErr) {
            console.warn(`⚠️ Skipped embedding for ${file.path}: ${fileErr.message}`);
            return null;
          }
        })
      )).filter(Boolean);

      if(batchVectors.length > 0) {
        await retryWithBackoff(() => index.namespace(namespace).upsert({ records: batchVectors }));
        console.log(`✅ Upserted batch of ${batchVectors.length} vectors to namespace: ${namespace}... (${Math.min(i + batchSize, validFiles.length)}/${validFiles.length})`);
      }
    }

    console.log(
      `✅ Successfully indexed ${validFiles.length} files in Pinecone index: ${indexName} (namespace: ${namespace})`
    );
  } catch (error) {
    console.error("❌ Error indexing codebase:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw new Error(`Failed to index codebase: ${error.message}`);
  }
};