// JavaScript Tool Generator - Creates reusable JavaScript utilities and components
// Built on the existing TryIt-AI foundation

import { BaseToolGenerator } from './base-generator';
import type {
  ToolSpec,
  GeneratedTool,
  ValidationError,
  ToolTemplate,
  JSToolConfig
} from './types';

export class JavaScriptGenerator extends BaseToolGenerator {
  constructor() {
    super('javascript', 'JavaScript Tool Generator', '1.0.0');
    this.loadDefaultTemplates();
  }

  protected async generateTool(specification: ToolSpec): Promise<GeneratedTool> {
    const config = specification.parameters as JSToolConfig;
    const context = this.buildGenerationContext(specification);
    
    // Select appropriate template
    const template = this.selectTemplate(specification);
    
    // Generate JavaScript code
    const jsCode = this.generateJavaScript(specification, template, context);
    
    // Add module wrapper if needed
    const wrappedCode = this.wrapCode(jsCode, config);
    
    // Minify if requested
    const finalCode = config?.minify ? this.minifyCode(wrappedCode) : wrappedCode;
    
    return {
      id: this.generateToolId(),
      spec: specification,
      code: finalCode,
      assets: this.generateAssets(specification, config),
      documentation: this.generateDocumentation(specification),
      testCases: this.generateTestCases(specification),
      createdAt: new Date()
    };
  }

  protected validateToolType(tool: GeneratedTool): {
    errors: ValidationError[];
    warnings: ValidationError[];
    suggestions: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: string[] = [];

    // Check for syntax errors (basic)
    try {
      new Function(tool.code);
    } catch (error) {
      errors.push({
        code: 'SYNTAX_ERROR',
        message: `JavaScript syntax error: ${error}`,
        severity: 'error'
      });
    }

    // Check for modern JavaScript features
    if (tool.code.includes('var ')) {
      suggestions.push('Consider using const/let instead of var for better scoping');
    }

    // Check for error handling
    if (tool.code.includes('fetch(') && !tool.code.includes('catch')) {
      warnings.push({
        code: 'MISSING_ERROR_HANDLING',
        message: 'Network requests should include error handling',
        severity: 'warning'
      });
    }

    // Check for console.log in production code
    if (tool.code.includes('console.log')) {
      suggestions.push('Consider removing console.log statements for production use');
    }

    return { errors, warnings, suggestions };
  }

  // ===== PRIVATE METHODS =====

  private loadDefaultTemplates(): void {
    const templates: ToolTemplate[] = [
      {
        id: 'utility-function',
        name: 'Utility Function',
        description: 'A reusable utility function',
        type: 'javascript',
        template: `
/**
 * {{description}}
 * {{paramDocs}}
 * @returns {{{returnType}}} {{returnDescription}}
 */
function {{functionName}}({{parameters}}) {
    {{validation}}
    
    {{implementation}}
    
    return {{returnValue}};
}

{{exports}}
        `,
        placeholders: [
          { name: 'functionName', type: 'string', description: 'Function name', required: true },
          { name: 'parameters', type: 'string', description: 'Function parameters', required: false, defaultValue: '' },
          { name: 'returnType', type: 'string', description: 'Return type', required: false, defaultValue: 'any' }
        ],
        dependencies: [],
        complexity: 'simple',
        tags: ['utility', 'function', 'reusable']
      },
      {
        id: 'class-component',
        name: 'Class Component',
        description: 'A reusable class with methods',
        type: 'javascript',
        template: `
/**
 * {{description}}
 */
class {{className}} {
    /**
     * Create a new {{className}}
     * {{constructorDocs}}
     */
    constructor({{constructorParams}}) {
        {{constructorBody}}
    }
    
    {{methods}}
    
    /**
     * Static factory method
     */
    static create({{factoryParams}}) {
        return new {{className}}({{factoryArgs}});
    }
}

{{exports}}
        `,
        placeholders: [
          { name: 'className', type: 'string', description: 'Class name', required: true },
          { name: 'constructorParams', type: 'string', description: 'Constructor parameters', required: false },
          { name: 'methods', type: 'string', description: 'Class methods', required: true }
        ],
        dependencies: [],
        complexity: 'moderate',
        tags: ['class', 'component', 'oop']
      },
      {
        id: 'api-client',
        name: 'API Client',
        description: 'A client for making API requests',
        type: 'javascript',
        template: `
/**
 * {{description}}
 * API Client for {{apiName}}
 */
class {{clientName}} {
    constructor(baseURL, options = {}) {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        this.timeout = options.timeout || 10000;
    }
    
    async request(endpoint, options = {}) {
        const url = \`\${this.baseURL}\${endpoint}\`;
        const config = {
            headers: { ...this.defaultHeaders, ...options.headers },
            timeout: this.timeout,
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
            }
            
            return await response.json();
        } catch (error) {
            throw new Error(\`API request failed: \${error.message}\`);
        }
    }
    
    {{apiMethods}}
}

{{exports}}
        `,
        placeholders: [
          { name: 'clientName', type: 'string', description: 'Client class name', required: true },
          { name: 'apiName', type: 'string', description: 'API name', required: true },
          { name: 'apiMethods', type: 'string', description: 'API-specific methods', required: true }
        ],
        dependencies: [],
        complexity: 'complex',
        tags: ['api', 'client', 'http', 'fetch']
      }
    ];

    templates.forEach(template => this.loadTemplate(template));
  }

  private buildGenerationContext(specification: ToolSpec) {
    return {
      userRequest: specification.description,
      targetAudience: 'intermediate' as const,
      moduleType: 'esm' as const,
      target: 'es2020' as const
    };
  }

  private selectTemplate(specification: ToolSpec): ToolTemplate | null {
    const description = specification.description.toLowerCase();
    
    if (description.includes('api') || description.includes('client') || description.includes('request')) {
      return this.getTemplate('api-client');
    }
    
    if (description.includes('class') || description.includes('component')) {
      return this.getTemplate('class-component');
    }
    
    // Default to utility function
    return this.getTemplate('utility-function');
  }

  private generateJavaScript(
    specification: ToolSpec,
    template: ToolTemplate | null,
    context: any
  ): string {
    if (template) {
      const variables = this.extractVariablesFromSpec(specification, template);
      return this.processTemplate(template.template, variables);
    }
    
    return this.generateCustomJavaScript(specification, context);
  }

  private generateCustomJavaScript(specification: ToolSpec, context: any): string {
    const functionName = this.sanitizeFunctionName(specification.name);
    
    return `
/**
 * ${specification.description}
 * Generated by TryIt-AI JavaScript Generator
 */

/**
 * Main function implementing the requested functionality
 * @param {any} input - Input parameters
 * @returns {any} - Function result
 */
function ${functionName}(input) {
    // Validate input
    if (input === null || input === undefined) {
        throw new Error('Input is required');
    }
    
    // Implementation would be generated based on specific requirements
    console.log('Processing input:', input);
    
    // Example implementation
    const result = {
        input: input,
        processed: true,
        timestamp: new Date().toISOString(),
        message: 'Functionality implemented based on requirements'
    };
    
    return result;
}

/**
 * Helper function for common operations
 */
function validate(value, type = 'any') {
    if (value === null || value === undefined) {
        return false;
    }
    
    if (type !== 'any' && typeof value !== type) {
        return false;
    }
    
    return true;
}

/**
 * Utility function for error handling
 */
function handleError(error, context = '') {
    const errorInfo = {
        message: error.message,
        context: context,
        timestamp: new Date().toISOString()
    };
    
    console.error('Error:', errorInfo);
    return errorInfo;
}

// Export functions for use in other modules
export { ${functionName}, validate, handleError };

// Also support CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ${functionName}, validate, handleError };
}
    `.trim();
  }

  private wrapCode(code: string, config?: JSToolConfig): string {
    if (!config?.moduleType || config.moduleType === 'iife') {
      return this.wrapAsIIFE(code);
    }
    
    switch (config.moduleType) {
      case 'umd':
        return this.wrapAsUMD(code);
      case 'cjs':
        return this.wrapAsCommonJS(code);
      case 'esm':
        return code; // ESM is already the default format
      default:
        return code;
    }
  }

  private wrapAsIIFE(code: string): string {
    return `
(function(global, factory) {
    'use strict';
    
    // Generated by TryIt-AI JavaScript Generator
    factory(global);
    
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function(global) {
    'use strict';
    
${this.indentCode(code, 4)}
    
    // Expose to global scope if needed
    if (typeof global === 'object') {
        // Add exports to global scope
    }
});
    `.trim();
  }

  private wrapAsUMD(code: string): string {
    return `
(function (root, factory) {
    'use strict';
    
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node
        module.exports = factory();
    } else {
        // Browser globals
        root.TryItTool = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    
${this.indentCode(code, 4)}
    
    // Return public API
    return {
        // Add exports here
    };
}));
    `.trim();
  }

  private wrapAsCommonJS(code: string): string {
    return `
'use strict';

${code}

// CommonJS exports
// module.exports will be determined by the generated code
    `.trim();
  }

  private minifyCode(code: string): string {
    // Basic minification - remove comments and extra whitespace
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove semicolons before }
      .trim();
  }

  private generateAssets(specification: ToolSpec, config?: JSToolConfig) {
    const assets: Record<string, string> = {};
    
    // Generate TypeScript declaration file
    assets['index.d.ts'] = this.generateTypeDeclarations(specification);
    
    // Generate package.json if creating a package
    if (config?.moduleType === 'esm' || config?.moduleType === 'cjs') {
      assets['package.json'] = this.generatePackageJson(specification, config);
    }
    
    return assets;
  }

  private generateTypeDeclarations(specification: ToolSpec): string {
    const functionName = this.sanitizeFunctionName(specification.name);
    
    return `
// Generated TypeScript declarations for ${specification.name}

/**
 * ${specification.description}
 */
export declare function ${functionName}(input: any): any;

/**
 * Validation utility
 */
export declare function validate(value: any, type?: string): boolean;

/**
 * Error handling utility
 */
export declare function handleError(error: Error, context?: string): {
    message: string;
    context: string;
    timestamp: string;
};
    `.trim();
  }

  private generatePackageJson(specification: ToolSpec, config: JSToolConfig): string {
    const packageName = this.sanitizePackageName(specification.name);
    
    const packageData = {
      name: packageName,
      version: '1.0.0',
      description: specification.description,
      main: config.moduleType === 'cjs' ? 'index.js' : undefined,
      module: config.moduleType === 'esm' ? 'index.js' : undefined,
      types: 'index.d.ts',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: specification.requirements?.map(req => req.name) || [],
      author: 'TryIt-AI Tool Generator',
      license: 'MIT',
      generated: {
        by: 'tryit-ai-javascript-generator',
        at: new Date().toISOString()
      }
    };
    
    return JSON.stringify(packageData, null, 2);
  }

  private generateDocumentation(specification: ToolSpec): string {
    const functionName = this.sanitizeFunctionName(specification.name);
    
    return `
# ${specification.name}

${specification.description}

## Installation

\`\`\`bash
npm install ${this.sanitizePackageName(specification.name)}
\`\`\`

## Usage

\`\`\`javascript
import { ${functionName} } from '${this.sanitizePackageName(specification.name)}';

// Example usage
const result = ${functionName}(inputData);
console.log(result);
\`\`\`

## API

### ${functionName}(input)

${specification.description}

**Parameters:**
- \`input\` (any) - Input data to process

**Returns:**
- (any) - Processed result

### validate(value, type)

Validates input values.

**Parameters:**
- \`value\` (any) - Value to validate
- \`type\` (string, optional) - Expected type

**Returns:**
- (boolean) - True if valid

### handleError(error, context)

Handles and logs errors consistently.

**Parameters:**
- \`error\` (Error) - Error object
- \`context\` (string, optional) - Additional context

**Returns:**
- (object) - Error information object

## Generated with TryIt-AI

This JavaScript tool was automatically generated based on your specifications.
    `.trim();
  }

  private generateTestCases(specification: ToolSpec) {
    const functionName = this.sanitizeFunctionName(specification.name);
    
    return [
      {
        name: 'Basic functionality test',
        input: { data: 'test' },
        expectedOutput: { input: { data: 'test' }, processed: true },
        description: `Test ${functionName} with basic input`
      },
      {
        name: 'Error handling test',
        input: null,
        expectedOutput: 'Error',
        description: 'Test error handling with null input'
      },
      {
        name: 'Validation test',
        input: { validate: 'string', type: 'string' },
        expectedOutput: true,
        description: 'Test validation utility function'
      }
    ];
  }

  private extractVariablesFromSpec(specification: ToolSpec, template: ToolTemplate): Record<string, any> {
    const functionName = this.sanitizeFunctionName(specification.name);
    
    const variables: Record<string, any> = {
      functionName,
      className: this.capitalize(functionName),
      clientName: this.capitalize(functionName) + 'Client',
      apiName: specification.name,
      description: specification.description,
      exports: this.generateExports(functionName),
      paramDocs: this.generateParamDocs(specification),
      returnType: 'any',
      returnDescription: 'Function result',
      returnValue: 'result'
    };
    
    if (specification.parameters) {
      Object.assign(variables, specification.parameters);
    }
    
    return variables;
  }

  private generateExports(functionName: string): string {
    return `
// ES6 exports
export { ${functionName} };
export default ${functionName};

// CommonJS exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${functionName};
    module.exports.default = ${functionName};
}
    `.trim();
  }

  private generateParamDocs(specification: ToolSpec): string {
    if (!specification.requirements?.length) {
      return '* @param {any} input - Input parameters';
    }
    
    return specification.requirements
      .map(req => `* @param {any} ${req.name} - ${req.description}`)
      .join('\n ');
  }

  private sanitizeFunctionName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 0)
      .map((word, index) => index === 0 ? word.toLowerCase() : this.capitalize(word))
      .join('');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code
      .split('\n')
      .map(line => line.trim() ? indent + line : line)
      .join('\n');
  }
}
