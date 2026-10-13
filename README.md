# WayuuLingo API — Búsqueda Semántica Wayuu + IA Generativa

> **Estado**: ✅ Producción en Vercel · Limpieza de secretos completada (oct 2025)  
> **Demo**: [https://api-wayuulingo.vercel.app](https://api-wayuulingo.vercel.app)  
> **Stack**: NestJS 11 + TypeScript + Qdrant Cloud + Google Gemini

---

## 🎯 Qué hace

API REST para búsqueda semántica y generación de respuestas en **Wayuunaiki** (lengua Wayuu), diseñada para preservación y difusión de la lengua indígena.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/search/semantic` | `POST` | Búsqueda vectorial en Qdrant + respuesta generada con Gemini 1.5 Flash |
| `/health` | `GET` | Health check básico |

**Flujo completo**:
1. Recibe consulta en español/wayuunaiki
2. Genera embedding con Gemini `text-embedding-004` (768 dims → truncado a 384 para Qdrant)
3. Busca top-10 en Qdrant Cloud (colección `wayuucollection`)
4. Re-rankea y toma top-5 para contexto del LLM
5. Construye contexto enriquecido (fuente, chunk, score, timestamp)
6. Llama a Gemini `gemini-1.5-flash` con prompt cultural Wayuu
7. Devuelve resultados estructurados + respuesta generada por IA

---

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Cliente   │────▶│   NestJS API     │────▶│   Qdrant    │
│  (Web/App)  │     │   (Vercel)       │     │   Cloud     │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                      ┌──────▼───────┐
                      │  Gemini AI   │
                      │ (embeddings  │
                      │  + generate) │
                      └──────────────┘
```

**Componentes clave**:

| Componente | Responsabilidad |
|------------|-----------------|
| `SearchModule` | Módulo NestJS que agrupa controller + service |
| `SearchController` | Expone `POST /search/semantic` con validación (`ValidationPipe`) |
| `SearchService` | Lógica principal: embeddings, Qdrant, Gemini, logging exhaustivo |
| `common/` | Filtros globales, middleware logging, DTOs de error estandarizados |

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | NestJS | 11.x |
| Lenguaje | TypeScript | 5.7 |
| Runtime | Node.js | 20+ |
| Vector DB | Qdrant Cloud | `@qdrant/js-client-rest` 1.15 |
| IA / Embeddings | Google Generative AI | `@google/generative-ai` 0.24 |
| Validación | class-validator + class-transformer | 0.14 / 0.5 |
| Config | dotenv | 17.x |
| Tests | Jest + Supertest | 29.7 / 7.0 |
| Lint/Format | ESLint 9 + Prettier 3.4 | |
| Despliegue | Vercel (serverless) | |

---

## 🚀 Puesta en marcha

### Prerrequisitos
- Node.js 20+
- Cuenta en [Qdrant Cloud](https://cloud.qdrant.io/) (cluster + API key)
- Cuenta en [Google AI Studio](https://makersuite.google.com/app/apikey) (Gemini API key)

### Instalación

```bash
# 1. Clonar e instalar
git clone https://github.com/fredygallego8/wayuulingo-api.git
cd wayuulingo-api
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar .env con tus valores reales (ver sección Variables de entorno)

# 3. Desarrollo
npm run start:dev    # http://localhost:3000 (watch mode)
npm run start:debug  # Debug con --inspect
npm run build        # Compila a dist/
npm run start:prod   # Ejecuta dist/main.js
```

### Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run start:dev` | Desarrollo con hot reload |
| `npm run build` | Build producción (`nest build`) |
| `npm run lint` | ESLint + auto-fix |
| `npm run format` | Prettier write |
| `npm run test` | Unit tests (Jest) |
| `npm run test:watch` | Tests en watch mode |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | E2E tests (Supertest) |

---

## ⚙️ Variables de entorno (`.env`)

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `QDRANT_URL` | ✅ | URL cluster Qdrant Cloud | `https://xxx.gcp.cloud.qdrant.io` |
| `QDRANT_API_KEY` | ✅ | API Key Qdrant Cloud | `qdrant_xxx...` |
| `COLLECTION_NAME` | ✅ | Nombre colección (384 dims) | `wayuucollection` |
| `GEMINI_API_KEY` | ✅ | Clave Google AI Studio | `AIzaSy...` |
| `DATABASE_URL` | ❌ | PostgreSQL opcional (futuro) | `postgres://...` |
| `OPENAI_API_KEY` | ❌ | Alternativa OpenAI | `sk-...` |
| `ANTHROPIC_API_KEY` | ❌ | Alternativa Anthropic | `sk-ant-...` |

> **Seguridad**: `.env.example` contiene solo placeholders.  
> **Historial**: En oct/2025 se eliminaron claves hardcodeadas (commits `816f645` y `2ff1cbb`). Las claves antiguas quedan en el historial de Git — **rotar Qdrant/Gemini si se publica el repo**.

---

## 📁 Estructura del proyecto

```
src/
├── app.module.ts           # Módulo raíz (importa SearchModule)
├── app.controller.ts       # GET /health
├── app.service.ts          # Servicio base
├── main.ts                 # Bootstrap: ValidationPipe global, CORS, logger
├── common/                 # Utilidades compartidas
│   ├── global-exception.filter.ts  # Filtro global excepciones (formato estándar)
│   ├── logger.middleware.ts      # Logging HTTP requests (morgan-style)
│   └── error-response.dto.ts     # DTO error: {statusCode, message, error, timestamp}
└── search/                 # Módulo búsqueda semántica
    ├── search.module.ts
    ├── search.controller.ts      # POST /search/semantic
    ├── search.service.ts         # Núcleo: embedding + Qdrant + Gemini
    └── dto/
        ├── search-request.dto.ts  # { query: string; limit?: number }
        └── search-response.dto.ts # Tipado respuesta (results[], aiResponse?, error?)
```

### `src/search/search.service.ts` — Núcleo detallado

```typescript
@Injectable()
export class SearchService {
  private readonly qdrantClient: QdrantClient;
  private readonly genAI: GoogleGenerativeAI;
  private readonly embeddingModel: any; // text-embedding-004

  async performSemanticSearch(query: string, limit = 10): Promise<AISearchResponse> {
    // 1. Validación de env vars en constructor (fail-fast)
    // 2. Embedding Gemini (768→384 dims) + fallback hash-based
    // 3. Qdrant search: vector, limit, with_payload=true
    // 4. Logging exhaustivo: embedding, scores, fuentes, stats
    // 5. Top-5 para contexto LLM
    // 6. Prompt cultural Wayuu (educativo, respetuoso, cita fuentes)
    // 7. Respuesta degradada si falla IA (devuelve solo results)
  }
}
```

**Características clave**:
- **Fail-fast**: Constructor valida todas las env vars requeridas
- **Fallback embedding**: Hash-based si Gemini falla (no rompe búsqueda)
- **Logging estructurado**: Embedding values, scores, fuentes únicas, timing
- **Re-ranking implícito**: Qdrant devuelve por score, toma top-5 para LLM
- **Prompt especializado**: Instrucciones culturales Wayuu + formato respuesta

---

## 🧪 Tests

```bash
npm run test        # Unit tests (Jest, src/**/*.spec.ts)
npm run test:e2e    # E2E tests (test/jest-e2e.json, Supertest)
npm run test:cov    # Cobertura (coverage/lcov-report/index.html)
```

**Casos cubiertos**:
- **Controller**: health check, búsqueda exitosa, validación DTO, error handling
- **Service**: embedding generation (Gemini + fallback), Qdrant search, AI response, error paths
- **DTOs**: validación `query` (string requerido), `limit` (1-10, default 5)
- **Common**: global exception filter, logger middleware

---

## 📡 API Reference

### `POST /search/semantic`

**Request** (`SearchRequestDto`):
```json
{
  "query": "¿Cómo se saluda en wayuunaiki?",
  "limit": 5
}
```

| Campo | Tipo | Requerido | Validación | Default |
|-------|------|-----------|------------|---------|
| `query` | string | ✅ | `@IsString()` | - |
| `limit` | number | ❌ | `@IsNumber()`, `@Min(1)`, `@Max(10)` | 5 |

**Response 200** (`AISearchResponseDto`):
```json
{
  "query": "¿Cómo se saluda en wayuunaiki?",
  "results": [
    {
      "id": "uuid",
      "score": 0.87,
      "payload": {
        "text": "Wattamat ...",
        "source": "diccionario_wayuu.pdf",
        "chunk_index": 0,
        "total_chunks": 5,
        "upload_timestamp": 1720000000
      }
    }
  ],
  "aiResponse": "En wayuunaiki el saludo tradicional es **'Wattamat'**..."
}
```

**Response 500** (error estandarizado):
```json
{
  "statusCode": 500,
  "message": "QDRANT_URL environment variable is required",
  "error": "Internal Server Error",
  "timestamp": "2025-10-16T15:50:40.123Z"
}
```

**Response 400** (validación fallida):
```json
{
  "statusCode": 400,
  "message": ["query must be a string"],
  "error": "Bad Request",
  "timestamp": "..."
}
```

---

## ☁️ Despliegue en Vercel

### Configuración automática
1. Conectar repo en Vercel (Import Git Repository)
2. Vercel detecta NestJS automáticamente
3. Configurar **Environment Variables** en Project Settings:
   - `QDRANT_URL`, `QDRANT_API_KEY`, `COLLECTION_NAME`, `GEMINI_API_KEY`
4. Deploy automático en push a `master`

### `vercel.json` incluido
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run start:dev",
  "installCommand": "npm install",
  "framework": "nestjs",
  "functions": {
    "src/main.ts": { "maxDuration": 30 }
  }
}
```

**Notas**:
- `maxDuration: 30` para funciones serverless (timeout búsqueda + IA)
- Output directory `dist/` (generado por `nest build`)
- Framework `nestjs` habilita optimizaciones Vercel

---

## 🔐 Política de Seguridad API Keys

Ver documento completo: **[README-API-KEYS.md](README-API-KEYS.md)**

**Resumen crítico**:
- ❌ **NUNCA** hardcodear claves en código
- ✅ **SIEMPRE** usar `process.env.VARIABLE`
- ✅ Validar en constructor (fail-fast)
- ✅ `.env.example` con placeholders únicamente
- ✅ `.env` en `.gitignore`
- 🚨 **Rotar claves** si se expusieron en historial

---

## 📝 Licencia

**MIT License** — ver [LICENSE](LICENSE)

---

## 🤝 Contribuir

1. Fork → rama `feat/mi-mejora`
2. `npm run test` + `npm run lint` en verde
3. Commit convencional: `feat(search): descripción`
4. PR con descripción y tests

---

## 📚 Referencias

- [NestJS Docs](https://docs.nestjs.com/)
- [Qdrant JS Client](https://github.com/qdrant/qdrant-js)
- [Gemini API](https://ai.google.dev/)
- [Vercel + NestJS](https://vercel.com/docs/concepts/functions/serverless-functions#languages-typescript)
- [class-validator](https://github.com/typestack/class-validator)

---

## 👤 Autor

**Fredy Gallego** — [@fredygallego8](https://github.com/fredygallego8)  
Proyecto de preservación y difusión de la lengua Wayuu mediante IA.