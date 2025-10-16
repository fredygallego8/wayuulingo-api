import { Controller, Post, Body, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { SearchService, AISearchResponse } from './search.service';
import { SearchRequestDto } from './dto/search-request.dto';

@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async performSearch(@Body() searchRequest: SearchRequestDto): Promise<AISearchResponse> {
    const { query, limit = 5 } = searchRequest;

    this.logger.log(`Processing semantic search request for: ${query}`);

    return this.searchService.performSemanticSearch(query, limit);
  }
}