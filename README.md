# QTask

A Redis-based queue processing library for Node.js, designed for efficient background job processing.

## Overview

QTask is a lightweight, flexible job queue system built on Redis. It provides a simple yet powerful way to handle asynchronous tasks in your Node.js applications. With QTask, you can easily distribute workloads across multiple processes or servers, prioritize jobs, delay execution, and set time-to-live for tasks.

## Key Features

- **Redis-backed persistence**: Reliable storage of jobs even if your application crashes
- **Publisher/Subscriber model**: Clear separation between job producers and consumers
- **Job grouping**: Organize jobs by queues and groups for better management
- **Priority queuing**: Process important jobs first
- **Delayed execution**: Schedule jobs to run at a specific time
- **TTL support**: Automatically expire jobs after a certain period
- **TypeScript support**: Full type definitions for a better development experience
- **Connection pooling**: Efficient Redis connection management
- **Atomic operations**: Uses Redis Lua scripts for reliable job processing
- **Graceful shutdown**: Clean handling of in-progress jobs during shutdown
- **Customizable logging**: Configure log levels to suit your needs

## Installation

```bash
npm install @fazpi-ai/qtask
```

## Requirements

- Node.js >= 14.0.0
- Redis >= 6.0.0

## Basic Usage

### Publisher

```typescript
import { Queue } from '@fazpi-ai/qtask';

// Create a publisher instance
const publisher = new Queue({
  credentials: {
    host: 'localhost',
    port: 6379
  },
  type: 'publisher',
  logLevel: 'info'
});

// Initialize
await publisher.init();

// Add a job to the queue
const jobId = await publisher.add('emails', 'notifications', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Welcome to our platform'
});

console.log(`Job added with ID: ${jobId}`);
```

### Subscriber

```typescript
import { Queue } from '@fazpi-ai/qtask';

// Create a subscriber instance
const subscriber = new Queue({
  credentials: {
    host: 'localhost',
    port: 6379
  },
  type: 'subscriber',
  logLevel: 'info',
  consumerLimits: {
    emails: 5 // Maximum 5 consumers for the 'emails' queue
  }
});

// Initialize
await subscriber.init();

// Register a processor for the 'emails' queue
subscriber.process('emails', (job, done) => {
  console.log(`Processing job ${job.id}`);
  console.log(`Data: ${JSON.stringify(job.data)}`);
  
  // Simulate sending an email
  setTimeout(() => {
    console.log(`Email sent to ${job.data.to}`);
    done(); // Mark the job as completed
  }, 1000);
});

// Handle application shutdown
process.on('SIGINT', async () => {
  console.log('Closing the queue...');
  await subscriber.close();
  process.exit(0);
});
```

## Advanced Usage

### Job Options

When adding jobs to the queue, you can specify various options:

```typescript
// Add a job with priority, delay, and TTL
const jobId = await publisher.add('emails', 'notifications', {
  to: 'user@example.com',
  subject: 'Welcome',
  body: 'Welcome to our platform'
}, {
  priority: 1,        // Lower number = higher priority (default: 0)
  delay: 60000,       // Delay execution by 60 seconds
  ttl: 3600000        // Job expires after 1 hour if not processed
});
```

### Job Progress Tracking

You can track the progress of a job during processing:

```typescript
subscriber.process('fileProcessing', (job, done) => {
  // The job object includes a progress function
  const totalSteps = 10;
  
  for (let step = 1; step <= totalSteps; step++) {
    // Update progress (0-100%)
    job.progress && job.progress(step * 10);
    
    // Do some work...
    
    console.log(`Step ${step}/${totalSteps} completed`);
  }
  
  done(); // Mark job as completed
});
```

### Error Handling

Handle job processing errors:

```typescript
subscriber.process('emails', (job, done) => {
  try {
    // Process the job...
    
    done(); // Success
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    done(error); // Mark job as failed with error
  }
});
```

### Redis Cluster Support

QTask supports Redis Cluster configuration:

```typescript
const queue = new Queue({
  credentials: {
    clusters: [
      { host: 'redis-1', port: 6379 },
      { host: 'redis-2', port: 6379 },
      { host: 'redis-3', port: 6379 }
    ],
    options: {
      redisOptions: {
        password: 'your-password'
      }
    }
  },
  type: 'publisher',
  logLevel: 'info'
});
```

## Architecture

QTask uses a combination of Redis data structures to manage job queues efficiently:

- **Sorted Sets**: For priority queues and delayed jobs
- **Hashes**: For storing job data and metadata
- **Sets**: For tracking queue groups
- **Pub/Sub**: For real-time job notifications

The library uses Lua scripts to ensure atomic operations when enqueueing, dequeueing, and updating job status.

## Examples

Check the `examples` directory for complete usage examples:

- `publisher.js`: Example of how to create a publisher and add jobs to the queue
- `subscriber.js`: Example of how to create a subscriber and process jobs from the queue
- `basic-example.ts`: Complete TypeScript example showing both publisher and subscriber in action

## API Reference

### Queue Class

The main class for interacting with the queue system.

#### Constructor Options

```typescript
interface IQueueOptions {
  // Redis connection options
  credentials: RedisOptions;
  
  // Consumer limits per queue
  consumerLimits?: Record<string, number>;
  
  // Log level
  logLevel?: 'silent' | 'debug' | 'info' | 'warn' | 'error';
  
  // Instance type: publisher or subscriber
  type: 'publisher' | 'subscriber';
}
```

#### Methods

- `init()`: Initialize the queue
- `add(queueName, groupName, data, options?)`: Add a job to the queue
- `process(queueName, callback)`: Register a processor for a queue
- `getStatus(jobId)`: Get the status of a job
- `close()`: Close the queue and clean up resources

## Development

### Installing dependencies

```bash
npm install
```

### Building

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Redis Connection Errors**: Ensure Redis is running and accessible with the provided credentials.
2. **Job Not Being Processed**: Check that you have a subscriber running and processing the correct queue.
3. **Memory Issues**: If processing large volumes of jobs, consider adjusting the Redis configuration for optimal performance.

### Debugging

Enable debug logging for more detailed information:

```typescript
const queue = new Queue({
  // ...other options
  logLevel: 'debug'
});
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details. 