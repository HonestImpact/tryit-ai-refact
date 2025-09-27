// HTML Tool Generator - Creates interactive HTML tools
// Built on the existing TryIt-AI foundation

import { BaseToolGenerator } from './base-generator';
import type {
  ToolSpec,
  GeneratedTool,
  ValidationError,
  ToolTemplate,
  HTMLToolConfig
} from './types';

export class HTMLGenerator extends BaseToolGenerator {
  constructor() {
    super('html', 'HTML Tool Generator', '1.0.0');
    this.loadDefaultTemplates();
  }

  private validateConfig(parameters: Record<string, unknown>): HTMLToolConfig {
    return {
      title: String(parameters.title || 'HTML Tool'),
      description: String(parameters.description || 'Generated HTML tool'),
      styles: (typeof parameters.styles === 'string' && ['inline', 'external', 'none'].includes(parameters.styles)) ? parameters.styles as 'inline' | 'external' | 'none' : 'inline',
      scripts: (typeof parameters.scripts === 'string' && ['inline', 'external', 'none'].includes(parameters.scripts)) ? parameters.scripts as 'inline' | 'external' | 'none' : 'inline',
      responsive: Boolean(parameters.responsive ?? true),
      darkMode: Boolean(parameters.darkMode ?? false)
    };
  }

  protected async generateTool(specification: ToolSpec): Promise<GeneratedTool> {
    const config = this.validateConfig(specification.parameters);
    const context = this.buildGenerationContext(specification);
    
    // Select appropriate template
    const template = this.selectTemplate(specification);
    
    // Generate HTML structure
    const html = this.generateHTML(specification, template, context);
    
    // Generate CSS
    const css = this.generateCSS(specification, context);
    
    // Generate JavaScript if needed
    const js = this.generateJavaScript(specification, context);
    
    // Combine into final tool
    const combinedCode = this.combineAssets(html, css, js, config);
    
    return {
      id: this.generateToolId(),
      spec: specification,
      code: combinedCode,
      assets: this.generateAssets(html, css, js),
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

    // Check for valid HTML structure
    if (!tool.code.includes('<html') && !tool.code.includes('<!DOCTYPE')) {
      warnings.push({
        code: 'INCOMPLETE_HTML',
        message: 'Generated HTML may be missing DOCTYPE or html tag',
        severity: 'warning'
      });
    }

    // Check for accessibility
    if (!tool.code.includes('alt=') && tool.code.includes('<img')) {
      warnings.push({
        code: 'MISSING_ALT',
        message: 'Images should have alt attributes for accessibility',
        severity: 'warning'
      });
    }

    // Check for semantic HTML
    if (!tool.code.match(/<(header|main|section|article|aside|footer|nav)/)) {
      suggestions.push('Consider using semantic HTML elements for better structure');
    }

    // Check for responsive design
    if (!tool.code.includes('viewport')) {
      suggestions.push('Consider adding viewport meta tag for mobile responsiveness');
    }

    return { errors, warnings, suggestions };
  }

  // ===== PRIVATE METHODS =====

  private loadDefaultTemplates(): void {
    const templates: ToolTemplate[] = [
      {
        id: 'form-template',
        name: 'Interactive Form',
        description: 'A responsive form with validation',
        type: 'html',
        template: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>{{styles}}</style>
</head>
<body>
    <div class="container">
        <h1>{{title}}</h1>
        <form id="{{formId}}" class="form">
            {{formFields}}
            <button type="submit" class="submit-btn">{{submitText}}</button>
        </form>
        <div id="result" class="result"></div>
    </div>
    <script>{{scripts}}</script>
</body>
</html>
        `,
        placeholders: [
          { name: 'title', type: 'string', description: 'Form title', required: true },
          { name: 'formId', type: 'string', description: 'Form ID', required: true },
          { name: 'submitText', type: 'string', description: 'Submit button text', required: false, defaultValue: 'Submit' }
        ],
        dependencies: [],
        complexity: 'moderate',
        tags: ['form', 'interactive', 'validation']
      },
      {
        id: 'dashboard-template',
        name: 'Data Dashboard',
        description: 'A responsive dashboard with charts and metrics',
        type: 'html',
        template: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>{{styles}}</style>
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>{{title}}</h1>
            <div class="dashboard-actions">{{actions}}</div>
        </header>
        <main class="dashboard-main">
            <div class="metrics-grid">{{metrics}}</div>
            <div class="charts-grid">{{charts}}</div>
        </main>
    </div>
    <script>{{scripts}}</script>
</body>
</html>
        `,
        placeholders: [
          { name: 'title', type: 'string', description: 'Dashboard title', required: true },
          { name: 'metrics', type: 'string', description: 'Metrics HTML', required: false },
          { name: 'charts', type: 'string', description: 'Charts HTML', required: false }
        ],
        dependencies: [],
        complexity: 'complex',
        tags: ['dashboard', 'charts', 'metrics']
      },
      {
        id: 'calculator-template',
        name: 'Calculator Tool',
        description: 'An interactive calculator',
        type: 'html',
        template: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>{{styles}}</style>
</head>
<body>
    <div class="calculator">
        <h1>{{title}}</h1>
        <div class="calculator-display">
            <input type="text" id="display" readonly>
        </div>
        <div class="calculator-buttons">{{buttons}}</div>
        <div class="calculator-history" id="history"></div>
    </div>
    <script>{{scripts}}</script>
</body>
</html>
        `,
        placeholders: [
          { name: 'title', type: 'string', description: 'Calculator title', required: true },
          { name: 'buttons', type: 'string', description: 'Calculator buttons HTML', required: true }
        ],
        dependencies: [],
        complexity: 'moderate',
        tags: ['calculator', 'interactive', 'math']
      }
    ];

    templates.forEach(template => this.loadTemplate(template));
  }

  private buildGenerationContext(specification: ToolSpec) {
    return {
      userRequest: specification.description,
      targetAudience: 'intermediate' as const,
      designPreferences: {
        colorScheme: 'auto' as const,
        framework: 'vanilla' as const,
        interactivity: 'moderate' as const
      },
      constraints: {
        maxFileSize: 50000,
        supportedBrowsers: ['chrome', 'firefox', 'safari', 'edge'],
        accessibility: true,
        mobile: true
      }
    };
  }

  private selectTemplate(specification: ToolSpec): ToolTemplate | null {
    const description = specification.description.toLowerCase();
    
    // Simple template selection based on keywords
    if (description.includes('form') || description.includes('input')) {
      return this.getTemplate('form-template');
    }
    
    if (description.includes('dashboard') || description.includes('chart')) {
      return this.getTemplate('dashboard-template');
    }
    
    if (description.includes('calculator') || description.includes('math')) {
      return this.getTemplate('calculator-template');
    }
    
    // Default to form template
    return this.getTemplate('form-template');
  }

  private generateHTML(
    specification: ToolSpec, 
    template: ToolTemplate | null, 
    context: any
  ): string {
    if (template) {
      // Use template-based generation
      const variables = this.extractVariablesFromSpec(specification, template);
      return this.processTemplate(template.template, variables);
    }
    
    // Generate from scratch based on specification
    return this.generateCustomHTML(specification, context);
  }

  private generateCustomHTML(specification: ToolSpec, context: any): string {
    const title = specification.name;
    const description = specification.description;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .content {
            margin-bottom: 20px;
        }
        .interactive-area {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <p>${description}</p>
        </div>
        <div class="content">
            <div class="interactive-area">
                <p>Interactive content will be generated here based on your specific requirements.</p>
                <button onclick="handleAction()">Take Action</button>
            </div>
        </div>
    </div>
    <script>
        function handleAction() {
            alert('Tool functionality would be implemented here based on requirements.');
        }
    </script>
</body>
</html>
    `.trim();
  }

  private generateCSS(specification: ToolSpec, context: any): string {
    return `
/* Generated CSS for ${specification.name} */
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--dark-color);
}

.btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    margin: 0.25rem;
    font-size: 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.form-group {
    margin-bottom: 1rem;
}

.form-control {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    font-size: 1rem;
}

.form-control:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

@media (max-width: 768px) {
    .container {
        padding: 15px;
        margin: 10px;
    }
}
    `.trim();
  }

  private generateJavaScript(specification: ToolSpec, context: any): string {
    return `
// Generated JavaScript for ${specification.name}
(function() {
    'use strict';
    
    // Utility functions
    function $(selector) {
        return document.querySelector(selector);
    }
    
    function $$(selector) {
        return document.querySelectorAll(selector);
    }
    
    // Event handling
    function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        console.log('Form submitted:', data);
        
        // Process form data here
        processFormData(data);
    }
    
    function processFormData(data) {
        // Implementation would go here based on tool requirements
        displayResult('Form submitted successfully!');
    }
    
    function displayResult(message) {
        const resultDiv = $('#result');
        if (resultDiv) {
            resultDiv.innerHTML = '<div class="alert alert-success">' + message + '</div>';
        }
    }
    
    // Initialize tool
    function init() {
        console.log('${specification.name} initialized');
        
        // Attach event listeners
        const forms = $$('form');
        forms.forEach(form => {
            form.addEventListener('submit', handleFormSubmit);
        });
        
        // Additional initialization based on tool type
        initializeToolFeatures();
    }
    
    function initializeToolFeatures() {
        // Tool-specific initialization would go here
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
    `.trim();
  }

  private combineAssets(html: string, css: string, js: string, config?: HTMLToolConfig): string {
    if (config?.styles === 'external') {
      // Replace style tag with link to external CSS
      html = html.replace(/<style>[\s\S]*?<\/style>/g, '<link rel="stylesheet" href="styles.css">');
    } else {
      // Inline CSS
      html = html.replace('{{styles}}', css);
    }
    
    if (config?.scripts === 'external') {
      // Replace script tag with link to external JS
      html = html.replace(/<script>[\s\S]*?<\/script>/g, '<script src="script.js"></script>');
    } else {
      // Inline JavaScript
      html = html.replace('{{scripts}}', js);
    }
    
    return html;
  }

  private generateAssets(html: string, css: string, js: string) {
    return {
      'styles.css': css,
      'script.js': js
    };
  }

  private generateDocumentation(specification: ToolSpec): string {
    return `
# ${specification.name}

${specification.description}

## Features
- Responsive design
- Accessible markup
- Interactive functionality
- Cross-browser compatible

## Usage
1. Open the HTML file in a web browser
2. Interact with the tool as intended
3. View results or output as appropriate

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Generated with TryIt-AI HTML Generator
This tool was automatically generated based on your specifications.
    `.trim();
  }

  private generateTestCases(specification: ToolSpec) {
    return [
      {
        name: 'Basic functionality test',
        input: { action: 'basic_test' },
        expectedOutput: 'Tool loads and displays correctly',
        description: 'Verify the tool loads without errors'
      },
      {
        name: 'Responsive design test',
        input: { viewport: 'mobile' },
        expectedOutput: 'Tool adapts to mobile viewport',
        description: 'Verify responsive behavior on mobile devices'
      }
    ];
  }

  private extractVariablesFromSpec(specification: ToolSpec, template: ToolTemplate): Record<string, any> {
    const variables: Record<string, any> = {
      title: specification.name,
      description: specification.description
    };
    
    // Extract additional variables from specification parameters
    if (specification.parameters) {
      Object.assign(variables, specification.parameters);
    }
    
    // Apply template defaults
    template.placeholders.forEach(placeholder => {
      if (!(placeholder.name in variables) && placeholder.defaultValue !== undefined) {
        variables[placeholder.name] = placeholder.defaultValue;
      }
    });
    
    return variables;
  }
}
