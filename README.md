# CodeBaseAI 🦇

CodeBaseAI is a high-performance, AI-driven repository analysis and visualization system. It features a premium "Batman" aesthetic (Black & Gold glassmorphism) and leverages state-of-the-art RAG (Retrieval-Augmented Generation) to help you understand complex codebases instantly.

## 🚀 Technical Features

- **Ultra-Fast Inference**: Powered by **Groq** (Llama 3.1 8B) for near-instant responses.
- **Local Embeddings**: Uses **Transformers.js** (`Xenova/all-MiniLM-L6-v2`) to generate vector embeddings locally—ensuring privacy and zero cost for indexing.
- **RAG Architecture**: Intelligent similarity search using **Pinecone Vector Database**.
- **Visual Intelligence**: Automated architecture diagrams rendered via **Mermaid.js**.
- **State-of-the-Art UI**: Premium React frontend with frosted glass components and smooth micro-animations.

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have the following environment variables set in `server/.env`:
```env
GROQ_API_KEY=your_groq_key
PINECONE_API_KEY=your_pinecone_key
```

### 2. Run the Backend
```bash
cd server
npm install
npm start
```

### 3. Run the Frontend
```bash
cd client
npm install
npm start
```

## 📂 Project Structure
- **/client**: React frontend with Batman-themed CSS.
- **/server**: Node.js/Express API with RAG service layer.
- **services/**: Core logic for crawling, embedding, and querying.

## 🦇 Design System
CodeBaseAI utilizes a custom CSS design system inspired by high-end dark aesthetics:
- **Primary Color**: Batman Gold (`#f5b041`)
- **Background**: Deep Charcoal & Pure Black
- **UI FX**: Backdrop-blur (25px), gold-tinted borders, and pulse gradients.

---
© 2026 CodeBaseAI Industries
