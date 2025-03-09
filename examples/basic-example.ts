import { Queue } from '../src/index';

/**
 * Basic example of using the @fazpi-ai/qtask library
 * This example shows how to create a publisher and a subscriber,
 * and how to send and process jobs.
 */
async function main() {
  console.log('Starting basic example of @fazpi-ai/qtask...');
  
  // Common configuration
  const redisConfig = {
    host: 'localhost',
    port: 6379
  };
  
  // Create publisher instance
  const publisher = new Queue({
    credentials: redisConfig,
    type: 'publisher',
    logLevel: 'debug'
  });
  
  // Create subscriber instance
  const subscriber = new Queue({
    credentials: redisConfig,
    type: 'subscriber',
    logLevel: 'debug',
    consumerLimits: {
      tareas: 2 // Maximum 2 consumers for the 'tareas' queue
    }
  });
  
  try {
    // Initialize both instances
    console.log('Initializing publisher...');
    await publisher.init();
    
    console.log('Initializing subscriber...');
    await subscriber.init();

    const jobId = await publisher.add('tareas', 'procesamiento', {
      tarea: `🛑 Previous Task to process`,
      prioridad: 1,
      timestamp: new Date().toISOString()
    });
    
    // Configure processor for the 'tareas' queue
    console.log('Configuring processor for the "tareas" queue...');
    subscriber.process('tareas', (job, done) => {
      console.log(`[Subscriber] Processing job ${job.id}`);
      console.log(`[Subscriber] Data: ${JSON.stringify(job.data)}`);
      console.log(`[Subscriber] Group: ${job.groupName}`);
      
      // Simulate task processing
      setTimeout(() => {
        console.log(`[Subscriber] Job ${job.id} completed`);
        done();
      }, 2000);
    });
    
    // Add jobs to the queue
    console.log('Adding jobs to the queue...');
    
    // Add a regular job
    const job1Id = await publisher.add('tareas', 'procesamiento', {
      tarea: 'Task 1',
      prioridad: 1,
      timestamp: new Date().toISOString()
    });
    console.log(`[Publisher] Job added with ID: ${job1Id}`);
    
    // Add another job
    const job2Id = await publisher.add('tareas', 'procesamiento', {
      tarea: 'Task 2',
      prioridad: 2,
      timestamp: new Date().toISOString()
    });
    console.log(`[Publisher] Job added with ID: ${job2Id}`);
    
    // Add a third job
    const job3Id = await publisher.add('tareas', 'procesamiento', {
      tarea: 'Task 3',
      prioridad: 3,
      timestamp: new Date().toISOString()
    });
    console.log(`[Publisher] Job added with ID: ${job3Id}`);
    
    // Add a high priority job
    const priorityJobId = await publisher.add('tareas', 'procesamiento', {
      tarea: 'Priority Task',
      prioridad: 'high',
      timestamp: new Date().toISOString()
    }, { priority: 1 }); // Lower number = higher priority
    console.log(`[Publisher] Priority job added with ID: ${priorityJobId}`);
    
    // Add a delayed job
    const delayedJobId = await publisher.add('tareas', 'procesamiento', {
      tarea: 'Delayed Task',
      prioridad: 'low',
      timestamp: new Date().toISOString()
    }, { delay: 5000 }); // 5 seconds delay
    console.log(`[Publisher] Delayed job added with ID: ${delayedJobId}`);
    
    // Wait for all jobs to be processed
    console.log('Waiting for all jobs to be processed...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Close connections
    console.log('Closing connections...');
    await publisher.close();
    await subscriber.close();
    
    console.log('Example completed successfully.');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 