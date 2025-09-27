// Component Ingester - Integrated with TryIt-AI Knowledge Architecture
// Follows the established archiver provider pattern

import fs from 'fs';
import path from 'path';
import { Document } from "@langchain/core/documents";
import type { KnowledgeService } from './knowledge-service';
import type { DocumentMetadata } from './types';
import { createLogger } from '@/lib/logger';

interface ComponentMetadata extends DocumentMetadata {
  component_type: string;
  title: string;
  description: string;
  features: string[];
  use_cases: string[];
  filename?: string;
  filepath?: string;
}

export class ComponentIngester {
  private knowledgeService: KnowledgeService;
  private componentsDir: string;
  private logger = createLogger('ComponentIngester');

  constructor(knowledgeService: KnowledgeService) {
    this.knowledgeService = knowledgeService;
    this.componentsDir = path.join(process.cwd(), 'rag', 'components');
  }

  async ingestAllComponents(): Promise<void> {
    try {
      this.logger.info('Starting component ingestion using TryIt-AI Knowledge Service...');
      
      const documents = await this.loadComponentFiles();
      
      if (documents.length === 0) {
        this.logger.warn('No HTML components found to ingest');
        return;
      }

      // Use the established knowledge service pattern
      const results = await this.knowledgeService.indexBatch(
        documents.map(doc => ({
          content: doc.pageContent,
          metadata: doc.metadata as DocumentMetadata
        }))
      );

      this.logger.info(`Successfully ingested ${results.length} components`);
      this.logComponentSummary(documents);
      
    } catch (error) {
      this.logger.error('Component ingestion failed', { error });
      throw error;
    }
  }

  private async loadComponentFiles(): Promise<Document[]> {
    const documents: Document[] = [];
    
    try {
      const files = fs.readdirSync(this.componentsDir);
      const htmlFiles = files.filter(file => file.endsWith('.html'));
      
      this.logger.info(`Found ${htmlFiles.length} HTML component files`);
      
      for (const file of htmlFiles) {
        const filePath = path.join(this.componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        const metadata = this.extractMetadata(content, file);
        
        const doc = new Document({
          pageContent: content,
          metadata: {
            ...metadata,
            filename: file,
            filepath: filePath,
            source: 'noah-component-library',
            type: 'component' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        documents.push(doc);
        this.logger.info(`Processed component: ${metadata.title || file}`);
      }
      
      return documents;
    } catch (error) {
      this.logger.error('Error loading component files', { error });
      throw error;
    }
  }

  private extractMetadata(htmlContent: string, filename: string): ComponentMetadata {
    return {
      component_type: this.inferComponentType(filename, htmlContent),
      title: this.extractTitle(htmlContent),
      description: this.extractDescription(htmlContent),
      features: this.extractFeatures(htmlContent),
      use_cases: this.inferUseCases(filename, htmlContent),
      source: 'noah-component-library',
      type: 'component' as const,
      tags: this.generateTags(filename, htmlContent),
      language: 'html',
      complexity: this.inferComplexity(htmlContent),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private extractTitle(htmlContent: string): string {
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'Interactive Component';
  }

  private extractDescription(htmlContent: string): string {
    const headingMatch = htmlContent.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
    
    const metaMatch = htmlContent.match(/<meta name="description" content="(.*?)"/i);
    return metaMatch ? metaMatch[1].trim() : 'Interactive HTML component';
  }

  private extractFeatures(htmlContent: string): string[] {
    const features: string[] = [];
    
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
    
    // Infer from content
    if (htmlContent.includes('calculate') || htmlContent.includes('math')) return 'calculator';
    if (htmlContent.includes('checkbox') && htmlContent.includes('task')) return 'task-manager';
    if (htmlContent.includes('timer') || htmlContent.includes('countdown')) return 'timer';
    
    return 'interactive-tool';
  }

  private inferUseCases(filename: string, htmlContent: string): string[] {
    const useCases: string[] = [];
    const name = filename.toLowerCase();
    const content = htmlContent.toLowerCase();
    
    if (name.includes('timer') || content.includes('focus') || content.includes('pomodoro')) {
      useCases.push('time-management', 'productivity', 'focus');
    }
    
    if (name.includes('checklist') || content.includes('task') || content.includes('todo')) {
      useCases.push('task-management', 'organization', 'productivity');
    }
    
    if (name.includes('calculator') || content.includes('calculate')) {
      useCases.push('calculations', 'budgeting', 'planning');
    }
    
    if (content.includes('progress') || content.includes('goal')) {
      useCases.push('goal-tracking', 'progress-monitoring', 'motivation');
    }
    
    if (name.includes('form') || content.includes('survey') || content.includes('feedback')) {
      useCases.push('data-collection', 'feedback', 'information-gathering');
    }
    
    return useCases;
  }

  private generateTags(filename: string, htmlContent: string): string[] {
    const tags = new Set<string>();
    
    // Add component type as tag
    tags.add(this.inferComponentType(filename, htmlContent));
    
    // Add feature tags
    this.extractFeatures(htmlContent).forEach(feature => tags.add(feature));
    
    // Add technology tags
    tags.add('html');
    tags.add('javascript');
    tags.add('css');
    
    if (htmlContent.includes('localStorage')) tags.add('localStorage');
    if (htmlContent.includes('canvas')) tags.add('canvas');
    if (htmlContent.includes('svg')) tags.add('svg');
    
    return Array.from(tags);
  }

  private inferComplexity(htmlContent: string): 'beginner' | 'intermediate' | 'advanced' {
    let complexityScore = 0;
    
    // Check for advanced features
    if (htmlContent.includes('class ') || htmlContent.includes('prototype')) complexityScore += 2;
    if (htmlContent.includes('async') || htmlContent.includes('await')) complexityScore += 2;
    if (htmlContent.includes('fetch') || htmlContent.includes('XMLHttpRequest')) complexityScore += 2;
    if (htmlContent.includes('localStorage') || htmlContent.includes('sessionStorage')) complexityScore += 1;
    if (htmlContent.includes('canvas') || htmlContent.includes('svg')) complexityScore += 2;
    
    // Check lines of JavaScript
    const jsLines = htmlContent.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('//') && 
      (line.includes('function') || line.includes('=>') || line.includes('var ') || 
       line.includes('let ') || line.includes('const '))
    ).length;
    
    if (jsLines > 20) complexityScore += 2;
    else if (jsLines > 10) complexityScore += 1;
    
    if (complexityScore >= 4) return 'advanced';
    if (complexityScore >= 2) return 'intermediate';
    return 'beginner';
  }

  private logComponentSummary(documents: Document[]): void {
    this.logger.info('Component Ingestion Summary:');
    
    documents.forEach(doc => {
      const metadata = doc.metadata as ComponentMetadata;
      this.logger.info(`  • ${metadata.title} (${metadata.component_type})`);
      this.logger.info(`    Features: ${metadata.features.join(', ')}`);
      this.logger.info(`    Use cases: ${metadata.use_cases.join(', ')}`);
      this.logger.info(`    Complexity: ${metadata.complexity}`);
      this.logger.info('');
    });
  }
}
