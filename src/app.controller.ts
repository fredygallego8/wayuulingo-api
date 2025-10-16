import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): object {
    return {
      message: 'WayuuLingo API - Professional Language Learning Backend',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET /': 'API information and health check',
        'POST /search': 'Semantic search through Wayuu documents',
        'GET /error-test': 'Test error handling (development only)',
      },
      technologies: {
        framework: 'NestJS',
        language: 'TypeScript',
        database: 'Qdrant Vector Database',
        ai: 'Google Gemini',
        deployment: 'Vercel',
      },
      contact: {
        repository: 'https://github.com/fredygallego8/wayuulingo-api',
        documentation: 'https://wayuulingo-api.vercel.app',
      },
    };
  }

  @Get('error-test')
  throwError(): never {
    throw new HttpException('This is a test error', HttpStatus.BAD_REQUEST);
  }
}
