// src/common/pipes/validation.pipe.ts

import { ValidationPipe as NestValidationPipe } from '@nestjs/common';

export const validationPipeConfig = new NestValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: false,
  },
});
