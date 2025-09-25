// Bookmarklet Generator - Creates browser bookmarklets for page manipulation
// Built on the existing TryIt-AI foundation

import { BaseToolGenerator } from './base-generator';
import type {
  ToolSpec,
  GeneratedTool,
  ValidationError,
  ToolTemplate,
  BookmarkletConfig
} from './types';

export class BookmarkletGenerator extends BaseToolGenerator {
  constructor() {
    super('bookmarklet', 'Bookmarklet Generator', '1.0.0');
    this.loadDefaultTemplates();
  }

  protected async generateTool(specification: ToolSpec): Promise<GeneratedTool> {
    const config = specification.parameters as BookmarkletConfig;
    const context = this.buildGenerationContext(specification);
    
    // Select appropriate template
    const template = this.selectTemplate(specification);
    
    // Generate bookmarklet code
    const jsCode = this.generateBookmarkletCode(specification, template, context);
    
    // Create the bookmarklet URL
    const bookmarkletUrl = this.createBookmarkletUrl(jsCode);
    
    // Generate installation HTML
    const installationCode = this.generateInstallationPage(specification, bookmarkletUrl);
    
    return {
      id: this.generateToolId(),
      spec: specification,
      code: installationCode,
      assets: {
        'bookmarklet.js': jsCode,
        'bookmarklet-url.txt': bookmarkletUrl,
        'install.html': installationCode
      },
      documentation: this.generateDocumentation(specification, bookmarkletUrl),
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

    // Check for valid JavaScript in bookmarklet
    const jsCode = tool.assets?.['bookmarklet.js'] || '';
    
    try {
      new Function(jsCode);
    } catch (error) {
      errors.push({
        code: 'SYNTAX_ERROR',
        message: `Bookmarklet JavaScript syntax error: ${error}`,
        severity: 'error'
      });
    }

    // Check bookmarklet size (browsers have URL length limits)
    const bookmarkletUrl = tool.assets?.['bookmarklet-url.txt'] || '';
    if (bookmarkletUrl.length > 2000) {
      warnings.push({
        code: 'URL_TOO_LONG',
        message: 'Bookmarklet URL is very long and may not work in all browsers',
        severity: 'warning'
      });
    }

    // Check for DOM manipulation safety
    if (jsCode.includes('innerHTML') && !jsCode.includes('textContent')) {
      warnings.push({
        code: 'POTENTIAL_XSS',
        message: 'Using innerHTML can be risky - consider textContent for safety',
        severity: 'warning'
      });
    }

    // Check for cross-origin issues
    if (jsCode.includes('fetch(') || jsCode.includes('XMLHttpRequest')) {
      suggestions.push('Be aware of CORS restrictions when making requests from bookmarklets');
    }

    return { errors, warnings, suggestions };
  }

  // ===== PRIVATE METHODS =====

  private loadDefaultTemplates(): void {
    const templates: ToolTemplate[] = [
      {
        id: 'page-analyzer',
        name: 'Page Analyzer',
        description: 'Analyzes current page content and structure',
        type: 'bookmarklet',
        template: `
(function() {
    'use strict';
    
    // Page analysis functionality
    function analyzePage() {
        const analysis = {
            title: document.title,
            url: window.location.href,
            wordCount: document.body.innerText.split(/\\s+/).length,
            images: document.images.length,
            links: document.links.length,
            forms: document.forms.length,
            scripts: document.scripts.length,
            stylesheets: document.styleSheets.length
        };
        
        return analysis;
    }
    
    function displayResults(analysis) {
        const modal = createModal();
        modal.innerHTML = \`
            <div style="{{modalStyles}}">
                <h3>{{title}} - Page Analysis</h3>
                <div class="analysis-content">
                    <p><strong>Title:</strong> \${analysis.title}</p>
                    <p><strong>URL:</strong> \${analysis.url}</p>
                    <p><strong>Word Count:</strong> \${analysis.wordCount}</p>
                    <p><strong>Images:</strong> \${analysis.images}</p>
                    <p><strong>Links:</strong> \${analysis.links}</p>
                    <p><strong>Forms:</strong> \${analysis.forms}</p>
                    <p><strong>Scripts:</strong> \${analysis.scripts}</p>
                    <p><strong>Stylesheets:</strong> \${analysis.stylesheets}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        \`;
    }
    
    {{utilityFunctions}}
    
    // Run analysis
    const results = analyzePage();
    displayResults(results);
    
})();
        `,
        placeholders: [
          { name: 'title', type: 'string', description: 'Tool title', required: true },
          { name: 'modalStyles', type: 'string', description: 'Modal styling', required: false }
        ],
        dependencies: [],
        complexity: 'moderate',
        tags: ['analysis', 'seo', 'debugging']
      },
      {
        id: 'content-extractor',
        name: 'Content Extractor',
        description: 'Extracts and formats page content',
        type: 'bookmarklet',
        template: `
(function() {
    'use strict';
    
    function extractContent() {
        const content = {
            headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(h => ({ level: h.tagName, text: h.textContent.trim() })),
            paragraphs: Array.from(document.querySelectorAll('p'))
                .map(p => p.textContent.trim()).filter(text => text.length > 0),
            links: Array.from(document.querySelectorAll('a[href]'))
                .map(a => ({ text: a.textContent.trim(), url: a.href })),
            images: Array.from(document.querySelectorAll('img[src]'))
                .map(img => ({ alt: img.alt, src: img.src }))
        };
        
        return content;
    }
    
    function formatContent(content) {
        let formatted = \`# Content from: \${document.title}\\n\\n\`;
        
        // Add headings
        if (content.headings.length > 0) {
            formatted += '## Headings\\n';
            content.headings.forEach(h => {
                const level = parseInt(h.level.charAt(1));
                const prefix = '#'.repeat(level + 1);
                formatted += \`\${prefix} \${h.text}\\n\`;
            });
            formatted += '\\n';
        }
        
        // Add paragraphs
        if (content.paragraphs.length > 0) {
            formatted += '## Content\\n';
            content.paragraphs.forEach(p => {
                formatted += \`\${p}\\n\\n\`;
            });
        }
        
        return formatted;
    }
    
    {{utilityFunctions}}
    
    // Extract and display
    const content = extractContent();
    const formatted = formatContent(content);
    copyToClipboard(formatted);
    showNotification('Content extracted and copied to clipboard!');
    
})();
        `,
        placeholders: [
          { name: 'utilityFunctions', type: 'string', description: 'Utility functions', required: true }
        ],
        dependencies: [],
        complexity: 'moderate',
        tags: ['content', 'extraction', 'clipboard']
      },
      {
        id: 'page-modifier',
        name: 'Page Modifier',
        description: 'Modifies page appearance or behavior',
        type: 'bookmarklet',
        template: `
(function() {
    'use strict';
    
    function applyModifications() {
        {{modifications}}
    }
    
    function toggleDarkMode() {
        const existingStyle = document.getElementById('bookmarklet-dark-mode');
        
        if (existingStyle) {
            existingStyle.remove();
        } else {
            const style = document.createElement('style');
            style.id = 'bookmarklet-dark-mode';
            style.textContent = \`
                * {
                    background-color: #1a1a1a !important;
                    color: #e0e0e0 !important;
                    border-color: #444 !important;
                }
                img {
                    opacity: 0.8 !important;
                }
                input, textarea, select {
                    background-color: #2a2a2a !important;
                    color: #e0e0e0 !important;
                }
            \`;
            document.head.appendChild(style);
        }
    }
    
    {{utilityFunctions}}
    
    // Apply modifications
    applyModifications();
    
})();
        `,
        placeholders: [
          { name: 'modifications', type: 'string', description: 'Page modifications', required: true }
        ],
        dependencies: [],
        complexity: 'simple',
        tags: ['modification', 'styling', 'accessibility']
      }
    ];

    templates.forEach(template => this.loadTemplate(template));
  }

  private buildGenerationContext(specification: ToolSpec) {
    return {
      userRequest: specification.description,
      targetAudience: 'intermediate' as const,
      safetyLevel: 'strict' as const
    };
  }

  private selectTemplate(specification: ToolSpec): ToolTemplate | null {
    const description = specification.description.toLowerCase();
    
    if (description.includes('extract') || description.includes('copy') || description.includes('content')) {
      return this.getTemplate('content-extractor');
    }
    
    if (description.includes('modify') || description.includes('change') || description.includes('style')) {
      return this.getTemplate('page-modifier');
    }
    
    if (description.includes('analyze') || description.includes('info') || description.includes('seo')) {
      return this.getTemplate('page-analyzer');
    }
    
    // Default to page analyzer
    return this.getTemplate('page-analyzer');
  }

  private generateBookmarkletCode(
    specification: ToolSpec,
    template: ToolTemplate | null,
    context: any
  ): string {
    if (template) {
      const variables = this.extractVariablesFromSpec(specification, template);
      return this.processTemplate(template.template, variables);
    }
    
    return this.generateCustomBookmarklet(specification, context);
  }

  private generateCustomBookmarklet(specification: ToolSpec, context: any): string {
    const toolName = specification.name;
    
    return `
(function() {
    'use strict';
    
    // ${toolName} - ${specification.description}
    
    function main() {
        try {
            // Main functionality would be implemented here based on requirements
            const result = performAction();
            showNotification('${toolName} executed successfully!');
            return result;
        } catch (error) {
            console.error('${toolName} error:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    }
    
    function performAction() {
        // Example action - this would be customized based on the specification
        const pageInfo = {
            title: document.title,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        console.log('${toolName} - Page info:', pageInfo);
        return pageInfo;
    }
    
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existing = document.getElementById('bookmarklet-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'bookmarklet-notification';
        notification.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: \${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px;
            word-wrap: break-word;
        \`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    function createModal() {
        const modal = document.createElement('div');
        modal.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
        \`;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
        return modal;
    }
    
    // Execute main function
    main();
    
})();
    `.trim();
  }

  private createBookmarkletUrl(jsCode: string): string {
    // Minify the code for the URL
    const minified = this.minifyForBookmarklet(jsCode);
    
    // Create the javascript: URL
    return `javascript:${encodeURIComponent(minified)}`;
  }

  private minifyForBookmarklet(code: string): string {
    return code
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove spaces around operators and punctuation
      .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
      // Remove trailing semicolons before }
      .replace(/;\s*}/g, '}')
      .trim();
  }

  private generateInstallationPage(specification: ToolSpec, bookmarkletUrl: string): string {
    const toolName = specification.name;
    const description = specification.description;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${toolName} - Bookmarklet Installation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .bookmarklet-link {
            display: inline-block;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
            transition: background-color 0.2s;
        }
        .bookmarklet-link:hover {
            background: #0056b3;
        }
        .instructions {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${toolName}</h1>
        <p>${description}</p>
        
        <h2>Installation</h2>
        <p>Drag the following link to your bookmarks bar to install the bookmarklet:</p>
        
        <p>
            <a href="${bookmarkletUrl}" class="bookmarklet-link">${toolName}</a>
        </p>
        
        <div class="instructions">
            <h3>How to Install:</h3>
            <ol>
                <li>Make sure your bookmarks bar is visible (usually Ctrl+Shift+B or Cmd+Shift+B)</li>
                <li>Click and drag the blue "${toolName}" button above to your bookmarks bar</li>
                <li>The bookmarklet is now installed and ready to use!</li>
            </ol>
        </div>
        
        <div class="instructions">
            <h3>How to Use:</h3>
            <ol>
                <li>Navigate to any webpage where you want to use the tool</li>
                <li>Click the "${toolName}" bookmark in your bookmarks bar</li>
                <li>The tool will execute and show its results</li>
            </ol>
        </div>
        
        <div class="warning">
            <h3>⚠️ Security Note</h3>
            <p>This bookmarklet will execute JavaScript on web pages. Only use bookmarklets from trusted sources. 
            You can review the source code below to verify what it does.</p>
        </div>
        
        <h2>Source Code</h2>
        <p>Here's the JavaScript code that this bookmarklet executes:</p>
        <pre><code id="source-code"></code></pre>
        
        <h2>Browser Compatibility</h2>
        <ul>
            <li>✅ Chrome (latest)</li>
            <li>✅ Firefox (latest)</li>
            <li>✅ Safari (latest)</li>
            <li>✅ Edge (latest)</li>
        </ul>
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
            <p>Generated by TryIt-AI Bookmarklet Generator</p>
        </footer>
    </div>
    
    <script>
        // Display the formatted source code
        const sourceCode = decodeURIComponent('${bookmarkletUrl}'.replace('javascript:', ''));
        document.getElementById('source-code').textContent = sourceCode;
        
        // Add click handler for testing
        document.querySelector('.bookmarklet-link').addEventListener('click', function(e) {
            if (window.location.protocol === 'file:') {
                alert('Bookmarklets cannot be tested on file:// URLs. Please test on a regular website.');
                e.preventDefault();
            }
        });
    </script>
</body>
</html>
    `.trim();
  }

  private generateDocumentation(specification: ToolSpec, bookmarkletUrl: string): string {
    return `
# ${specification.name} Bookmarklet

${specification.description}

## Quick Start

1. **Install**: Drag this link to your bookmarks bar: [${specification.name}](${bookmarkletUrl})
2. **Use**: Click the bookmark on any webpage to execute the tool

## What it does

This bookmarklet will:
- Execute JavaScript code on the current webpage
- ${specification.description}
- Display results in a user-friendly format

## Installation Instructions

### Desktop Browsers
1. Make sure your bookmarks bar is visible
2. Drag the bookmarklet link to your bookmarks bar
3. Click the bookmark to use it on any page

### Mobile Browsers
1. Copy the bookmarklet code
2. Create a new bookmark
3. Paste the code as the URL
4. Give it a memorable name

## Security

This bookmarklet runs JavaScript code on web pages. The code is open source and you can review it to ensure it's safe. Key safety features:

- No external requests (unless specifically needed)
- No personal data collection
- All processing happens locally in your browser
- No permanent changes to websites

## Browser Support

- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+

## Troubleshooting

**Bookmarklet doesn't work?**
- Make sure JavaScript is enabled
- Try refreshing the page
- Some sites block bookmarklets - this is normal

**Installation problems?**
- Try right-clicking the link and "Bookmark this link"
- Copy the URL manually if drag-and-drop doesn't work

## Generated with TryIt-AI

This bookmarklet was automatically generated based on your specifications using the TryIt-AI Bookmarklet Generator.
    `.trim();
  }

  private generateTestCases(specification: ToolSpec) {
    return [
      {
        name: 'Basic execution test',
        input: { page: 'simple html page' },
        expectedOutput: 'Tool executes without errors',
        description: 'Test bookmarklet execution on a basic page'
      },
      {
        name: 'Complex page test',
        input: { page: 'page with many elements' },
        expectedOutput: 'Tool handles complex DOM correctly',
        description: 'Test bookmarklet on pages with complex structure'
      },
      {
        name: 'Error handling test',
        input: { page: 'page with restricted access' },
        expectedOutput: 'Graceful error handling',
        description: 'Test error handling when DOM access is restricted'
      }
    ];
  }

  private extractVariablesFromSpec(specification: ToolSpec, template: ToolTemplate): Record<string, any> {
    const variables: Record<string, any> = {
      title: specification.name,
      description: specification.description,
      modalStyles: this.getModalStyles(),
      utilityFunctions: this.getUtilityFunctions(),
      modifications: this.getDefaultModifications()
    };
    
    if (specification.parameters) {
      Object.assign(variables, specification.parameters);
    }
    
    return variables;
  }

  private getModalStyles(): string {
    return `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 999999;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;
  }

  private getUtilityFunctions(): string {
    return `
    function createModal() {
        const modal = document.createElement('div');
        modal.style.cssText = \`
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 999998;
            display: flex; align-items: center; justify-content: center;
        \`;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        document.body.appendChild(modal);
        return modal;
    }
    
    function showNotification(message, type = 'success') {
        const existing = document.getElementById('bookmarklet-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'bookmarklet-notification';
        notification.style.cssText = \`
            position: fixed; top: 20px; right: 20px; padding: 15px 20px;
            background: \${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white; border-radius: 5px; z-index: 999999;
            font-family: Arial, sans-serif; font-size: 14px;
        \`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
    
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    `;
  }

  private getDefaultModifications(): string {
    return `
        // Example modification - highlight all links
        const links = document.querySelectorAll('a');
        links.forEach(link => {
            link.style.backgroundColor = 'yellow';
            link.style.padding = '2px';
        });
    `;
  }
}
