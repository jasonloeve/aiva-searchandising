import { Logger } from '@nestjs/common';

// Silence all NestJS logger methods in tests
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation();
  jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  jest.spyOn(Logger.prototype, 'log').mockImplementation();
  jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation();
});