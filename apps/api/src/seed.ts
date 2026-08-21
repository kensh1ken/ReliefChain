import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateConfig } from './config';
import { SeedService } from './seed.service';

async function main() { validateConfig(); const app = await NestFactory.createApplicationContext(AppModule); console.log(await app.get(SeedService).run()); await app.close(); }
void main();
