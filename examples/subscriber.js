const { Queue } = require('@fazpi-ai/qtask');

async function run() {
  try {
    // Create a subscriber instance
    const subscriber = new Queue({
      credentials: {
        host: 'localhost',
        port: 6379
      },
      type: 'subscriber',
      logLevel: 'debug',
      consumerLimits: {
        emails: 2 // Maximum 2 consumers for the 'emails' queue
      }
    });
    
    // Initialize
    await subscriber.init();
    console.log('Subscriber initialized');

    // Register a processor for the 'emails' queue
    subscriber.process('emails', (job, done) => {
      console.log(`Processing job ${job.id}`);
      console.log(`Data: ${JSON.stringify(job.data)}`);
      
      // Simulate sending an email
      setTimeout(() => {
        console.log(`Email sent to ${job.data.to}`);
        done(); // Mark the job as completed
      }, 2000);
    });

    console.log('Processor registered for the "emails" queue');
    console.log('Waiting for jobs... (Ctrl+C to exit)');

    // Handle application shutdown
    process.on('SIGINT', async () => {
      console.log('\nClosing the queue...');
      await subscriber.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

run(); 