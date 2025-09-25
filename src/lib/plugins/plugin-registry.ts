// Plugin Registry - Manages plugin registration and discovery
// Built on the existing TryIt-AI foundation

import type {
  Plugin,
  PluginRegistry,
  PluginCategory,
  PluginValidationResult,
  PluginValidationError
} from './types';

export class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private categorizedPlugins: Map<PluginCategory, Set<string>> = new Map();

  /**
   * Register a new plugin
   */
  public async register(plugin: Plugin): Promise<void> {
    // Validate plugin
    const validation = this.validatePluginStructure(plugin);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for ID conflicts
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID ${plugin.id} is already registered`);
    }

    // Register plugin
    this.plugins.set(plugin.id, plugin);

    // Add to category index
    if (!this.categorizedPlugins.has(plugin.category)) {
      this.categorizedPlugins.set(plugin.category, new Set());
    }
    this.categorizedPlugins.get(plugin.category)!.add(plugin.id);

    this.log('info', 'Plugin registered', { pluginId: plugin.id, category: plugin.category });
  }

  /**
   * Unregister a plugin
   */
  public async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Remove from category index
    const categorySet = this.categorizedPlugins.get(plugin.category);
    if (categorySet) {
      categorySet.delete(pluginId);
      if (categorySet.size === 0) {
        this.categorizedPlugins.delete(plugin.category);
      }
    }

    // Remove from main registry
    this.plugins.delete(pluginId);

    this.log('info', 'Plugin unregistered', { pluginId });
  }

  /**
   * Load a plugin (mark as available for loading)
   */
  public async load(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // In a more complex implementation, this might involve
    // downloading the plugin files, validating signatures, etc.
    this.log('info', 'Plugin loaded for installation', { pluginId });
  }

  /**
   * Unload a plugin (mark as unavailable)
   */
  public async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    this.log('info', 'Plugin unloaded', { pluginId });
  }

  /**
   * Get a specific plugin
   */
  public get(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * List all registered plugins
   */
  public list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Find plugins by category
   */
  public findByCategory(category: PluginCategory): Plugin[] {
    const pluginIds = this.categorizedPlugins.get(category);
    if (!pluginIds) return [];

    return Array.from(pluginIds)
      .map(id => this.plugins.get(id))
      .filter((plugin): plugin is Plugin => plugin !== undefined);
  }

  /**
   * Check if plugin is loaded
   */
  public isLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugin dependencies
   */
  public getDependencies(pluginId: string): Plugin[] {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return [];

    return plugin.dependencies
      .map(dep => this.plugins.get(dep.pluginId))
      .filter((plugin): plugin is Plugin => plugin !== undefined);
  }

  /**
   * Check if all dependencies are satisfied
   */
  public checkDependencies(pluginId: string): PluginValidationResult {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return {
        isValid: false,
        errors: [{
          code: 'PLUGIN_NOT_FOUND',
          message: `Plugin ${pluginId} not found`,
          severity: 'error'
        }],
        warnings: []
      };
    }

    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationError[] = [];

    // Check each dependency
    for (const dependency of plugin.dependencies) {
      const depPlugin = this.plugins.get(dependency.pluginId);
      
      if (!depPlugin) {
        if (dependency.optional) {
          warnings.push({
            code: 'OPTIONAL_DEPENDENCY_MISSING',
            message: `Optional dependency ${dependency.pluginId} not found`,
            severity: 'warning'
          });
        } else {
          errors.push({
            code: 'REQUIRED_DEPENDENCY_MISSING',
            message: `Required dependency ${dependency.pluginId} not found`,
            severity: 'error'
          });
        }
      } else {
        // Check version compatibility
        if (!this.isVersionCompatible(depPlugin.version, dependency.version)) {
          errors.push({
            code: 'DEPENDENCY_VERSION_MISMATCH',
            message: `Dependency ${dependency.pluginId} version ${depPlugin.version} does not satisfy requirement ${dependency.version}`,
            severity: 'error'
          });
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.findCircularDependencies(pluginId);
    if (circularDeps.length > 0) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected: ${circularDeps.join(' -> ')}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Search plugins by name or description
   */
  public search(query: string): Plugin[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.plugins.values()).filter(plugin =>
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.description.toLowerCase().includes(lowerQuery) ||
      plugin.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get plugin statistics
   */
  public getStatistics() {
    const categoryStats = new Map<PluginCategory, number>();
    
    for (const [category, pluginIds] of this.categorizedPlugins) {
      categoryStats.set(category, pluginIds.size);
    }

    return {
      totalPlugins: this.plugins.size,
      categoryCounts: Object.fromEntries(categoryStats),
      categories: Array.from(this.categorizedPlugins.keys())
    };
  }

  /**
   * Export plugin registry (for backup/sync)
   */
  public export(): any {
    return {
      plugins: Array.from(this.plugins.values()),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Import plugin registry (for restore/sync)
   */
  public async import(data: any): Promise<void> {
    if (!data.plugins || !Array.isArray(data.plugins)) {
      throw new Error('Invalid plugin registry export format');
    }

    // Clear current registry
    this.plugins.clear();
    this.categorizedPlugins.clear();

    // Import plugins
    for (const plugin of data.plugins) {
      await this.register(plugin);
    }

    this.log('info', 'Plugin registry imported', { 
      pluginCount: data.plugins.length 
    });
  }

  // ===== PRIVATE METHODS =====

  private validatePluginStructure(plugin: Plugin): PluginValidationResult {
    const errors: PluginValidationError[] = [];
    const warnings: PluginValidationError[] = [];

    // Required fields
    if (!plugin.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Plugin ID is required',
        field: 'id',
        severity: 'error'
      });
    }

    if (!plugin.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Plugin name is required',
        field: 'name',
        severity: 'error'
      });
    }

    if (!plugin.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Plugin version is required',
        field: 'version',
        severity: 'error'
      });
    }

    if (!plugin.category) {
      errors.push({
        code: 'MISSING_CATEGORY',
        message: 'Plugin category is required',
        field: 'category',
        severity: 'error'
      });
    }

    // Validate plugin ID format
    if (plugin.id && !/^[a-z0-9-]+$/.test(plugin.id)) {
      errors.push({
        code: 'INVALID_ID_FORMAT',
        message: 'Plugin ID must contain only lowercase letters, numbers, and hyphens',
        field: 'id',
        severity: 'error'
      });
    }

    // Validate version format (simplified semver)
    if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
      warnings.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Plugin version should follow semantic versioning (x.y.z)',
        field: 'version',
        severity: 'warning'
      });
    }

    // Validate permissions
    const validPermissions = [
      'network-access', 'file-system', 'environment-variables',
      'database-access', 'llm-provider-access', 'session-data',
      'user-data', 'system-config'
    ];

    for (const permission of plugin.permissions) {
      if (!validPermissions.includes(permission)) {
        warnings.push({
          code: 'UNKNOWN_PERMISSION',
          message: `Unknown permission: ${permission}`,
          severity: 'warning'
        });
      }
    }

    // Validate config schema
    if (plugin.config && !plugin.config.schema) {
      warnings.push({
        code: 'MISSING_CONFIG_SCHEMA',
        message: 'Plugin config should include a schema for validation',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isVersionCompatible(installedVersion: string, requiredVersion: string): boolean {
    // Simplified version comparison
    // In practice, you'd use a proper semver library
    const parseVersion = (version: string) => {
      const parts = version.split('.').map(Number);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const installed = parseVersion(installedVersion);
    const required = parseVersion(requiredVersion);

    // Major version must match, minor and patch can be higher
    return installed.major === required.major &&
           (installed.minor > required.minor ||
            (installed.minor === required.minor && installed.patch >= required.patch));
  }

  private findCircularDependencies(pluginId: string, visited: Set<string> = new Set(), path: string[] = []): string[] {
    if (visited.has(pluginId)) {
      const circleStart = path.indexOf(pluginId);
      return circleStart >= 0 ? path.slice(circleStart).concat(pluginId) : [];
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin) return [];

    visited.add(pluginId);
    path.push(pluginId);

    for (const dependency of plugin.dependencies) {
      const circular = this.findCircularDependencies(dependency.pluginId, visited, path);
      if (circular.length > 0) {
        return circular;
      }
    }

    path.pop();
    visited.delete(pluginId);
    return [];
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'plugin-registry',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] PluginRegistry:`, logData);
  }
}
