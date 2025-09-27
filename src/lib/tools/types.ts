// Tool Generation Engine Types
// Built on the existing TryIt-AI foundation

import type {
  ToolSpec,
  ToolRequirement,
  GeneratedTool,
  ToolTestCase,
  ValidationResult,
  ValidationError,
  ToolType,
  ExportFormat,
  ToolGenerator
} from '../agents/types';

// Re-export core types
export type {
  ToolSpec,
  ToolRequirement,
  GeneratedTool,
  ToolTestCase,
  ValidationResult,
  ValidationError,
  ToolType,
  ExportFormat,
  ToolGenerator
};

// Extended tool types for specific implementations
export interface ToolTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: ToolType;
  readonly template: string;
  readonly placeholders: TemplatePlaceholder[];
  readonly dependencies: string[];
  readonly complexity: 'simple' | 'moderate' | 'complex';
  readonly tags: string[];
}

export interface TemplatePlaceholder {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description: string;
  readonly required: boolean;
  readonly defaultValue?: any;
  readonly validation?: PlaceholderValidation;
}

export interface PlaceholderValidation {
  readonly pattern?: string; // Regex pattern
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number; // For numbers
  readonly max?: number;
  readonly options?: string[]; // For select/enum
}

export interface ToolGenerationContext {
  readonly userRequest: string;
  readonly targetAudience: 'beginner' | 'intermediate' | 'advanced';
  readonly designPreferences?: {
    colorScheme: 'light' | 'dark' | 'auto';
    framework: 'vanilla' | 'bootstrap' | 'tailwind';
    interactivity: 'minimal' | 'moderate' | 'rich';
  };
  readonly constraints?: {
    maxFileSize: number;
    supportedBrowsers: string[];
    accessibility: boolean;
    mobile: boolean;
  };
}

export interface ToolAsset {
  readonly name: string;
  readonly type: 'css' | 'js' | 'html' | 'image' | 'data';
  readonly content: string;
  readonly size: number;
  readonly dependencies?: string[];
}

export interface ToolPackage {
  readonly tool: GeneratedTool;
  readonly assets: ToolAsset[];
  readonly manifest: ToolManifest;
  readonly readme: string;
}

export interface ToolManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly license: string;
  readonly keywords: string[];
  readonly main: string;
  readonly files: string[];
  readonly dependencies?: Record<string, string>;
  readonly scripts?: Record<string, string>;
}

export interface ToolLibrary {
  readonly components: ComponentDefinition[];
  readonly patterns: PatternDefinition[];
  readonly utilities: UtilityFunction[];
}

export interface ComponentDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly html: string;
  readonly css: string;
  readonly js?: string;
  readonly props: ComponentProp[];
  readonly examples: ComponentExample[];
  readonly accessibility: AccessibilityInfo;
}

export interface ComponentProp {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
  readonly defaultValue?: any;
}

export interface ComponentExample {
  readonly name: string;
  readonly description: string;
  readonly code: string;
  readonly preview?: string;
}

export interface AccessibilityInfo {
  readonly ariaAttributes: string[];
  readonly keyboardNavigation: boolean;
  readonly screenReaderSupport: boolean;
  readonly contrastRatio?: number;
}

export interface PatternDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly code: string;
  readonly language: string;
  readonly useCases: string[];
  readonly pros: string[];
  readonly cons: string[];
}

export interface UtilityFunction {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly code: string;
  readonly parameters: FunctionParameter[];
  readonly returnType: string;
  readonly examples: string[];
}

export interface FunctionParameter {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly optional: boolean;
  readonly defaultValue?: any;
}

export interface BookmarkletConfig {
  readonly name: string;
  readonly description: string;
  readonly code: string;
  readonly permissions: string[];
  readonly domains: string[];
  readonly icon?: string;
}

export interface HTMLToolConfig {
  readonly title: string;
  readonly description: string;
  readonly styles: 'inline' | 'external' | 'none';
  readonly scripts: 'inline' | 'external' | 'none';
  readonly responsive: boolean;
  readonly darkMode: boolean;
}

export interface JSToolConfig {
  readonly moduleType: 'iife' | 'umd' | 'esm' | 'cjs';
  readonly dependencies: string[];
  readonly target: 'es5' | 'es2015' | 'es2020' | 'esnext';
  readonly minify: boolean;
  readonly sourcemap: boolean;
}
