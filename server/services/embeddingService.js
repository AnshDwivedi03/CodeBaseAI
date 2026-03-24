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

const ensureIndex = async (pinecone, indexName) => {
  const existingIndexes = await pinecone.listIndexes();
  const names = (existingIndexes.indexes || []).map((i) => i.name);
  if (!names.includes(indexName)) {
    console.log(`📦 Pinecone index "${indexName}" not found. Creating it...`);
    await retryWithBackoff(() => pinecone.createIndex({
      name: indexName,
      dimension: 384,
      metric: "cosine",
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    }));
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const desc = await retryWithBackoff(() => pinecone.describeIndex(indexName));
      if (desc.status?.ready) { ready = true; break; }
    }
    if (!ready) throw new Error(`Pinecone index "${indexName}" did not become ready in time.`);
    console.log(`✅ Pinecone index "${indexName}" created and ready.`);
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
    await ensureIndex(pinecone, indexName);
    const index = pinecone.index(indexName);
    const vectors = [];

    console.log(`🚀 Generating embeddings for ${files.length} files in namespace: ${namespace}...`);

    for (const file of files) {
      if (!file.content || file.content.trim() === "") continue;

      const embedding = await generateEmbedding(file.content);
      const id = Buffer.from(file.path).toString("base64");

      vectors.push({
        id,
        values: embedding,
        metadata: {
          path: file.path,
          content: file.content.substring(0, 1000), 
        },
      });

      if (vectors.length === 50) {
        await retryWithBackoff(() => index.namespace(namespace).upsert({ records: vectors }));
        vectors.length = 0;
        console.log(`✅ Upserted batch of 50 vectors to namespace: ${namespace}...`);
      }
    }

    if (vectors.length > 0) {
      await retryWithBackoff(() => index.namespace(namespace).upsert({ records: vectors }));
    }

    console.log(
      `✅ Successfully indexed ${files.length} files in Pinecone index: ${indexName} (namespace: ${namespace})`
    );
  } catch (error) {
    console.error("❌ Error indexing codebase:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    throw new Error(`Failed to index codebase: ${error.message}`);
  }
};