import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getEnv } from '@browserai/config';

async function bootstrap() {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  await app.listen(env.API_PORT);
  console.log(`🚀 API server running on http://localhost:${env.API_PORT}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
