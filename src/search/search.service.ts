import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SearchResult {
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

export interface AISearchResponse {
  query: string;
  results: SearchResult[];
  aiResponse?: string;
  error?: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly qdrantClient: QdrantClient;
  private readonly genAI: GoogleGenerativeAI;
  private readonly embeddingModel: any;

  private readonly QDRANT_URL =
    'https://d9ddcda9-6558-46f7-82c0-79a7c3f3d766.us-east4-0.gcp.cloud.qdrant.io';
  private readonly QDRANT_API_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.jE6hTCsyci6mcP_j70CdNO8IizCisMUdHPf3rl9BxnE';
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBJZ5VGZm3VFkJ7mvFkVYyP9PWemA0rnds';
  private readonly COLLECTION_NAME = 'wayuucollection';

  constructor() {
    this.qdrantClient = new QdrantClient({
      url: this.QDRANT_URL,
      apiKey: this.QDRANT_API_KEY,
      checkCompatibility: false,
    });

    this.genAI = new GoogleGenerativeAI(this.GEMINI_API_KEY);
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: 'text-embedding-004',
    });
  }

  async performSemanticSearch(
    query: string,
    limit: number = 10,
  ): Promise<AISearchResponse> {
    try {
      this.logger.log(`🔍 Iniciando búsqueda semántica para: "${query}"`);
      this.logger.log(`📊 Parámetros: limit=${limit}, collection=${this.COLLECTION_NAME}`);

      // Generate embedding
      const embedding = await this.generateEmbedding(query);
      this.logger.log(`✅ Embedding generado, longitud: ${embedding.length}`);

      // Ensure correct dimension for Qdrant collection (384)
      const finalEmbedding = embedding.length > 384 ? embedding.slice(0, 384) : embedding;
      this.logger.log(`✅ Embedding final, longitud: ${finalEmbedding.length}`);
      this.logger.log(`🔢 Primeros 5 valores del embedding: [${finalEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);

      // Search in Qdrant
      this.logger.log(`🔍 Ejecutando búsqueda en Qdrant...`);
      const searchResult = await this.qdrantClient.search(
        this.COLLECTION_NAME,
        {
          vector: finalEmbedding,
          limit: Math.min(limit, 10),
          with_payload: true,
          with_vector: false,
        },
      );

      this.logger.log(`✅ Búsqueda Qdrant completada, resultados encontrados: ${searchResult.length}`);

      // Format results with detailed logging
      const results: SearchResult[] = searchResult.map((hit, index) => {
        this.logger.log(`📄 Resultado ${index + 1}: score=${hit.score.toFixed(4)}, id=${hit.id}`);
        return {
          id: hit.id.toString(),
          score: hit.score,
          payload: {
            text: hit.payload?.text ? String(hit.payload.text) : '',
            source: hit.payload?.file_name
              ? String(hit.payload.file_name)
              : hit.payload?.source
                ? String(hit.payload.source)
                : '',
            chunk_index: hit.payload?.chunk_index
              ? Number(hit.payload.chunk_index)
              : 0,
            total_chunks: hit.payload?.total_chunks
              ? Number(hit.payload.total_chunks)
              : 0,
            upload_timestamp: hit.payload?.upload_timestamp as
              | number
              | string
              | undefined,
          },
        };
      });

      this.logger.log(`📊 Estadísticas de resultados:`);
      this.logger.log(`   - Total resultados: ${results.length}`);
      if (results.length > 0) {
        this.logger.log(`   - Mejor score: ${results[0].score.toFixed(4)}`);
        this.logger.log(`   - Peor score: ${results[results.length - 1].score.toFixed(4)}`);
        this.logger.log(`   - Fuentes únicas: ${new Set(results.map(r => r.payload.source)).size}`);
      }

      // Generate AI response using top 5 results for better context
      this.logger.log(`🤖 Generando respuesta AI con ${Math.min(5, results.length)} resultados principales...`);
      const aiResponse = await this.generateAIResponse(query, results.slice(0, 5));

      this.logger.log('✅ Búsqueda semántica completada exitosamente');
      this.logger.log(`📝 Respuesta AI generada: ${aiResponse ? 'Sí' : 'No'}`);

      return {
        query,
        results,
        aiResponse,
      };
    } catch (error) {
      this.logger.error('❌ Error en búsqueda semántica:', error);
      this.logger.error('❌ Detalles del error:', {
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        type: error?.constructor?.name || 'Unknown'
      });
      return {
        query,
        results: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log('🔄 Generating embedding using Gemini...');

      // Use Gemini's embedding model for better semantic understanding
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;

      this.logger.log(`✅ Gemini embedding generated, original length: ${embedding.length}`);

      // Ensure correct dimension for Qdrant collection (384)
      // Gemini returns 768-dim embeddings, Qdrant expects 384-dim
      const finalEmbedding = embedding.length > 384 ? embedding.slice(0, 384) : embedding;

      this.logger.log(`✅ Embedding truncated to ${finalEmbedding.length} dimensions for Qdrant`);

      return finalEmbedding;
    } catch (error) {
      this.logger.error('❌ Error generating Gemini embedding:', error);
      this.logger.log('🔄 Falling back to hash-based embedding...');

      // Fallback to hash-based embedding if Gemini fails
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(384).fill(0);

      words.forEach((word, index) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(i);
          hash = hash & hash;
        }

        const baseIndex = (Math.abs(hash) + index) % embedding.length;
        for (let i = 0; i < 10 && baseIndex + i < embedding.length; i++) {
          embedding[baseIndex + i] += (hash % 100) / 100;
        }
      });

      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = embedding.map((val) => val / magnitude);

      this.logger.log('✅ Fallback hash-based embedding generated');
      return normalizedEmbedding;
    }
  }

  private async generateAIResponse(
    query: string,
    searchResults: SearchResult[],
  ): Promise<string> {
    try {
      // Prepare context from top results with more detailed information
      const context = searchResults
        .slice(0, 5)
        .map(
          (result, i) =>
            `\n--- Resultado ${i + 1} (Relevancia: ${result.score.toFixed(3)}) ---\n` +
            `Documento: ${result.payload.source}\n` +
            `Fragmento ${result.payload.chunk_index + 1}/${result.payload.total_chunks}\n` +
            `Contenido: ${result.payload.text.substring(0, 800)}\n`,
        )
        .join('');

      const prompt = `Eres un asistente especializado en la lengua Wayuu. Responde a la consulta del usuario
basándote ÚNICAMENTE en la información proporcionada en los resultados de búsqueda.

Si la información no es suficiente para responder completamente, indica qué aspectos
no puedes cubrir con la información disponible.

Consulta del usuario: ${query}

Resultados de búsqueda relevantes:
${context}

Instrucciones:
- Responde de manera clara y estructurada
- Incluye ejemplos cuando sea relevante
- Mantén un tono educativo y respetuoso
- Si hay información contradictoria, aclárala
- Cita las fuentes cuando sea apropiado`;

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });
      const response = await model.generateContent(prompt);

      return response.response.text() || 'No se pudo generar una respuesta.';
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      return 'Lo siento, no pude generar una respuesta inteligente en este momento. Pero puedes revisar los resultados de búsqueda a continuación.';
    }
  }
}
