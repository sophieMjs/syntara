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
Eres un agente extractor de precios. Debes buscar el PRODUCTO solicitado con la presentación indicada y devolver únicamente un JSON válido con el esquema indicado. No imprimas nada fuera del JSON.

VARIABLES (reemplazar antes de ejecutar):
PRODUCTO: "${product}"
CANTIDAD: ${quantity}
UNIDAD: ${unit || "unidad"}
CIUDAD = "Bogotá"
MAX_RESULTS = ${50}
MIN_TARGET = ${5}
PER_LINK_TIMEOUT_MS = ${4000}
CONCURRENCY = ${6}

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

REGLAS (versión flexible):

1. Buscar únicamente en TIENDAS_PERMITIDAS.

2. Aceptar la presentación si cumple AL MENOS UNA de estas condiciones:
   - Coincidencia exacta de PRESENTACION.
   - Variantes equivalentes de unidades (ej: “unidad”, “pieza”, “barra”).
   - Equivalencia leve en peso/volumen: tolerancia de ±2% del valor indicado.
   - Variaciones tipográficas o sintácticas (ej: “65g”, “65 g”, “65 gr”, “65 gramos”).
   - Si es multipack, aceptarlo solo si la página permite identificar el precio por unidad de forma clara.
   - Rechazar presentaciones que cambien la naturaleza del producto (sabores, versiones “mini”, “maxi”, combinaciones, combos).

3. Para cada URL: realizar GET con timeout PER_LINK_TIMEOUT_MS. Registrar raw.httpStatus. Rechazar si != 200.

4. La página es válida si contiene:
   - nombre del PRODUCTO (o variante razonable),
   - la PRESENTACION (según regla 2),
   - y un precio visible en la página de producto.

5. Extraer raw.extractedPriceRaw tal como aparece y convertirlo a entero COP → price.
   - unitPrice = valor entero si aparece un precio unitario, de lo contrario null.
   - No inventar ni calcular precios que la página no muestre explícitamente.

6. Validación de CIUDAD:
   - Si la tienda tiene selector de ciudad/tienda, seleccionar CIUDAD si es posible.
   - Si la página indica explícitamente disponibilidad/envío a CIUDAD → locationValidated = true.
   - Si no menciona CIUDAD pero es cadena nacional → locationValidated = false y locationNotes = "best-effort: tienda nacional sin selector explícito".
   - Si indica “no disponible en CIUDAD” → descartar.
   - Si requiere login para ver disponibilidad/precio → descartar.

7. Mercado Libre / marketplaces:
   - Aceptar si es una página de producto con un solo vendedor o un precio claro.
   - Rechazar listados múltiples sin precio único verificable.

8. Orden y recolección:
   - Intentar cumplir MIN_TARGET de resultados con locationValidated = true.
   - Si no se alcanza, incluir best-effort (locationValidated = false).
   - Ordenar primero por locationValidated = true, luego por PRIORIDAD_CADENAS.
   - Máximo MAX_RESULTS resultados. Máximo uno por dominio/offer distinta.

9. Cálculo de metadata.confidence:
   - Base: 0.5
   - +0.25 si locationValidated = true
   - +0.15 si la presentación coincide exactamente
   - -0.10 si se usó tolerancia de presentación (±2% o equivalencias)
   - -0.15 si el dominio es marketplace o si locationValidated = false
   - Rango final: 0.0 a 1.0

10. Salida obligatoria (SOLO imprimir este JSON):
{
"results": [
{
"product": "string",
"store": "string",
"price": number,
"unitPrice": number|null,
"currency": "COP",
"date": "YYYY-MM-DD",
"url": "string",
"raw": {
"httpStatus": number,
"presentationFound": boolean,
"pageContainsPrice": boolean,
"extractedPriceRaw": "string|null",
"locationValidated": boolean,
"locationNotes": "string|null",
"notes": "string|null"
},
"metadata": {
"confidence": number
}
}
]
}

REGLAS DE FALLBACK:

- Si existe al menos 1 resultado verificable, devolverlo (no devolver vacío).
- Si no hay resultados con locationValidated = true pero sí verificables, devolverlos como best-effort.
- Si NO hay ningún resultado verificable → devolver { "results": [] }.

FIN DEL PROMPT
`;
    }
}

module.exports = new OpenAIService();
