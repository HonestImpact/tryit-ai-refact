// Plugin Manager - Core system for managing plugins
// Built on the existing TryIt-AI foundation

import type {
  Plugin,
  PluginManager as IPluginManager,
  PluginRegistry,
  PluginStatus,
  PluginContext,
  PluginValidationResult,
  PluginPermission,
  SystemEvent,
  PluginCategory
} from './types';
import { PluginRegistryImpl } from './plugin-registry';
import { createPluginContext } from './plugin-context';

interface PluginManagerConfig {
  readonly maxPlugins: number;
  readonly sandboxed: boolean;
  readonly autoLoad: boolean;
  readonly permissionLevel: 'strict' | 'moderate' | 'permissive';
  readonly resourceLimits: {
    memory: number; // MB
    cpu: number; // percentage
    networkRequests: number; // per minute
  };
}

export class PluginManager implements IPluginManager {
  public readonly registry: PluginRegistry;
  private loadedPlugins: Map<string, Plugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private pluginStatuses: Map<string, PluginStatus> = new Map();
  private config: PluginManagerConfig;
  private eventListeners: Map<string, Set<(event: SystemEvent, data?: any) => void>> = new Map();

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = {
      maxPlugins: 50,
      sandboxed: true,
      autoLoad: false,
      permissionLevel: 'moderate',
      resourceLimits: {
        memory: 100, // 100MB per plugin
        cpu: 5, // 5% CPU per plugin
        networkRequests: 100 // 100 requests per minute
      },
      ...config
    };

    this.registry = new PluginRegistryImpl();
  }

  /**
   * Load a plugin into the system
   */
  public async loadPlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (this.isLoaded(pluginId)) {
      this.log('warn', 'Plugin already loaded', { pluginId });
      return;
    }

    // Check dependencies
    const dependencyCheck = this.registry.checkDependencies(pluginId);
    if (!dependencyCheck.isValid) {
      throw new Error(`Plugin dependencies not satisfied: ${dependencyCheck.errors.map(e => e.message).join(', ')}`);
    }

    // Validate plugin
    const validation = await this.validatePlugin(plugin);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check resource limits
    if (this.loadedPlugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugin limit reached (${this.config.maxPlugins})`);
    }

    try {
      const startTime = Date.now();

      // Create plugin context
      const context = await createPluginContext(plugin, {
        sandboxed: this.config.sandboxed,
        permissions: this.getPermissionLevel(plugin),
        resourceLimits: this.config.resourceLimits
      });

      this.pluginContexts.set(pluginId, context);

      // Initialize plugin
      if (plugin.lifecycle.onLoad) {
        await plugin.lifecycle.onLoad(context);
      }

      // Mark as loaded
      this.loadedPlugins.set(pluginId, plugin);

      // Update status
      const loadTime = Date.now() - startTime;
      this.updatePluginStatus(pluginId, {
        loaded: true,
        enabled: true,
        lastLoaded: new Date(),
        loadTime,
        errors: [],
        warnings: validation.warnings.map(w => w.message)
      });

      // Emit system event
      this.emitSystemEvent('plugin-loaded', { pluginId, plugin });

      this.log('info', 'Plugin loaded successfully', { pluginId, loadTime });
    } catch (error) {
      this.updatePluginStatus(pluginId, {
        loaded: false,
        enabled: false,
        errors: [(error as Error).message]
      });

      throw new Error(`Failed to load plugin ${pluginId}: ${error}`);
    }
  }

  /**
   * Unload a plugin from the system
   */
  public async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      this.log('warn', 'Attempting to unload non-loaded plugin', { pluginId });
      return;
    }

    try {
      // Check if other plugins depend on this one
      const dependents = this.findDependentPlugins(pluginId);
      if (dependents.length > 0) {
        throw new Error(`Cannot unload plugin ${pluginId}: required by ${dependents.map(p => p.id).join(', ')}`);
      }

      // Call plugin cleanup
      const context = this.pluginContexts.get(pluginId);
      if (context && plugin.lifecycle.onUnload) {
        await plugin.lifecycle.onUnload(context);
      }

      // Clean up context
      if (context) {
        await this.cleanupPluginContext(context);
        this.pluginContexts.delete(pluginId);
      }

      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);

      // Update status
      this.updatePluginStatus(pluginId, {
        loaded: false,
        enabled: false,
        errors: []
      });

      // Emit system event
      this.emitSystemEvent('plugin-unloaded', { pluginId, plugin });

      this.log('info', 'Plugin unloaded successfully', { pluginId });
    } catch (error) {
      this.updatePluginStatus(pluginId, {
        errors: [(error as Error).message]
      });
      throw error;
    }
  }

  /**
   * Configure a plugin
   */
  public async configurePlugin(pluginId: string, config: Record<string, any>): Promise<void> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not loaded`);
    }

    // Validate configuration
    const validation = this.validatePluginConfig(plugin, config);
    if (!validation.isValid) {
      throw new Error(`Invalid plugin configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Update context config
      const context = this.pluginContexts.get(pluginId);
      if (context) {
        (context as any).config = { ...context.config, ...config };

        // Notify plugin of config change
        if (plugin.lifecycle.onConfigChange) {
          await plugin.lifecycle.onConfigChange(context.config, context);
        }
      }

      this.log('info', 'Plugin configured successfully', { pluginId, config });
    } catch (error) {
      throw new Error(`Failed to configure plugin ${pluginId}: ${error}`);
    }
  }

  /**
   * Get plugin status
   */
  public getPluginStatus(pluginId: string): PluginStatus {
    const plugin = this.registry.get(pluginId);
    const defaultStatus: PluginStatus = {
      pluginId,
      loaded: false,
      enabled: false,
      version: plugin?.version || 'unknown',
      errors: [],
      warnings: [],
      resourceUsage: { memory: 0, cpu: 0, networkRequests: 0 }
    };

    return this.pluginStatuses.get(pluginId) || defaultStatus;
  }

  /**
   * Install a new plugin
   */
  public async installPlugin(plugin: Plugin): Promise<void> {
    // Validate plugin
    const validation = await this.validatePlugin(plugin);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Register plugin
    await this.registry.register(plugin);

    // Auto-load if configured
    if (this.config.autoLoad) {
      await this.loadPlugin(plugin.id);
    }

    this.log('info', 'Plugin installed successfully', { pluginId: plugin.id });
  }

  /**
   * Update a plugin to a new version
   */
  public async updatePlugin(pluginId: string, newVersion: Plugin): Promise<void> {
    const isLoaded = this.isLoaded(pluginId);

    // Unload current version if loaded
    if (isLoaded) {
      await this.unloadPlugin(pluginId);
    }

    // Unregister old version
    await this.registry.unregister(pluginId);

    // Install new version
    await this.installPlugin(newVersion);

    // Reload if it was previously loaded
    if (isLoaded) {
      await this.loadPlugin(pluginId);
    }

    this.log('info', 'Plugin updated successfully', { 
      pluginId, 
      newVersion: newVersion.version 
    });
  }

  /**
   * Remove a plugin completely
   */
  public async removePlugin(pluginId: string): Promise<void> {
    // Unload if loaded
    if (this.isLoaded(pluginId)) {
      await this.unloadPlugin(pluginId);
    }

    // Unregister
    await this.registry.unregister(pluginId);

    // Clean up status
    this.pluginStatuses.delete(pluginId);

    this.log('info', 'Plugin removed successfully', { pluginId });
  }

  /**
   * List all loaded plugins
   */
  public listLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Validate a plugin
   */
  public async validatePlugin(plugin: Plugin): Promise<PluginValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic validation
    if (!plugin.id || plugin.id.length === 0) {
      errors.push({ code: 'MISSING_ID', message: 'Plugin ID is required' });
    }

    if (!plugin.name || plugin.name.length === 0) {
      errors.push({ code: 'MISSING_NAME', message: 'Plugin name is required' });
    }

    if (!plugin.version || plugin.version.length === 0) {
      errors.push({ code: 'MISSING_VERSION', message: 'Plugin version is required' });
    }

    // Permission validation
    if (this.config.permissionLevel === 'strict') {
      for (const permission of plugin.permissions) {
        if (!this.isPermissionAllowed(permission)) {
          errors.push({
            code: 'PERMISSION_DENIED',
            message: `Permission ${permission} not allowed in strict mode`
          });
        }
      }
    }

    // Dependency validation
    for (const dep of plugin.dependencies) {
      const depPlugin = this.registry.get(dep.pluginId);
      if (!dep.optional && !depPlugin) {
        errors.push({
          code: 'MISSING_DEPENDENCY',
          message: `Required dependency ${dep.pluginId} not found`
        });
      } else if (depPlugin && !this.isVersionCompatible(depPlugin.version, dep.version)) {
        warnings.push({
          code: 'VERSION_MISMATCH',
          message: `Dependency ${dep.pluginId} version mismatch`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if plugin has specific permission
   */
  public checkPermissions(pluginId: string, permission: PluginPermission): boolean {
    const plugin = this.registry.get(pluginId);
    if (!plugin) return false;

    return plugin.permissions.includes(permission) && this.isPermissionAllowed(permission);
  }

  /**
   * Check if plugin is loaded
   */
  public isLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId);
  }

  /**
   * Subscribe to system events
   */
  public onSystemEvent(event: SystemEvent, handler: (data?: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(handler);
    
    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  /**
   * Emit system event to all plugins
   */
  public emitSystemEvent(event: SystemEvent, data?: any): void {
    // Notify event listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log('error', 'Error in event handler', { event, error });
        }
      });
    }

    // Notify loaded plugins
    for (const [pluginId, plugin] of this.loadedPlugins) {
      const context = this.pluginContexts.get(pluginId);
      if (context && plugin.lifecycle.onSystemEvent) {
        try {
          plugin.lifecycle.onSystemEvent(event, context);
        } catch (error) {
          this.log('error', 'Plugin system event handler failed', {
            pluginId,
            event,
            error
          });
        }
      }
    }
  }

  // ===== PRIVATE METHODS =====

  private updatePluginStatus(pluginId: string, updates: Partial<PluginStatus>): void {
    const current = this.getPluginStatus(pluginId);
    this.pluginStatuses.set(pluginId, { ...current, ...updates });
  }

  private findDependentPlugins(pluginId: string): Plugin[] {
    const dependents: Plugin[] = [];
    
    for (const plugin of this.loadedPlugins.values()) {
      if (plugin.dependencies.some(dep => dep.pluginId === pluginId)) {
        dependents.push(plugin);
      }
    }
    
    return dependents;
  }

  private getPermissionLevel(plugin: Plugin): PluginPermission[] {
    if (this.config.permissionLevel === 'permissive') {
      return plugin.permissions;
    } else if (this.config.permissionLevel === 'strict') {
      return plugin.permissions.filter(p => this.isPermissionAllowed(p));
    } else {
      // moderate - exclude dangerous permissions
      const dangerousPermissions: PluginPermission[] = ['file-system', 'environment-variables'];
      return plugin.permissions.filter(p => !dangerousPermissions.includes(p));
    }
  }

  private isPermissionAllowed(permission: PluginPermission): boolean {
    if (this.config.permissionLevel === 'permissive') return true;
    
    const restrictedPermissions: PluginPermission[] = [
      'file-system',
      'environment-variables',
      'system-config'
    ];
    
    return !restrictedPermissions.includes(permission);
  }

  private validatePluginConfig(plugin: Plugin, config: Record<string, any>): PluginValidationResult {
    const errors: any[] = [];
    
    // Check required fields
    for (const required of plugin.config.required) {
      if (!(required in config)) {
        errors.push({
          code: 'MISSING_REQUIRED',
          message: `Required field ${required} is missing`,
          field: required
        });
      }
    }
    
    // Run custom validations
    for (const validation of plugin.config.validation) {
      const value = config[validation.field];
      if (!this.validateField(value, validation)) {
        errors.push({
          code: validation.rule.toUpperCase(),
          message: validation.message,
          field: validation.field
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateField(value: any, validation: any): boolean {
    switch (validation.rule) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'format':
        return validation.value ? new RegExp(validation.value).test(value) : true;
      case 'range':
        return value >= validation.min && value <= validation.max;
      default:
        return true;
    }
  }

  private isVersionCompatible(installedVersion: string, requiredVersion: string): boolean {
    // Simplified version checking - in practice, use semver
    return installedVersion >= requiredVersion;
  }

  private async cleanupPluginContext(context: PluginContext): Promise<void> {
    try {
      // Clear plugin storage
      await context.storage.clear();
      
      // Remove all event listeners
      // This would be implemented based on the actual event bus implementation
      
    } catch (error) {
      this.log('warn', 'Error during plugin context cleanup', { error });
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logData = {
      component: 'plugin-manager',
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    console.log(`[${level.toUpperCase()}] PluginManager:`, logData);
  }
}
