import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { Consumer } from './consumer';
import { ICallback, IJobData, IQueueOptions, IAddJobOptions } from './interfaces/queue.interface';
import { Logger } from './utils/logger';
import { RedisManager } from './utils/redis-manager';

/**
 * Main class for managing the job queue
 */
export class Queue {
  private uid: string;
  private logger: Logger;
  private subscriberClient?: Redis;
  private publisherClient?: Redis;
  private type: 'publisher' | 'subscriber';
  private redisManager: RedisManager;
  private consumerLimits?: Record<string, number>;
  private consumers = new Map<string, Consumer>();
  private activeProcessingInterval: NodeJS.Timeout | null = null;

  /**
   * Constructor
   * @param options Initialization options
   */
  constructor(options: IQueueOptions) {
    this.uid = uuidv4();
    this.logger = new Logger(options.logLevel || 'info', `Queue:${this.uid.substring(0, 8)}`);
    this.redisManager = new RedisManager({
      credentials: options.credentials,
      scripts: ["dequeue", "enqueue", "get_status", "update_status"],
      logLevel: options.logLevel
    });

    this.logger.info(`Initializing queue with UID: ${this.uid}`);

    this.type = options.type;
    this.consumerLimits = options.consumerLimits;

    if (options.type === 'subscriber') {
      this.subscriberClient = new Redis(options.credentials);
      this.setupSubscriber();
    }

    if (options.type === 'publisher') {
      this.publisherClient = new Redis(options.credentials);
    }
  }

  /**
   * Initializes the queue
   */
  public init = async (): Promise<void> => {
    await this.redisManager.init();
    
    // If it's a subscriber, start active task processing
    if (this.type === 'subscriber') {
      this.startActiveProcessing();
    }
  }

  /**
   * Gets the queue's UID
   */
  public getUid = (): string => {
    return this.uid;
  }

  /**
   * Starts active task processing
   */
  private startActiveProcessing(): void {
    // Avoid starting multiple intervals
    if (this.activeProcessingInterval) {
      clearInterval(this.activeProcessingInterval);
    }
    
    // Actively process tasks every 5 seconds
    this.activeProcessingInterval = setInterval(async () => {
      // Process each queue for which we have a registered consumer
      for (const [queueName, consumer] of this.consumers.entries()) {
        // Only process if the consumer is not busy
        if (consumer.status === 'SLEEPING') {
          await this.processQueueTasks(queueName, consumer);
        }
      }
    }, 5000); // 5 second interval
  }

  /**
   * Processes tasks from a specific queue
   * @param queueName Queue name
   * @param consumer Consumer to process the tasks
   */
  private async processQueueTasks(queueName: string, consumer: Consumer): Promise<void> {
    const client = await this.redisManager.getClient();
    try {
      // Get the SHA of the dequeue script
      const scriptSha = this.redisManager.getScriptSha('dequeue');
      if (!scriptSha) {
        this.logger.error('Dequeue script not loaded');
        return;
      }

      // Get all groups for this queue
      const queueGroupsKey = `qtask:${queueName}:groups`;
      const groups = await client.smembers(queueGroupsKey);
      
      if (groups.length === 0) {
        return;
      }

      // Process each group
      for (const groupKey of groups) {
        // Check if there are jobs in this group
        const jobCount = await client.zcard(groupKey);
        if (jobCount === 0) {
          // Remove empty group
          await client.srem(queueGroupsKey, groupKey);
          continue;
        }

        // Try to get a job from this group
        const result = await client.evalsha(scriptSha, 1, groupKey);
        if (!result || !Array.isArray(result)) {
          continue;
        }

        const [jobId, jobDataStr, groupName] = result;
        
        try {
          // Parse job data
          const jobData = JSON.parse(jobDataStr);
          
          // Create job object
          const job: IJobData = {
            id: jobId,
            data: jobData,
            groupName
          };
          
          // Process the job
          await consumer.process(job);
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(`Error processing job ${jobId}: ${error.message}`);
          } else {
            this.logger.error(`Error processing job ${jobId}: ${String(error)}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error processing queue tasks: ${error.message}`);
      } else {
        this.logger.error(`Error processing queue tasks: ${String(error)}`);
      }
    } finally {
      this.redisManager.releaseClient(client);
    }
  }

  /**
   * Sets up the subscriber
   */
  private setupSubscriber(): void {
    if (!this.subscriberClient) {
      return;
    }

    // Subscribe to new job notifications
    this.subscriberClient.subscribe('qtask:newjob', (err) => {
      if (err) {
        this.logger.error(`Error subscribing to new job notifications: ${err.message}`);
        return;
      }
      
      this.logger.info('Subscribed to new job notifications');
    });

    // Handle new job messages
    this.subscriberClient.on('message', async (channel, message) => {
      if (channel === 'qtask:newjob') {
        try {
          // Parse job info
          const jobInfo = JSON.parse(message);
          
          // Check if we have a consumer for this queue
          const consumer = this.consumers.get(jobInfo.queueName);
          if (consumer && consumer.status === 'SLEEPING') {
            // Process the queue
            const groupKey = `qtask:${jobInfo.queueName}:group:${jobInfo.groupName}`;
            
            // Get a client
            const client = await this.redisManager.getClient();
            try {
              // Check if there are jobs in this group
              const jobCount = await client.zcard(groupKey);
              if (jobCount > 0) {
                // Process the queue
                await this.processQueueTasks(jobInfo.queueName, consumer);
              }
            } finally {
              this.redisManager.releaseClient(client);
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(`Error handling new job message: ${error.message}`);
          } else {
            this.logger.error(`Error handling new job message: ${String(error)}`);
          }
        }
      }
    });
  }

  /**
   * Adds a job to the queue
   * @param queueName Queue name
   * @param groupName Group name
   * @param data Job data
   * @param options Job options (priority, delay, ttl)
   * @returns Job ID or null if there was an error
   */
  public async add(
    queueName: string, 
    groupName: string, 
    data: any, 
    options: IAddJobOptions = {}
  ): Promise<string | number | null> {
    const client = await this.redisManager.getClient();
    try {
      // Get the SHA of the enqueue script
      const scriptSha = this.redisManager.getScriptSha('enqueue');
      if (!scriptSha) {
        this.logger.error('Enqueue script not loaded');
        return null;
      }

      // Prepare keys and arguments
      const queueKey = `qtask:${queueName}:groups`;
      const groupKey = `qtask:${queueName}:group:${groupName}`;
      
      // Execute the script
      const jobId = await client.evalsha(
        scriptSha,
        2,
        queueKey,
        groupKey,
        JSON.stringify(data),
        groupName,
        options.priority ?? 0,
        options.delay ?? 0,
        options.ttl ?? 0
      );
      
      if (this.publisherClient) {
        await this.publisherClient.publish('qtask:newjob', JSON.stringify({ queueName, groupName }));
      }
      
      return jobId as string | number;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error adding job: ${error.message}`);
      } else {
        this.logger.error(`Error adding job: ${String(error)}`);
      }
      return null;
    } finally {
      this.redisManager.releaseClient(client);
    }
  }

  /**
   * Registers a processor for a queue
   * @param queueName Queue name
   * @param callback Callback function to process jobs
   */
  public async process(queueName: string, callback: ICallback): Promise<void> {
    if (this.type !== 'subscriber') {
      throw new Error('Only subscriber instances can process jobs');
    }

    if (this.consumers.has(queueName)) {
      throw new Error(`A processor for queue '${queueName}' already exists`);
    }

    const consumer = new Consumer(uuidv4(), queueName, callback, this.logger.logLevel);
    this.consumers.set(queueName, consumer);
    
    // Process pending tasks for this queue immediately
    if (this.type === 'subscriber') {
      await this.processQueueTasks(queueName, consumer);
    }
  }

  /**
   * Closes the queue and releases resources
   */
  public async close(): Promise<void> {
    // Clear active processing interval
    if (this.activeProcessingInterval) {
      clearInterval(this.activeProcessingInterval);
      this.activeProcessingInterval = null;
    }

    // Close Redis clients
    if (this.subscriberClient) {
      this.subscriberClient.disconnect();
    }

    if (this.publisherClient) {
      this.publisherClient.disconnect();
    }

    // Close Redis manager
    await this.redisManager.close();
    
    this.logger.info('Queue closed');
  }
} 