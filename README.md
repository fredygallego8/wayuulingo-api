# WayuuLingo API — Búsqueda Semántica Wayuu + IA Generativa

> **Estado**: ✅ Producción en Vercel · Limpieza de secretos completada (oct 2025)  
> **Demo**: [https://api-wayuulingo.vercel.app](https://api-wayuulingo.vercel.app)  
> **Stack**: NestJS 10 + TypeScript + Qdrant Cloud + Google Gemini

---

## 🎯 Qué hace

API REST para búsqueda semántica y generación de respuestas en **Wayuunaiki** (lengua Wayuu):

| Endpoint | Descripción |
|----------|-------------|
| `POST /search/semantic` | Búsqueda vectorial en Qdrant + respuesta generada con Gemini 1.5 Flash |
| `GET /health` | Health check |

**Flujo**:
1. Recibe consulta en español/wayuunaiki
2. Genera embedding con Gemini `text-embedding-004` (768 dims → truncado a 384 para Qdrant)
3. Busca top-10 en Qdrant Cloud, re-rankea y toma top-5
4. Construye contexto con fragmentos (fuente, chunk, score)
5. Llama a Gemini 1.5 Flash con prompt especializado en lengua Wayuu
6. Devuelve resultados + respuesta generada

---

## 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Cliente   │────▶│  NestJS API  │────▶│   Qdrant    │
│  (Web/App)  │     │  (Vercel)    │     │   Cloud     │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │  Gemini AI   │
                    │ (embeddings  │
                    │  + generate) │
                    └──────────────┘
```

- **Framework**: NestJS con módulo `SearchModule` (`SearchController` + `SearchService`)
- **Vector DB**: Qdrant Cloud (colección `wayuucollection`, 384 dimensiones)
- **Embeddings**: Gemini `text-embedding-004` con fallback hash-based si falla el proveedor
- **Generación**: Gemini `gemini-1.5-flash` con prompt cultural Wayuu
- **Logging**: Winston-style (`Logger` de NestJS) con detalle exhaustivo (embedding, scores, fuentes, errores)

---

## 📦 Stack

| Capa | Tecnología |
|------|------------|
| Framework | NestJS 10 (TypeScript) |
| Runtime | Node.js 20+ |
| Vector DB | Qdrant Cloud (`@qdrant/js-client-rest`) |
| IA / LLM | Google Generative AI (`@google/generative-ai`) |
| Despliegue | Vercel (serverless functions) |
| Tests | Jest (unit + e2e) |
| Lint/Format | ESLint 9 + Prettier |

---

## 🚀 Puesta en marcha

```bash
# 1. Clonar e instalar
git clone https://github.com/fredygallego8/wayuulingo-api.git
cd wayuulingo-api
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección abajo)

# 3. Desarrollo
npm run start:dev    # http://localhost:3000
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Cobertura
npm run build        # Build producción
npm run lint         # ESLint
```

---

## ⚙️ Variables de entorno (`.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `QDRANT_URL` | ✅ | URL cluster Qdrant Cloud (p.ej. `https://xxx.gcp.cloud.qdrant.io`) |
| `QDRANT_API_KEY` | ✅ | API Key de Qdrant Cloud |
| `COLLECTION_NAME` | ✅ | Nombre de la colección (default: `wayuucollection`) |
| `GEMINI_API_KEY` | ✅ | Clave Google AI Studio |
| `DATABASE_URL` | ❌ | PostgreSQL opcional (futuro) |
| `OPENAI_API_KEY` | ❌ | Alternativa OpenAI (no usada actualmente) |
| `ANTHROPIC_API_KEY` | ❌ | Alternativa Anthropic (no usada actualmente) |

> **Seguridad**: `.env.example` contiene solo placeholders.  
> **Historial**: En oct/2025 se eliminaron claves hardcodeadas (commits `816f645` y `2ff1cbb`). Las claves antiguas quedan en el historial de Git — **rotar Qdrant/Gemini si se publica el repo**.

---

## 📁 Estructura del proyecto

```
src/
├── app.module.ts           # Módulo raíz
├── app.controller.ts       # Health check
├── app.service.ts          # Servicio base
├── main.ts                 # Bootstrap + global pipes/filters
├── common/                 # Utilidades compartidas
│   ├── global-exception.filter.ts  # Filtro global de excepciones
│   ├── logger.middleware.ts      # Logging HTTP requests
│   └── error-response.dto.ts     # DTO estandarizado de errores
└── search/                 # Módulo de búsqueda semántica
    ├── search.module.ts
    ├── search.controller.ts      # POST /search/semantic
    ├── search.service.ts         # Lógica principal (embedding + Qdrant + Gemini)
    └── dto/
        └── search.dto.ts         # DTOs de request/response
```

### `src/search/search.service.ts` — Núcleo

- **`performSemanticSearch(query, limit=10)`** → `AISearchResponse`
- **Embedding**: Gemini `text-embedding-004` + truncado a 384 dims + fallback hash
- **Qdrant**: `search()` con `with_payload: true`, `limit: min(10, limit)`
- **Re-ranking**: Top 5 para contexto del LLM
- **Prompt**: Especializado en lengua Wayuu (educativo, respetuoso, cita fuentes)
- **Error handling**: Try/catch exhaustivo + logging estructurado + respuesta degradada

---

## 🧪 Tests

```bash
npm run test        # Unit tests (Jest)
npm run test:e2e    # E2E tests (Supertest)
npm run test:cov    # Cobertura con reporte
```

**Casos cubiertos**:
- Controller: health check, búsqueda exitosa, error handling
- Service: embedding generation (Gemini + fallback), Qdrant search, AI response generation, error paths
- DTOs: validación de entrada

---

## 📡 API Reference

### `POST /search/semantic`

**Request**:
```json
{
  "query": "¿Cómo se saluda en wayuunaiki?",
  "limit": 10
}
```

**Response (200)**:
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

**Response (500)**:
```json
{
  "query": "...",
  "results": [],
  "error": "QDRANT_URL environment variable is required"
}
```

---

## ☁️ Despliegue en Vercel

1. Conectar repo en Vercel
2. Configurar **Environment Variables** en Project Settings:
   - `QDRANT_URL`, `QDRANT_API_KEY`, `COLLECTION_NAME`, `GEMINI_API_KEY`
3. Build command: `npm run build`
4. Output directory: `dist` (configurado en `vercel.json`)
5. Deploy automático en push a `master`

**`vercel.json`**:
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

---

## 📝 Licencia

**MIT License** — ver [LICENSE](LICENSE) (pendiente añadir al repo).

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

---

## 👤 Autor

**Fredy Gallego** — [@fredygallego8](https://github.com/fredygallego8)  
Proyecto de preservación y difusión de la lengua Wayuu mediante IA.