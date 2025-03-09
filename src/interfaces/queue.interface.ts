import { RedisOptions } from 'ioredis';

/**
 * Interface for job data
 */
export interface IJobData {
  id: string | number;
  data: any;
  groupName: string;
  progress?: (value: number) => Promise<void>;
}

/**
 * Callback function for processing jobs
 */
export interface ICallback {
  (job: IJobData, done: (err?: Error) => void): void;
}

/**
 * Queue initialization options
 */
export interface IQueueOptions {
  /**
   * Redis connection options
   */
  credentials: RedisOptions;
  
  /**
   * Consumer limits per queue
   */
  consumerLimits?: Record<string, number>;
  
  /**
   * Log level
   */
  logLevel?: 'silent' | 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * Instance type: publisher or subscriber
   */
  type: 'publisher' | 'subscriber';
}

/**
 * Lua script result
 */
export interface ILuaScriptResult {
  jobId: string | number;
  jobData: Record<string, any>;
  groupName: string;
}

/**
 * Job status
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Options for adding a job to the queue
 */
export interface IAddJobOptions {
  /**
   * Job priority (lower number = higher priority)
   */
  priority?: number;
  
  /**
   * Delay in milliseconds before processing the job
   */
  delay?: number;
  
  /**
   * Time to live in milliseconds for the job
   */
  ttl?: number;
} 