import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateConfig } from './config';
import { SeedService } from './seed.service';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    // Validate configuration
    validateConfig();
    
    // Create NestJS application
    const app = await NestFactory.create(AppModule);
    
    // Set global prefix
    app.setGlobalPrefix('api/v1');
    
    // Enable CORS
    app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true });
    
    // Enable validation
    app.useGlobalPipes(new ValidationPipe({ 
      transform: true, 
      whitelist: true,
      forbidNonWhitelisted: true
    }));
    
    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('ReliefChain Audit API')
      .setDescription('Fabric-verified disaster relief events and reconciliation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', 'Health check and monitoring endpoints')
      .addTag('public', 'Publicly accessible aggregate data')
      .addTag('auth', 'Authentication and authorization')
      .addTag('operator', 'Government and NGO operator endpoints')
      .addTag('beneficiary', 'Beneficiary-specific endpoints')
      .addTag('audit', 'Auditor endpoints for reconciliation')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
    
    // Log configuration
    logger.log(`Starting ReliefChain API in ${process.env.NODE_ENV || 'development'} mode`);
    logger.log(`Ledger mode: ${process.env.LEDGER_MODE || 'memory'}`);
    logger.log(`Worker enabled: ${process.env.WORKER_ENABLED === 'true'}`);
    logger.log(`Indexer enabled: ${process.env.LEDGER_MODE === 'fabric'}`);
    
    // Start server
    const port = Number(process.env.PORT ?? 4000);
    await app.listen(port, '0.0.0.0');
    
    logger.log(`Application is running on: http://0.0.0.0:${port}`);
    logger.log(`Swagger documentation available at: http://0.0.0.0:${port}/api/v1/docs`);
    logger.log(`Health check available at: http://0.0.0.0:${port}/api/v1/health`);
    
    // Auto-seed if configured
    if (process.env.AUTO_SEED === 'true') {
      logger.log('Auto-seeding database...');
      await app.get(SeedService).run();
      logger.log('Database seeding completed');
    }
    
    // Graceful shutdown handling
    app.enableShutdownHooks();
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

void bootstrap();
