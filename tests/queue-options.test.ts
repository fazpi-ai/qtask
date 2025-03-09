import { Queue } from '../src/queue';
import { IJobData } from '../src/interfaces/queue.interface';

// Configuración para las pruebas
const redisConfig = {
  host: 'localhost',
  port: 6379
};

describe('Queue Options', () => {
  // Tiempo de espera más largo para pruebas asíncronas
  jest.setTimeout(10000);
  
  let publisher: Queue;
  let subscriber: Queue;
  
  beforeEach(async () => {
    // Crear instancias nuevas para cada prueba
    publisher = new Queue({
      credentials: redisConfig,
      type: 'publisher',
      logLevel: 'silent'
    });
    
    subscriber = new Queue({
      credentials: redisConfig,
      type: 'subscriber',
      logLevel: 'silent',
      consumerLimits: {
        testQueue: 1
      }
    });
    
    // Inicializar ambas instancias
    await publisher.init();
    await subscriber.init();
  });
  
  afterEach(async () => {
    // Cerrar las conexiones después de cada prueba
    await publisher.close();
    await subscriber.close();
  });
  
  test('El publicador puede añadir trabajos y el suscriptor puede procesarlos', async () => {
    const queueName = 'testQueue';
    const groupName = 'testGroup';
    let jobProcessed = false;
    
    // Configurar el procesador
    const processingPromise = new Promise<void>((resolve) => {
      subscriber.process(queueName, (job, done) => {
        // Verificar que los datos sean correctos
        expect(job.data.message).toBe('Hola mundo');
        expect(job.groupName).toBe(groupName);
        
        // Marcar como procesado
        jobProcessed = true;
        
        // Marcar como completado y resolver la promesa
        done();
        resolve();
      });
    });
    
    // Añadir un trabajo
    const jobId = await publisher.add(queueName, groupName, { message: 'Hola mundo' });
    
    // Verificar que se haya creado el ID del trabajo
    expect(jobId).toBeDefined();
    
    // Esperar a que el trabajo sea procesado
    await processingPromise;
    
    // Verificar que el trabajo fue procesado
    expect(jobProcessed).toBe(true);
  });
}); 