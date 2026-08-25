import { Module } from '@nestjs/common';
import { PublicController } from './controllers/public.controller';
import { CoreModule } from './core.module';

@Module({ imports: [CoreModule], controllers: [PublicController] })
export class PublicModule {}