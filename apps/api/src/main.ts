import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateConfig } from './config';
import { SeedService } from './seed.service';

async function bootstrap() {
  validateConfig(); const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1'); app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') ?? true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const config = new DocumentBuilder().setTitle('ReliefChain Audit API').setDescription('Fabric-verified disaster relief events and reconciliation').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
  if (process.env.AUTO_SEED === 'true') await app.get(SeedService).run();
}
void bootstrap();
