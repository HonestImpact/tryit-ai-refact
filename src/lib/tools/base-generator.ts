// Base Tool Generator - Common functionality for all tool generators
// Built on the existing TryIt-AI foundation

import type {
  ToolGenerator,
  ToolSpec,
  GeneratedTool,
  ValidationResult,
  ValidationError,
  ToolType,
  ExportFormat,
  ToolGenerationContext,
  ToolTemplate,
  ToolAsset
} from './types';
import { createLogger } from '@/lib/logger';

export abstract class BaseToolGenerator implements ToolGenerator {
  public readonly type: ToolType;
  public readonly name: string;
  public readonly version: string;

  protected templates: Map<string, ToolTemplate> = new Map();
  protected generationCount: number = 0;
  protected errorCount: number = 0;
  protected logger = createLogger('BaseToolGenerator');

  constructor(type: ToolType, name: string, version: string = '1.0.0') {
    this.type = type;
    this.name = name;
    this.version = version;
  }

  public async generate(specification: ToolSpec): Promise<GeneratedTool> {
    const startTime = Date.now();
    this.generationCount++;

    try {
      // Validate specification
      const specValidation = this.validateSpecification(specification);
      if (!specValidation.isValid) {
        throw new Error(`Invalid specification: ${specValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Pre-generation hook
      await this.preGenerate(specification);

      // Core generation logic (implemented by subclasses)
      const tool = await this.generateTool(specification);

      // Post-generation hook
      const finalTool = await this.postGenerate(tool, specification);

      // Validate generated tool
      const validation = this.validate(finalTool);
      if (!validation.isValid) {
        this.log('warn', 'Generated tool has validation issues', { 
          errors: validation.errors,
          warnings: validation.warnings 
        });
      }

      const generationTime = Date.now() - startTime;
      this.log('info', `Generated ${this.type} tool: ${finalTool.spec.name}`, {
        generationTime,
        codeLength: finalTool.code.length
      });

      return finalTool;
    } catch (error) {
      this.errorCount++;
      this.log('error', `Failed to generate ${this.type} tool:`, { error });
      throw error;
    }
  }

  public validate(tool: GeneratedTool): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];

    try {
      // Basic validation
      if (!tool.code || tool.code.trim().length === 0) {
        errors.push({
          code: 'EMPTY_CODE',
          message: 'Generated code is empty',
          severity: 'error'
        });
      }

      if (!tool.spec.name || tool.spec.name.trim().length === 0) {
        errors.push({
          code: 'MISSING_NAME',
          message: 'Tool name is required',
          severity: 'error'
        });
      }

      // Type-specific validation (implemented by subclasses)
      const typeValidation = this.validateToolType(tool);
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);
      suggestions.push(...typeValidation.suggestions);

      // Code quality checks
      const qualityChecks = this.performQualityChecks(tool);
      warnings.push(...qualityChecks.warnings);
      suggestions.push(...qualityChecks.suggestions);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error}`,
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  public async export(tool: GeneratedTool, format: ExportFormat): Promise<string> {
    try {
      switch (format) {
        case 'file':
          return this.exportAsFile(tool);
        case 'url':
          return this.exportAsUrl(tool);
        case 'embed':
          return this.exportAsEmbed(tool);
        case 'package':
          return this.exportAsPackage(tool);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.log('error', `Failed to export tool in ${format} format:`, { error });
      throw error;
    }
  }

  public getCapabilities(): string[] {
    return [
      'generation',
      'validation',
      'export-file',
      'export-url',
      'export-embed',
      'export-package'
    ];
  }

  public getStats() {
    const errorRate = this.generationCount > 0 ? this.errorCount / this.generationCount : 0;
    
    return {
      type: this.type,
      name: this.name,
      version: this.version,
      generationCount: this.generationCount,
      errorCount: this.errorCount,
      errorRate,
      templatesLoaded: this.templates.size
    };
  }

  // ===== ABSTRACT METHODS (to be implemented by subclasses) =====

  /**
   * Core tool generation logic - must be implemented by each generator type
   */
  protected abstract generateTool(specification: ToolSpec): Promise<GeneratedTool>;

  /**
   * Type-specific validation logic
   */
  protected abstract validateToolType(tool: GeneratedTool): {
    errors: ValidationError[];
    warnings: ValidationError[];
    suggestions: string[];
  };

  // ===== HOOK METHODS (can be overridden by subclasses) =====

  /**
   * Called before generating each tool
   */
  protected async preGenerate(specification: ToolSpec): Promise<void> {
    // Default: no pre-generation logic
  }

  /**
   * Called after generating each tool
   */
  protected async postGenerate(
    tool: GeneratedTool, 
    specification: ToolSpec
  ): Promise<GeneratedTool> {
    // Default: return tool as-is
    return tool;
  }

  // ===== HELPER METHODS =====

  /**
   * Load templates for this generator type
   */
  protected loadTemplate(template: ToolTemplate): void {
    this.templates.set(template.id, template);
    this.log('info', `Loaded template: ${template.name}`);
  }

  /**
   * Get template by ID
   */
  protected getTemplate(id: string): ToolTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Find templates by criteria
   */
  protected findTemplates(criteria: {
    type?: ToolType;
    complexity?: string;
    tags?: string[];
  }): ToolTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      if (criteria.type && template.type !== criteria.type) {
        return false;
      }
      if (criteria.complexity && template.complexity !== criteria.complexity) {
        return false;
      }
      if (criteria.tags && !criteria.tags.some(tag => template.tags.includes(tag))) {
        return false;
      }
      return true;
    });
  }

  /**
   * Process template with placeholders
   */
  protected processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }
    
    return processed;
  }

  /**
   * Validate tool specification
   */
  protected validateSpecification(spec: ToolSpec): ValidationResult {
    const errors: ValidationError[] = [];

    if (!spec.name || spec.name.trim().length === 0) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Tool name is required',
        severity: 'error'
      });
    }

    if (!spec.description || spec.description.trim().length === 0) {
      errors.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Tool description is required',
        severity: 'error'
      });
    }

    if (spec.type !== this.type) {
      errors.push({
        code: 'TYPE_MISMATCH',
        message: `Tool type ${spec.type} does not match generator type ${this.type}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Perform code quality checks
   */
  protected performQualityChecks(tool: GeneratedTool): {
    warnings: ValidationError[];
    suggestions: string[];
  } {
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];

    // Check code length
    if (tool.code.length > 10000) {
      warnings.push({
        code: 'LARGE_CODE',
        message: 'Generated code is quite large, consider breaking it into smaller components',
        severity: 'warning'
      });
    }

    // Check for common issues
    if (tool.code.includes('eval(')) {
      warnings.push({
        code: 'EVAL_USAGE',
        message: 'Code contains eval() which can be a security risk',
        severity: 'warning'
      });
    }

    // Check for inline styles (for HTML tools)
    if (this.type === 'html' && tool.code.includes('style=')) {
      suggestions.push('Consider using external CSS for better maintainability');
    }

    // Check for missing error handling
    if (tool.code.includes('fetch(') && !tool.code.includes('catch')) {
      suggestions.push('Consider adding error handling for network requests');
    }

    return { warnings, suggestions };
  }

  /**
   * Export tool as file content
   */
  protected exportAsFile(tool: GeneratedTool): string {
    const extension = this.getFileExtension();
    const filename = this.sanitizeFilename(tool.spec.name) + extension;
    
    return JSON.stringify({
      filename,
      content: tool.code,
      metadata: {
        type: this.type,
        name: tool.spec.name,
        description: tool.spec.description,
        generatedAt: new Date().toISOString(),
        generator: this.name,
        version: this.version
      }
    }, null, 2);
  }

  /**
   * Export tool as URL (data URL)
   */
  protected exportAsUrl(tool: GeneratedTool): string {
    const mimeType = this.getMimeType();
    const content = encodeURIComponent(tool.code);
    return `data:${mimeType};charset=utf-8,${content}`;
  }

  /**
   * Export tool as embeddable code
   */
  protected exportAsEmbed(tool: GeneratedTool): string {
    const embedCode = `
<!-- Generated by ${this.name} v${this.version} -->
<!-- Tool: ${tool.spec.name} -->
${tool.code}
    `.trim();

    return embedCode;
  }

  /**
   * Export tool as package
   */
  protected async exportAsPackage(tool: GeneratedTool): Promise<string> {
    const packageData = {
      name: this.sanitizePackageName(tool.spec.name),
      version: '1.0.0',
      description: tool.spec.description,
      main: this.getMainFile(),
      files: [this.getMainFile()],
      generated: {
        at: new Date().toISOString(),
        by: this.name,
        version: this.version
      },
      tool: {
        type: this.type,
        code: tool.code,
        assets: tool.assets || {},
        documentation: tool.documentation
      }
    };

    return JSON.stringify(packageData, null, 2);
  }

  /**
   * Get file extension for this tool type
   */
  protected getFileExtension(): string {
    switch (this.type) {
      case 'html': return '.html';
      case 'javascript': return '.js';
      case 'css': return '.css';
      case 'bookmarklet': return '.js';
      default: return '.txt';
    }
  }

  /**
   * Get MIME type for this tool type
   */
  protected getMimeType(): string {
    switch (this.type) {
      case 'html': return 'text/html';
      case 'javascript': return 'application/javascript';
      case 'css': return 'text/css';
      case 'bookmarklet': return 'application/javascript';
      default: return 'text/plain';
    }
  }

  /**
   * Get main file name for package
   */
  protected getMainFile(): string {
    switch (this.type) {
      case 'html': return 'index.html';
      case 'javascript': return 'index.js';
      case 'css': return 'styles.css';
      case 'bookmarklet': return 'bookmarklet.js';
      default: return 'tool.txt';
    }
  }

  /**
   * Sanitize filename for file system
   */
  protected sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Sanitize package name
   */
  protected sanitizePackageName(name: string): string {
    return `tryit-tool-${this.sanitizeFilename(name)}`;
  }

  /**
   * Generate unique tool ID
   */
  protected generateToolId(): string {
    return `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log generator activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      generator: this.name,
      type: this.type,
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.logger[level](message, metadata);
  }
}
