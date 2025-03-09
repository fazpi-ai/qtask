const { Queue } = require('@fazpi-ai/qtask');

async function run() {
  try {
    // Create a publisher instance
    const publisher = new Queue({
      credentials: {
        host: 'localhost',
        port: 6379
      },
      type: 'publisher',
      logLevel: 'debug'
    });

    // Initialize
    await publisher.init();
    console.log('Publisher initialized');

    // Add jobs to the queue
    for (let i = 1; i <= 5; i++) {
      const jobId = await publisher.add('emails', 'notifications', {
        to: `user${i}@example.com`,
        subject: `Test Email ${i}`,
        body: `This is a test email ${i}`
      });
      console.log(`Job added with ID: ${jobId}`);
    }

    // Close the connection
    await publisher.close();
    console.log('Publisher closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

run(); 