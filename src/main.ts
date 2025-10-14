import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.JWT_SECRET || 'dev',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }, // set true when behind HTTPS
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(3001);
  console.log('API listening on http://localhost:3001');
}
bootstrap();
