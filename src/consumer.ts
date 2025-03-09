import { v4 as uuidv4 } from 'uuid';
import { ICallback, IJobData } from './interfaces/queue.interface';
import { Logger } from './utils/logger';

/**
 * Class representing a queue consumer
 */
export class Consumer {
  /**
   * Unique consumer ID
   */
  public uid: string = uuidv4();
  
  /**
   * Consumer status
   */
  public status: 'SLEEPING' | 'RUNNING' = 'SLEEPING';
  
  private queueName: string;
  private callback: ICallback;
  private logger: Logger;

  /**
   * Constructor
   * @param sessionId Session ID
   * @param queueName Queue name
   * @param callback Callback function to process jobs
   * @param logLevel Log level
   */
  constructor(
    private sessionId: string, 
    queueName: string, 
    callback: ICallback,
    logLevel: 'silent' | 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {
    this.queueName = queueName;
    this.callback = callback;
    this.logger = new Logger(logLevel, `Consumer:${queueName}`);
  }

  /**
   * Process a job
   * @param job Job data
   * @returns Promise that resolves when the job has been processed
   */
  public async process(job: IJobData): Promise<void> {
    if (this.status === 'RUNNING') {
      this.logger.warn(`Consumer for queue ${this.queueName} is already running.`);
      throw new Error(`Consumer for queue ${this.queueName} is already running.`);
    }
    
    this.status = 'RUNNING';
    this.logger.info(`Starting to process job ${job.id} in queue ${this.queueName}`);

    try {
      await new Promise<void>((resolve, reject) => {
        this.callback(job, (err?: Error) => {
          if (err) {
            this.logger.error(`Error processing job ${job.id}: ${err.message}`);
            reject(err);
          } else {
            this.logger.info(`Job ${job.id} processed successfully`);
            resolve();
          }
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Error in consumer for ${this.queueName}: ${error.message}`);
      } else {
        this.logger.error(`Unknown error in consumer for ${this.queueName}: ${String(error)}`);
      }
      throw error;
    } finally {
      this.status = 'SLEEPING';
      this.logger.debug(`Consumer for ${this.queueName} returns to SLEEPING state`);
    }
  }
} 