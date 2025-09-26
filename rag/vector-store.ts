import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

interface VectorStoreConfig {
  openAIApiKey?: string;
  chromaUrl?: string;
  collectionName?: string;
}

class VectorStore {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: Chroma | null = null;
  private collectionName: string;

  constructor(config: VectorStoreConfig = {}) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openAIApiKey || process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small",
    });
    
    this.collectionName = config.collectionName || "noah-tool-components";
  }

  async initialize(): Promise<Chroma> {
    try {
      this.vectorStore = new Chroma(this.embeddings, {
        collectionName: this.collectionName,
        url: process.env.CHROMA_URL || "http://localhost:8000",
        collectionMetadata: {
          "hnsw:space": "cosine",
        },
      });
      
      console.log("✅ Vector store initialized successfully");
      return this.vectorStore;
    } catch (error) {
      console.error("❌ Error initializing vector store:", error);
      throw error;
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }
    
    try {
      await this.vectorStore!.addDocuments(documents);
      console.log(`✅ Added ${documents.length} documents to vector store`);
    } catch (error) {
      console.error("❌ Error adding documents:", error);
      throw error;
    }
  }

  async similaritySearch(query: string, k: number = 3): Promise<Document[]> {
    if (!this.vectorStore) {
      await this.initialize();
    }
    
    try {
      const results = await this.vectorStore!.similaritySearch(query, k);
      console.log(`🔍 Found ${results.length} similar documents for query: "${query}"`);
      return results;
    } catch (error) {
      console.error("❌ Error in similarity search:", error);
      throw error;
    }
  }

  async similaritySearchWithScore(query: string, k: number = 3): Promise<[Document, number][]> {
    if (!this.vectorStore) {
      await this.initialize();
    }
    
    try {
      const results = await this.vectorStore!.similaritySearchWithScore(query, k);
      console.log(`🔍 Found ${results.length} results with scores for: "${query}"`);
      return results;
    } catch (error) {
      console.error("❌ Error in similarity search with scores:", error);
      throw error;
    }
  }

  async deleteCollection(): Promise<void> {
    try {
      if (this.vectorStore) {
        await this.vectorStore.delete();
        console.log("🗑️ Collection deleted successfully");
      }
    } catch (error) {
      console.error("❌ Error deleting collection:", error);
      throw error;
    }
  }
}

export default VectorStore;
