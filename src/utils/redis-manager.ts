import Redis, { RedisOptions } from 'ioredis';
import { createPool, Pool } from 'generic-pool';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from './logger';

/**
 * Options for RedisManager
 */
interface IRedisManagerOptions {
  credentials: RedisOptions;
  scripts: string[];
  logLevel?: 'silent' | 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Class for managing Redis connections and Lua scripts
 */
export class RedisManager {
  private logger: Logger;
  private pool: Pool<Redis>;
  private scripts: string[] = ["dequeue", "enqueue", "get_status", "update_status"];
  private scriptsDir: string = join(__dirname, '..', 'scripts');
  private scriptContents: Map<string, string> = new Map();
  private scriptShas: Map<string, string> = new Map();

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: IRedisManagerOptions) {
    this.pool = createPool(
      {
        create: async () => new Redis(options.credentials),
        destroy: async (client: Redis) => {
          await client.quit();
          return Promise.resolve();
        },
      },
      {
        max: 10,
        min: 2,
      }
    );

    this.scripts = options.scripts;
    this.logger = new Logger(options.logLevel || 'info', 'RedisManager');
  }

  /**
   * Gets the SHA of a loaded Lua script
   * @param scriptName Script name
   * @returns SHA of the script or undefined if not loaded
   */
  public getScriptSha = (scriptName: string): string | undefined => {
    return this.scriptShas.get(scriptName);
  }

  /**
   * Initializes the Redis manager
   * Loads and registers all Lua scripts
   */
  public async init(): Promise<void> {
    try {
      this.logger.info('Initializing Redis manager');
      await this.loadAndRegisterLuaScripts();
      this.logger.info('Redis manager initialized successfully');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error initializing Redis manager: ${error.message}`);
      } else {
        this.logger.error(`Unknown error initializing Redis manager: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Loads and registers all Lua scripts in Redis
   */
  private async loadAndRegisterLuaScripts(): Promise<void> {
    this.logger.info('Loading Lua scripts');
    
    // Get a client from the pool
    const client = await this.pool.acquire();
    
    try {
      // Load each script
      for (const scriptName of this.scripts) {
        const scriptContent = await this.loadLuaScript(scriptName);
        
        if (scriptContent) {
          // Register the script in Redis and get its SHA
          const sha = await client.script('LOAD', scriptContent) as string;
          this.scriptShas.set(scriptName, sha);
          this.scriptContents.set(scriptName, scriptContent);
          this.logger.info(`Script ${scriptName} loaded with SHA: ${sha}`);
        }
      }
    } finally {
      // Release the client back to the pool
      await this.pool.release(client);
    }
  }

  /**
   * Loads a Lua script from the file system
   * @param scriptName Script name (without extension)
   * @returns Script content or null if not found
   */
  private async loadLuaScript(scriptName: string): Promise<string | null> {
    try {
      const scriptPath = join(this.scriptsDir, `${scriptName}.lua`);
      const content = await fs.readFile(scriptPath, 'utf8');
      return content;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error loading script ${scriptName}: ${error.message}`);
      } else {
        this.logger.error(`Unknown error loading script ${scriptName}: ${String(error)}`);
      }
      return null;
    }
  }

  /**
   * Gets a Redis client from the pool
   * @returns Redis client
   */
  public async getClient(): Promise<Redis> {
    try {
      return await this.pool.acquire();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting Redis client: ${error.message}`);
      } else {
        this.logger.error(`Unknown error getting Redis client: ${String(error)}`);
      }
      throw error;
    }
  }

  /**
   * Releases a Redis client back to the pool
   * @param client Redis client to release
   */
  public async releaseClient(client: Redis): Promise<void> {
    try {
      await this.pool.release(client);
    } catch (error) {
      this.logger.error(`Error releasing Redis client: ${String(error)}`);
    }
  }

  /**
   * Closes the Redis manager and all connections
   */
  public async close(): Promise<void> {
    this.logger.info('Closing Redis manager');
    await this.pool.drain();
    await this.pool.clear();
    this.logger.info('Redis manager closed');
  }
} 