// src/services/openaiService.js
// Servicio profesional para comunicar el backend con la API de OpenAI
// Maneja:
//   • Construcción de prompts
//   • Reintentos inteligentes
//   • Validación estricta de JSON
//   • Limpiado automático de respuestas
//   • Logging útil para debugging
//   • Uso centralizado para todo el proyecto

const OpenAI = require("openai");

class OpenAIService {
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY no está configurada en el .env");
        }

        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        this.model = process.env.OPENAI_MODEL || "gpt-5-mini";
        this.temperature = 0.0;
        this.maxTokens = 2500;
        this.maxRetries = 3;
        this.retryDelay = 1200; // ms
    }

    /**
     * Hace una petición a la API de OpenAI con reintentos inteligentes
     */
    async sendPrompt(prompt, options = {}) {
        if (!prompt || typeof prompt !== "string") {
            throw new Error("El prompt debe ser una cadena válida.");
        }

        const model = options.model || this.model;
        const temperature = options.temperature ?? this.temperature;
        const max_tokens = options.max_tokens || this.maxTokens;

        let attempt = 0;

        while (attempt < this.maxRetries) {
            try {
                const start = Date.now();

                const response = await this.client.chat.completions.create({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    temperature,
                    max_tokens
                });

                const content = response?.choices?.[0]?.message?.content?.trim();

                if (!content) {
                    throw new Error("OpenAI respondió vacío o en formato no válido");
                }

                const duration = ((Date.now() - start) / 1000).toFixed(2);
                console.log(`✅ [OpenAI] Respuesta recibida (${duration}s) — Modelo: ${model}`);

                return content;

            } catch (error) {
                attempt++;
                const isLast = attempt === this.maxRetries;

                console.error(`❌ [OpenAI] Error intento ${attempt}/${this.maxRetries}:`, error.message);

                const rateLimit = error?.error?.type === "rate_limit_exceeded";
                const timeout = error.message.includes("timeout");

                if (isLast) {
                    if (rateLimit) throw new Error("Límite de uso de OpenAI alcanzado.");
                    if (timeout) throw new Error("Timeout al conectar con OpenAI.");
                    throw new Error("No se pudo obtener respuesta de OpenAI.");
                }

                const delay = this.retryDelay * attempt;
                console.log(`⏳ Reintentando en ${delay}ms...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    /**
     * Intenta parsear la respuesta como JSON, corrigiendo errores comunes
     */
    parseJSON(text) {
        if (!text) throw new Error("Respuesta vacía");

        // 1. Remover texto antes y después del JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No se encontró JSON en la respuesta de OpenAI.");

        let cleaned = jsonMatch[0];

        // 2. Reemplazar comas finales
        cleaned = cleaned.replace(/,\s*}/g, "}");
        cleaned = cleaned.replace(/,\s*]/g, "]");

        // 3. Intentar parseo
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            console.error("❌ JSON parse error:", e);
            throw new Error("OpenAI devolvió un JSON malformado.");
        }
    }

    /**
     * Prompt builder para búsqueda de precios en tiendas colombianas
     */
    buildPricePrompt({ product, quantity = 1, unit = null, stores = [] }) {
        const storeList =
            stores.length > 0
                ? stores.join(", ")
                : "D1, Ara, Olímpica, Éxito, Alkosto, Ktronix, Panamericana";

        return `
Eres un agente extractor de precios. Debes buscar el PRODUCTO solicitado con la presentación indicada y devolver exclusivamente un HJSON válido con el esquema definido. No imprimas nada fuera del HJSON.

VARIABLES (reemplazar antes de ejecutar):
PRODUCTO = "${product}"
CANTIDAD = ${quantity}
UNIDAD = "${unit || "unidad"}"
PRESENTACION = "${quantity} ${unit || "unidad"}"
CIUDAD = "Bogotá"
MAX_RESULTS = 50
MIN_TARGET = 5
PER_LINK_TIMEOUT_MS = 4000
CONCURRENCY = 6

TIENDAS_PERMITIDAS = [
"exito.com","carulla.com","mercadolibre.com.co","rappi.com","rappi.com.co",
"oxxodomicilios.com","d1.com.co","ara.com.co","olimpica.com","jumbo.com.co",
"metro.com.co","makro.com.co","alkosto.com","alkomprar.com","ktronix.com",
"panamericana.com.co","falabella.com.co","pepeganga.com","locatelcolombia.com",
"farmatodo.com.co","cruzverde.com.co","larebajavirtual.com","drogueriaalemana.com",
"drsimi.com.co","isimo.com.co","colsubsidio.com","homecenter.com.co","easy.com.co"
]

PRIORIDAD_CADENAS = [
"exito.com","carulla.com","rappi.com","oxxodomicilios.com","jumbo.com.co",
"metro.com.co","makro.com.co","alkosto.com","alkomprar.com","olimpica.com",
"mercadolibre.com.co"
]

REGLAS (versión optimizada y flexible):

1. Buscar solo en TIENDAS_PERMITIDAS.

2. Aceptar la presentación si cumple al menos una:
   - Coincidencia exacta de PRESENTACION.
   - Equivalencias comunes (“unidad”, “pieza”, “barra”).
   - Equivalencias de peso/volumen dentro de ±2%.
   - Variantes tipográficas (65g / 65 g / 65 gr / 65 gramos).
   - Multipacks aceptados solo si el precio por unidad es verificable.
   - Rechazar sabores, versiones mini/maxi, combos.

3. GET con timeout PER_LINK_TIMEOUT_MS. Debe entregar httpStatus=200.

4. La página es válida si contiene:
   - nombre del producto (o variante razonable),
   - la presentación válida,
   - un precio visible.

5. Extraer precio exactamente como aparece:
   - price = entero COP
   - unitPrice = entero si lo muestra; si no, null
   - No inventar ni calcular si no aparece en la página.

6. Validación de ciudad:
   - Si tiene selector, colocar Bogotá.
   - Si dice explícitamente envío/disponible en Bogotá → locationValidated = true.
   - Si no menciona Bogotá pero es tienda nacional → locationValidated = false (best-effort).
   - Si indica “no disponible en Bogotá” → descartar.

7. Marketplaces (ej. ML):
   - Aceptar si hay un solo vendedor o precio único claro.
   - Rechazar listados múltiples sin precio verificable.

8. Recolección:
   - Priorizar locationValidated = true.
   - Si no se llega al MIN_TARGET, incluir best-effort.
   - Orden: primero validados → luego PRIORIDAD_CADENAS → luego best-effort.
   - Máximo MAX_RESULTS, máximo un resultado por tienda/oferta.

9. metadata.confidence:
   - base 0.5
   - +0.25 si locationValidated = true
   - +0.15 si presentación exacta
   - -0.10 si se usó tolerancia (±2%)
   - -0.15 si marketplace o best-effort
   - min 0.0, max 1.0

10. Solo devolver este HJSON:

{
  results: [
    {
      product: "string",
      normalizedProduct: "string",         # product en lower-case
      quantity: CANTIDAD,
      unit: UNIDAD,
      store: "string",
      price: number,
      unitPrice: number|null,
      currency: "COP",
      date: "YYYY-MM-DD",
      url: "string",
      isOffer": boolean,
      raw: {
        httpStatus: number,
        presentationFound: boolean,
        pageContainsPrice: boolean,
        extractedPriceRaw: "string|null",
        locationValidated: boolean,
        locationNotes: "string|null",
        notes: "string|null"
      },
      metadata: {
        queryId: "string|null",
        confidence: number
      }
    }
  ]
}

REGLAS DE FALLBACK:
- Si existe al menos 1 resultado verificable, devolver JSON con esos resultados.
- Si no hay locationValidated=true pero sí verificables, devolver best-effort.
- Si no hay ningún resultado verificable → devolver { results: [] }.

FIN DEL PROMPT
`;
    }
}

module.exports = new OpenAIService();
