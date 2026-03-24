import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline } from "@xenova/transformers";
import { Groq } from "groq-sdk";
import { retryWithBackoff } from "../utils.js";

let pc;
let groq;
let embedder;

const getEmbedder = async () => {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
};

const getGroq = () => {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set in environment variables.");
    }
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
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

export const queryCodebase = async (question, namespace = "default") => {
  try {
    const pinecone = getPC();
    const indexName = "repoinsight-groq"; 
    const index = pinecone.index(indexName);
    const ai = getGroq();
    const extractor = await getEmbedder();

    console.log(`🔍 Querying codebase for: "${question}" in namespace: ${namespace}`);

    // 1. Generate embedding for the question
    const output = await extractor(question, { pooling: 'mean', normalize: true });
    const questionEmbedding = Array.from(output.data);

    // 2. Search Pinecone for context
    const queryResponse = await retryWithBackoff(() => index.namespace(namespace).query({
      vector: questionEmbedding,
      topK: 10,
      includeMetadata: true,
    }));

    if (queryResponse.matches.length === 0) {
      return "I couldn't find any relevant code in this repository to answer your question.";
    }

    const context = queryResponse.matches
      .map((match) => `File: ${match.metadata.path}\nContent: ${match.metadata.content}`)
      .join('\n\n---\n\n');

    // 3. Generate the final answer using Groq
    const prompt = `
      You are "CodeBaseAI", an expert software engineer assistant.
      Use the provided code context below to answer the user's question about the repository.
      
      Rules:
      - If the answer isn't in the context, say "I don't have enough information in this codebase to answer that accurately."
      - Use markdown for code snippets and formatting.
      - Be concise but thorough.

      USER QUESTION: ${question}

      CODE CONTEXT:
      ${context}
    `;

    const chatCompletion = await retryWithBackoff(() => ai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.1-8b-instant",
    }));

    return chatCompletion.choices[0]?.message?.content || "No response generated.";

  } catch (error) {
    console.error('❌ Error during query:', error);
    throw new Error(`Failed to query codebase: ${error.message}`);
  }
};
