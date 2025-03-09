import { Queue } from '../src/queue';
import { IJobData } from '../src/interfaces/queue.interface';

// Configuración para las pruebas
const redisConfig = {
  host: 'localhost',
  port: 6379
};

describe('Queue', () => {
  // Tiempo de espera más largo para pruebas asíncronas
  jest.setTimeout(30000);
  
  let publisher: Queue;
  let subscriber: Queue;
  
  beforeEach(async () => {
    // Crear instancias nuevas para cada prueba
    publisher = new Queue({
      credentials: redisConfig,
      type: 'publisher',
      logLevel: 'silent' // Silenciar logs durante las pruebas
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
  
  test('El publicador puede enviar trabajos y el suscriptor puede procesarlos', async () => {
    // Datos de prueba
    const queueName = 'testQueue';
    const groupName = 'testGroup';
    const testData = { message: 'Hola mundo' };
    
    // Promesa que se resolverá cuando el trabajo sea procesado
    const jobProcessed = new Promise<IJobData>((resolve) => {
      subscriber.process(queueName, (job, done) => {
        // Verificar que los datos recibidos sean correctos
        expect(job.data).toEqual(testData);
        expect(job.groupName).toBe(groupName);
        
        // Marcar como completado y resolver la promesa
        done();
        resolve(job);
      });
    });
    
    // Añadir un trabajo a la cola
    const jobId = await publisher.add(queueName, groupName, testData);
    
    // Esperar a que el trabajo sea procesado
    const processedJob = await jobProcessed;
    
    // Verificaciones
    expect(jobId).toBeDefined();
    expect(processedJob.id).toBeDefined();
    expect(processedJob.data).toEqual(testData);
    expect(processedJob.groupName).toBe(groupName);
  });
  
  test('El publicador puede enviar múltiples trabajos y el suscriptor los procesa en orden', async () => {
    const queueName = 'testQueue';
    const groupName = 'testGroup';
    const numJobs = 5;
    const processedJobs: number[] = [];
    
    // Promesa que se resolverá cuando todos los trabajos sean procesados
    const allJobsProcessed = new Promise<number[]>((resolve) => {
      subscriber.process(queueName, (job, done) => {
        // Añadir el número de trabajo a la lista de procesados
        processedJobs.push(job.data.jobNumber);
        
        // Si hemos procesado todos los trabajos, resolver la promesa
        if (processedJobs.length === numJobs) {
          resolve(processedJobs);
        }
        
        // Marcar como completado
        done();
      });
    });
    
    // Añadir varios trabajos a la cola
    for (let i = 1; i <= numJobs; i++) {
      await publisher.add(queueName, groupName, { jobNumber: i });
    }
    
    // Esperar a que todos los trabajos sean procesados
    const result = await allJobsProcessed;
    
    // Verificar que se procesaron todos los trabajos
    expect(result.length).toBe(numJobs);
    
    // Verificar que los trabajos se procesaron en orden (por prioridad)
    // Nota: Esto asume que los trabajos se procesan en el orden en que se añaden
    // Si la implementación cambia, esta prueba podría necesitar ajustes
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });
}); 