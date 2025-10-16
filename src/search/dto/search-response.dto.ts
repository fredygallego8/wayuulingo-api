export class SearchResultDto {
  id: string;
  score: number;
  payload: {
    text: string;
    source: string;
    chunk_index: number;
    total_chunks: number;
    upload_timestamp?: number | string;
  };
}

export class AISearchResponseDto {
  query: string;
  results: SearchResultDto[];
  aiResponse?: string;
  error?: string;
}