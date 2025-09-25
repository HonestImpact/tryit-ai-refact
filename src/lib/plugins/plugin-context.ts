// Plugin Context - Provides sandboxed environment and APIs for plugins
// Built on the existing TryIt-AI foundation

import type {
  Plugin,
  PluginContext,
  PluginLogger,
  PluginStorage,
  PluginEventBus,
  SystemAPI,
  PluginPermission
} from './types';

interface ContextConfig {
  readonly sandboxed: boolean;
  readonly permissions: PluginPermission[];
  readonly resourceLimits: {
    memory: number;
    cpu: number;
    networkRequests: number;
  };
}

/**
 * Create a plugin context with proper sandboxing and API access
 */
export async function createPluginContext(
  plugin: Plugin,
  config: ContextConfig
): Promise<PluginContext> {
  const logger = createPluginLogger(plugin.id);
  const storage = createPluginStorage(plugin.id);
  const events = createPluginEventBus(plugin.id);
  const systemAPI = createSystemAPI(plugin.id, config.permissions);

  return {
    pluginId: plugin.id,
    config: { ...plugin.config.defaults },
    logger,
    storage,
    events,
    system: systemAPI
  };
}

/**
 * Create a sandboxed logger for the plugin
 */
function createPluginLogger(pluginId: string): PluginLogger {
  const logPrefix = `[Plugin:${pluginId}]`;

  return {
    info: (message: string, metadata?: Record<string, any>) => {
      console.log(`${logPrefix} INFO:`, message, metadata || {});
    },

    warn: (message: string, metadata?: Record<string, any>) => {
      console.warn(`${logPrefix} WARN:`, message, metadata || {});
    },

    error: (message: string, metadata?: Record<string, any>) => {
      console.error(`${logPrefix} ERROR:`, message, metadata || {});
    },

    debug: (message: string, metadata?: Record<string, any>) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`${logPrefix} DEBUG:`, message, metadata || {});
      }
    }
  };
}

/**
 * Create isolated storage for the plugin
 */
function createPluginStorage(pluginId: string): PluginStorage {
  const storagePrefix = `plugin_${pluginId}_`;
  const storage = new Map<string, any>();

  return {
    async get<T = any>(key: string): Promise<T | null> {
      const fullKey = storagePrefix + key;
      
      try {
        // In a real implementation, this might use IndexedDB, localStorage, or a database
        const value = storage.get(fullKey);
        return value !== undefined ? value : null;
      } catch (error) {
        console.error(`Plugin storage get error for ${pluginId}:`, error);
        return null;
      }
    },

    async set<T = any>(key: string, value: T): Promise<void> {
      const fullKey = storagePrefix + key;
      
      try {
        storage.set(fullKey, value);
      } catch (error) {
        console.error(`Plugin storage set error for ${pluginId}:`, error);
        throw error;
      }
    },

    async delete(key: string): Promise<void> {
      const fullKey = storagePrefix + key;
      storage.delete(fullKey);
    },

    async clear(): Promise<void> {
      const keysToDelete = Array.from(storage.keys()).filter(key => 
        key.startsWith(storagePrefix)
      );
      
      keysToDelete.forEach(key => storage.delete(key));
    },

    async list(): Promise<string[]> {
      return Array.from(storage.keys())
        .filter(key => key.startsWith(storagePrefix))
        .map(key => key.substring(storagePrefix.length));
    }
  };
}

/**
 * Create event bus for plugin communication
 */
function createPluginEventBus(pluginId: string): PluginEventBus {
  const listeners = new Map<string, Set<(data?: any) => void>>();

  return {
    emit: (event: string, data?: any) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Plugin ${pluginId} event handler error:`, error);
          }
        });
      }
    },

    on: (event: string, handler: (data?: any) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);

      return () => {
        listeners.get(event)?.delete(handler);
      };
    },

    off: (event: string, handler: (data?: any) => void) => {
      listeners.get(event)?.delete(handler);
    },

    once: (event: string, handler: (data?: any) => void) => {
      const wrappedHandler = (data?: any) => {
        handler(data);
        listeners.get(event)?.delete(wrappedHandler);
      };

      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrappedHandler);
    }
  };
}

/**
 * Create system API with permission checking
 */
function createSystemAPI(pluginId: string, permissions: PluginPermission[]): SystemAPI {
  const hasPermission = (required: PluginPermission) => permissions.includes(required);

  return {
    agents: {
      async register(agent: any): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to register agents');
        }
        
        // Integration with actual agent system would go here
        console.log(`Plugin ${pluginId} registering agent:`, agent.name);
      },

      async unregister(agentId: string): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to unregister agents');
        }
        
        console.log(`Plugin ${pluginId} unregistering agent:`, agentId);
      },

      async sendMessage(agentId: string, message: any): Promise<any> {
        if (!hasPermission('session-data')) {
          throw new Error('Plugin does not have permission to send agent messages');
        }
        
        // Integration with actual messaging would go here
        return { response: 'Message sent via plugin API' };
      },

      getAgent(agentId: string): any | null {
        // Return read-only agent information
        return null; // Would integrate with actual agent registry
      },

      listAgents(): any[] {
        // Return list of available agents
        return []; // Would integrate with actual agent registry
      }
    },

    knowledge: {
      async addSource(source: any): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to add knowledge sources');
        }
        
        console.log(`Plugin ${pluginId} adding knowledge source:`, source.name);
      },

      async removeSource(sourceId: string): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to remove knowledge sources');
        }
        
        console.log(`Plugin ${pluginId} removing knowledge source:`, sourceId);
      },

      async search(query: string, options?: any): Promise<any[]> {
        if (!hasPermission('session-data')) {
          throw new Error('Plugin does not have permission to search knowledge');
        }
        
        // Integration with knowledge system would go here
        return [];
      },

      async index(content: string, metadata: any): Promise<string> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to index content');
        }
        
        // Integration with indexing system would go here
        return 'indexed_content_id';
      }
    },

    tools: {
      async registerGenerator(generator: any): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to register tool generators');
        }
        
        console.log(`Plugin ${pluginId} registering tool generator:`, generator.type);
      },

      async unregisterGenerator(type: string): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to unregister tool generators');
        }
        
        console.log(`Plugin ${pluginId} unregistering tool generator:`, type);
      },

      async generateTool(spec: any): Promise<any> {
        if (!hasPermission('session-data')) {
          throw new Error('Plugin does not have permission to generate tools');
        }
        
        // Integration with tool generation would go here
        return { toolId: 'generated_tool_id', content: 'Generated tool content' };
      },

      listGenerators(): any[] {
        // Return list of available generators
        return [];
      }
    },

    analytics: {
      async track(event: string, data: any): Promise<void> {
        if (!hasPermission('session-data')) {
          throw new Error('Plugin does not have permission to track analytics');
        }
        
        console.log(`Plugin ${pluginId} tracking event:`, event, data);
      },

      async getMetrics(query: any): Promise<any> {
        if (!hasPermission('session-data')) {
          throw new Error('Plugin does not have permission to access metrics');
        }
        
        // Integration with analytics system would go here
        return {};
      },

      async createDashboard(config: any): Promise<string> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to create dashboards');
        }
        
        console.log(`Plugin ${pluginId} creating dashboard:`, config.name);
        return 'dashboard_id';
      }
    },

    config: {
      get(key: string): any {
        // Plugins can only access their own configuration
        if (!key.startsWith(`plugins.${pluginId}.`)) {
          throw new Error('Plugin can only access its own configuration');
        }
        
        // Integration with config system would go here
        return null;
      },

      async set(key: string, value: any): Promise<void> {
        if (!hasPermission('system-config')) {
          throw new Error('Plugin does not have permission to modify configuration');
        }
        
        if (!key.startsWith(`plugins.${pluginId}.`)) {
          throw new Error('Plugin can only modify its own configuration');
        }
        
        console.log(`Plugin ${pluginId} setting config:`, key, value);
      },

      watch(key: string, callback: (value: any) => void): () => void {
        if (!key.startsWith(`plugins.${pluginId}.`)) {
          throw new Error('Plugin can only watch its own configuration');
        }
        
        // Integration with config watching would go here
        return () => {
          // Cleanup watcher
        };
      }
    }
  };
}
