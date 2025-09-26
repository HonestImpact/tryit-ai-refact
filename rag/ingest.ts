import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Document } from "@langchain/core/documents";
import VectorStore from './vector-store';

interface ComponentMetadata {
  component_type: string;
  title: string;
  description: string;
  features: string[];
  use_cases: string[];
  filename?: string;
  filepath?: string;
  source?: string;
  ingested_at?: string;
}

class ComponentIngester {
  private vectorStore: VectorStore;
  private componentsDir: string;

  constructor() {
    this.vectorStore = new VectorStore();
    this.componentsDir = path.join(process.cwd(), 'rag', 'components');
  }

  async loadComponentFiles(): Promise<Document[]> {
    const documents: Document[] = [];
    
    try {
      const files = fs.readdirSync(this.componentsDir);
      const htmlFiles = files.filter(file => file.endsWith('.html'));
      
      console.log(`📁 Found ${htmlFiles.length} HTML component files`);
      
      for (const file of htmlFiles) {
        const filePath = path.join(this.componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract metadata from the HTML
        const metadata = this.extractMetadata(content, file);
        
        // Create document with content and metadata
        const doc = new Document({
          pageContent: content,
          metadata: {
            ...metadata,
            filename: file,
            filepath: filePath,
            source: 'noah-component-library',
            ingested_at: new Date().toISOString(),
          }
        });
        
        documents.push(doc);
        console.log(`📄 Loaded component: ${metadata.title || file}`);
      }
      
      return documents;
    } catch (error) {
      console.error('❌ Error loading component files:', error);
      throw error;
    }
  }

  private extractMetadata(htmlContent: string, filename: string): ComponentMetadata {
    const metadata: ComponentMetadata = {
      component_type: this.inferComponentType(filename, htmlContent),
      title: this.extractTitle(htmlContent),
      description: this.extractDescription(htmlContent),
      features: this.extractFeatures(htmlContent),
      use_cases: this.inferUseCases(filename, htmlContent),
    };
    
    return metadata;
  }

  private extractTitle(htmlContent: string): string {
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'Interactive Component';
  }

  private extractDescription(htmlContent: string): string {
    // Look for h1, h2, h3 tags or meta description
    const headingMatch = htmlContent.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
    
    const metaMatch = htmlContent.match(/<meta name="description" content="(.*?)"/i);
    return metaMatch ? metaMatch[1].trim() : 'Interactive HTML component';
  }

  private extractFeatures(htmlContent: string): string[] {
    const features: string[] = [];
    
    // Check for common interactive features
    if (htmlContent.includes('onclick') || htmlContent.includes('addEventListener')) {
      features.push('interactive');
    }
    if (htmlContent.includes('input') || htmlContent.includes('form')) {
      features.push('user-input');
    }
    if (htmlContent.includes('localStorage') || htmlContent.includes('sessionStorage')) {
      features.push('data-persistence');
    }
    if (htmlContent.includes('setInterval') || htmlContent.includes('setTimeout')) {
      features.push('time-based');
    }
    if (htmlContent.includes('Chart') || htmlContent.includes('canvas')) {
      features.push('visualization');
    }
    if (htmlContent.includes('progress') || htmlContent.includes('percentage')) {
      features.push('progress-tracking');
    }
    
    return features;
  }

  private inferComponentType(filename: string, htmlContent: string): string {
    const name = filename.toLowerCase();
    
    if (name.includes('calculator')) return 'calculator';
    if (name.includes('timer')) return 'timer';
    if (name.includes('progress')) return 'progress-tracker';
    if (name.includes('checklist') || name.includes('todo')) return 'task-manager';
    if (name.includes('form')) return 'data-collection';
    if (name.includes('chart') || name.includes('graph')) return 'visualization';
    if (name.includes('slider') || name.includes('range')) return 'input-control';
    
    // Infer from content if filename doesn't give clues
    if (htmlContent.includes('calculate') || htmlContent.includes('math')) return 'calculator';
    if (htmlContent.includes('checkbox') && htmlContent.includes('task')) return 'task-manager';
    if (htmlContent.includes('timer') || htmlContent.includes('countdown')) return 'timer';
    
    return 'interactive-tool';
  }

  private inferUseCases(filename: string, htmlContent: string): string[] {
    const useCases: string[] = [];
    const name = filename.toLowerCase();
    const content = htmlContent.toLowerCase();
    
    // Time management
    if (name.includes('timer') || content.includes('focus') || content.includes('pomodoro')) {
      useCases.push('time-management', 'productivity', 'focus');
    }
    
    // Task tracking
    if (name.includes('checklist') || content.includes('task') || content.includes('todo')) {
      useCases.push('task-management', 'organization', 'productivity');
    }
    
    // Calculations
    if (name.includes('calculator') || content.includes('calculate')) {
      useCases.push('calculations', 'budgeting', 'planning');
    }
    
    // Progress tracking
    if (content.includes('progress') || content.includes('goal')) {
      useCases.push('goal-tracking', 'progress-monitoring', 'motivation');
    }
    
    // Data collection
    if (name.includes('form') || content.includes('survey') || content.includes('feedback')) {
      useCases.push('data-collection', 'feedback', 'information-gathering');
    }
    
    return useCases;
  }

  async ingestComponents(): Promise<void> {
    try {
      console.log('🚀 Starting component ingestion process...');
      
      // Load all component files
      const documents = await this.loadComponentFiles();
      
      if (documents.length === 0) {
        console.log('⚠️ No HTML components found to ingest');
        return;
      }
      
      // Initialize vector store and add documents
      await this.vectorStore.initialize();
      await this.vectorStore.addDocuments(documents);
      
      console.log(`✅ Successfully ingested ${documents.length} components into vector store`);
      console.log('📋 Component Summary:');
      
      documents.forEach(doc => {
        const metadata = doc.metadata as ComponentMetadata;
        console.log(`  • ${metadata.title} (${metadata.component_type})`);
        console.log(`    Features: ${metadata.features.join(', ')}`);
        console.log(`    Use cases: ${metadata.use_cases.join(', ')}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Ingestion failed:', error);
      process.exit(1);
    }
  }
}

// Run ingestion if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const ingester = new ComponentIngester();
  ingester.ingestComponents().catch(console.error);
}

export default ComponentIngester;
