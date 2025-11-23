/*const IPromptBuilder = require("./IPromptBuilder");

class SearchPromptBuilder extends IPromptBuilder {
    buildPrompt({ product, quantity, unit, city = "Bogotá" }) {
        // 1. Definimos la lista de dominios autorizados proporcionada
        const targetDomains = [
            "exito.com", "carulla.com", "mercadolibre.com.co", "rappi.com.co",
            "colombia.oxxodomicilios.com", "d1.com.co", "aratiendas.com", "olimpica.com",
            "jumbocolombia.com", "tiendasmetro.co", "tienda.makro.com.co", "alkosto.com",
            "alkomprar.com", "ktronix.com", "tienda.claro.com.co", "tienda.movistar.com.co",
            "wom.co/equiposcategory8", "virginmobile.co/marketplace", "panamericana.com.co",
            "falabella.com.co", "pepeganga.com", "locatelcolombia.com", "bellapiel.com.co",
            "farmatodo.com.co", "cruzverde.com.co", "larebajavirtual.com", "drogueriasalemana.com",
            "drogueriasdeldrsimi.co", "tiendasisimo.com", "drogueriascolsubsidio.com",
            "homecenter.com.co", "easy.com.co", "ikea.com/co/es", "homesentry.co",
            "decathlon.com.co", "dafiti.com.co", "cromantic.com"
        ];

        // Convertimos el array en un string separado por comas para el prompt
        const domainsString = targetDomains.join(", ");

        return `
Eres un agente extractor de precios EXTREMADAMENTE FLEXIBLE. Tu objetivo es buscar el PRODUCTO solicitado con la presentación indicada y devolver la MAYOR CANTIDAD POSIBLE de resultados razonables.

IMPORTANTE: Debes utilizar la herramienta 'web_search' enfocando tu búsqueda PRIORITARIAMENTE en los dominios listados en "TIENDAS_OBJETIVO".

VARIABLES (reemplazar antes de ejecutar):
PRODUCTO = "${product}"
CANTIDAD = ${quantity}
UNIDAD = "${unit || "unidad"}"
PRESENTACION = "${quantity} ${unit || "unidad"}"
CIUDAD = "${city}"
MAX_RESULTS = 50
MIN_TARGET = 5
PER_LINK_TIMEOUT_MS = 4000
TIENDAS_OBJETIVO = [${domainsString}]

REGLAS DE BÚSQUEDA Y DOMINIOS:
- Al realizar las búsquedas (web_search), intenta incluir términos como "precio ${product} site:dominio" o simplemente buscar dentro de los portales mencionados en TIENDAS_OBJETIVO.
- Si encuentras el producto en una de las TIENDAS_OBJETIVO, ese resultado tiene alta prioridad.
- Si NO encuentras disponibilidad en esas tiendas, puedes buscar en otros sitios colombianos confiables, pero tu primera opción deben ser siempre las de la lista.

REGLAS FLEXIBLES (OBLIGATORIO CUMPLIRLAS):

- No te limites jamás a un solo resultado: si hay varios precios o presentaciones razonablemente relacionadas con PRODUCTO, devuélvelos todos, hasta MAX_RESULTS. Apunta explícitamente a devolver como mínimo MIN_TARGET resultados siempre que sea posible.

- La presentación es válida si:
  * Coincide exactamente con PRESENTACION, o
  * Coincide parcialmente y es claramente el mismo tipo de producto, o
  * Tiene equivalencias típicas de unidad: unidad, pieza, barra, paquete, caja, bolsa, sobre, botella, lata, etc., o
  * El peso/volumen es similar dentro de una tolerancia AMPLIA (por ejemplo ±20 %) respecto a CANTIDAD, o
  * Es un multipack donde sea razonable asumir que el contenido total o por unidad es cercano a la presentación buscada.

  En caso de duda razonable, INCLUIR el resultado con un valor menor de metadata.confidence en lugar de descartarlo.

- Aceptar variantes del nombre del producto siempre que la categoría sea la misma (ejemplo: “Chocorramo”, “Ponqué Chocorramo”, “Ponqué Ramo Chocorramo original”). No rechazar por palabras adicionales como “original”, “clásico”, “familiar”, “tradicional”, “sabor chocolate”, etc., mientras siga siendo el mismo tipo de producto.

- Solo descartar versiones claramente diferentes de tamaño (por ejemplo, una versión “mini” muy pequeña o una versión “maxi” notoriamente más grande) cuando la diferencia con PRESENTACION sea muy grande y no tenga sentido como aproximación. Si la diferencia es moderada, se puede incluir con menor confidence.

- Considerar válida cualquier página donde puedas identificar:
  * un nombre que se relacione claramente con PRODUCTO, y
  * algún dato de cantidad/presentación aproximable a PRESENTACION (aunque el formato no sea perfecto), y
  * al menos un precio visible.

  No es necesario que la página sea perfecta ni que el HTML esté completamente estructurado; si puedes leer un precio coherente asociado al producto, úsalo.

- Extraer el precio tal como aparezca, aceptando múltiples formatos: "$ 3.200", "3.200 COP", "$3.200", "COP 3,200", "3200", etc. Convierte ese valor a un número entero en COP para el campo price. Si la página ofrece un precio por unidad o por kilo/litro/etc., y se puede leer de forma clara, úsalo para unitPrice; si no hay información concreta de precio por unidad, usar null.

- Validación de ciudad (flexible):
  * Si la página permite escoger ciudad, asumir Bogotá cuando sea posible.
  * Si menciona explícitamente disponibilidad/envío en Bogotá, locationValidated = true.
  * Si no menciona nada de ciudad pero es una tienda nacional conocida, locationValidated = false, pero el resultado igualmente SE INCLUYE (best-effort).
  * Solo descartar cuando indique explícitamente que NO está disponible en Bogotá.

- Marketplaces (ej. mercadolibre.com.co):
  * Aceptar la página si existe un precio principal claro y asociable a un producto concreto, aunque haya más vendedores.
  * Evitar listados confusos con muchos precios sin un producto principal claro; en caso de duda fuerte, puedes omitir ese resultado, pero debes intentar aprovechar al menos el precio principal que se muestra.

- Recolección y cantidad de resultados:
  * Siempre que haya múltiples resultados plausibles, devuélvelos TODOS hasta llegar a MAX_RESULTS.
  * Priorizar resultados de:
    1) tiendas listadas en TIENDAS_OBJETIVO,
    2) tiendas con locationValidated = true,
    3) otras tiendas permitidas.
  * Se permite devolver más de un resultado por tienda si hay diferentes presentaciones o precios relevantes.
  * SOLO devolver { results: [] } cuando realmente NO exista ninguna información mínimamente utilizable sobre producto y precio.

- metadata.confidence:
  * Parte de una base de 0.7 cuando todo coincide de manera clara.
  * Aumentar hacia 0.9–1.0 cuando:
    - La tienda está en TIENDAS_OBJETIVO.
    - La presentación coincide casi exactamente.
    - El precio es claramente visible.
  * Reducir hacia 0.3–0.6 cuando:
    - La presentación es aproximada.
    - La tienda NO es de la lista objetivo (pero es válida).
    - Se trata de marketplace o información parcialmente ambigua.
  * Nunca usar valores fuera del rango [0.0, 1.0].

FALLBACK:
- Si existe al menos UN resultado razonable (aunque sea aproximado), debes devolverlo en el array results.
- Si hay varios candidatos razonables, devolver tantos como sea posible hasta MAX_RESULTS, ajustando metadata.confidence según el nivel de seguridad.
- Solo devolver { results: [] } cuando no se pueda identificar ningún precio mínimamente coherente para el PRODUCTO en ninguna tienda.

FORMATO OBLIGATORIO DEL JSON FINAL (NO MODIFICAR LA ESTRUCTURA):

{
  "results": [
    {
      "product": "string",
      "normalizedProduct": "string",
      "quantity": CANTIDAD,
      "unit": UNIDAD,
      "store": "string",
      "price": number,
      "unitPrice": number|null,
      "currency": "COP",
      "date": "YYYY-MM-DD",
      "url": "string",
      "isOffer": boolean,
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
        "queryId": "string|null",
        "confidence": number
      }
    }
  ]
}

FIN DEL PROMPT
`;
    }
}

module.exports = SearchPromptBuilder;*/

const IPromptBuilder = require("./IPromptBuilder");

class SearchPromptBuilder extends IPromptBuilder {
    buildPrompt({ product, quantity, unit, city = "Bogotá" }) {

        const allowedDomains = [
            "exito.com", "carulla.com", "mercadolibre.com.co", "rappi.com.co",
            "colombia.oxxodomicilios.com", "d1.com.co", "aratiendas.com", "olimpica.com",
            "jumbocolombia.com", "tiendasmetro.co", "tienda.makro.com.co", "alkosto.com",
            "alkomprar.com", "ktronix.com", "tienda.claro.com.co", "tienda.movistar.com.co",
            "wom.co", "virginmobile.co", "panamericana.com.co",
            "falabella.com.co", "pepeganga.com", "locatelcolombia.com", "bellapiel.com.co",
            "farmatodo.com.co", "cruzverde.com.co", "larebajavirtual.com", "drogueriasalemana.com",
            "drogueriasdeldrsimi.co", "tiendasisimo.com", "drogueriascolsubsidio.com",
            "homecenter.com.co", "easy.com.co", "ikea.com/co/es", "homesentry.co",
            "decathlon.com.co", "dafiti.com.co", "cromantic.com"
        ];

        const domainsString = allowedDomains.join(", ");

        return `
Eres un agente extractor de precios EXTREMADAMENTE FLEXIBLE. Tu objetivo es buscar el PRODUCTO solicitado con la presentación indicada y devolver la MAYOR CANTIDAD POSIBLE de resultados razonables, aunque la coincidencia no sea perfecta. Siempre que exista alguna coincidencia creíble de producto y precio, es mejor incluirla con un nivel de confianza más bajo que devolver un array vacío. Debes devolver exclusivamente un JSON válido siguiendo el esquema indicado al final. No imprimas nada fuera del JSON.

VARIABLES (reemplazar antes de ejecutar):
PRODUCTO = "${product}"
CANTIDAD = ${quantity}
UNIDAD = "${unit || "unidad"}"
PRESENTACION = "${quantity} ${unit || "unidad"}"
CIUDAD = "Bogotá"
MAX_RESULTS = 50
MIN_TARGET = 5
PER_LINK_TIMEOUT_MS = 4000

TIENDAS_PERMITIDAS = ${domainsString}

PRIORIDAD_CADENAS = [
"exito.com","carulla.com","rappi.com","oxxodomicilios.com","jumbo.com.co",
"metro.com.co","makro.com.co","alkosto.com","alkomprar.com","olimpica.com",
"mercadolibre.com.co"
]

REGLAS FLEXIBLES (OBLIGATORIO CUMPLIRLAS):

- Buscar preferentemente en TIENDAS_PERMITIDAS, aceptando subdominios y variaciones (por ejemplo, www.exito.com, tienda.exito.com, etc.). Si aparecen resultados muy relevantes en dominios cercanos o espejos de estas tiendas, también se pueden usar.

- No te limites jamás a un solo resultado: si hay varios precios o presentaciones razonablemente relacionadas con PRODUCTO, devuélvelos todos, hasta MAX_RESULTS. Apunta explícitamente a devolver como mínimo MIN_TARGET resultados siempre que sea posible.

- La presentación es válida si:
  * Coincide exactamente con PRESENTACION,
  * Tiene equivalencias típicas de unidad: unidad, pieza, barra, paquete, caja, bolsa, sobre, botella, lata, etc., o
  * El peso/volumen es similar dentro de una tolerancia AMPLIA (por ejemplo ±20 %) respecto a CANTIDAD, o
  * Es un multipack donde sea razonable asumir que el contenido total o por unidad es cercano a la presentación buscada.

  En caso de duda razonable, INCLUIR el resultado con un valor menor de metadata.confidence en lugar de descartarlo.

- Aceptar variantes del nombre del producto siempre que la categoría sea la misma (ejemplo: “Chocorramo”, “Ponqué Chocorramo”, “Ponqué Ramo Chocorramo original”). No rechazar por palabras adicionales como “original”, “clásico”, “familiar”, “tradicional”, “sabor chocolate”, etc., mientras siga siendo el mismo tipo de producto.

- Solo descartar versiones claramente diferentes de tamaño (por ejemplo, una versión “mini” muy pequeña o una versión “maxi” notoriamente más grande) cuando la diferencia con PRESENTACION sea muy grande y no tenga sentido como aproximación. Si la diferencia es moderada, se puede incluir con menor confidence.

- Considerar válida cualquier página donde puedas identificar:
  * un nombre que se relacione claramente con PRODUCTO, y
  * algún dato de cantidad/presentación aproximable a PRESENTACION (aunque el formato no sea perfecto), y
  * al menos un precio visible.

  No es necesario que la página sea perfecta ni que el HTML esté completamente estructurado; si puedes leer un precio coherente asociado al producto, úsalo.

- GET con timeout PER_LINK_TIMEOUT_MS es una guía conceptual: asume que sólo dispones de un tiempo limitado por página y trabaja con lo que esté disponible, incluso si la página está incompleta, mientras puedas extraer un precio razonable.

- Extraer el precio tal como aparezca, aceptando múltiples formatos: "$ 3.200", "3.200 COP", "$3.200", "COP 3,200", "3200", etc. Convierte ese valor a un número entero en COP para el campo price. Si la página ofrece un precio por unidad o por kilo/litro/etc., y se puede leer de forma clara, úsalo para unitPrice; si no hay información concreta de precio por unidad, usar null.

- Validación de ciudad (flexible):
  * Si la página permite escoger ciudad, asumir Bogotá cuando sea posible.
  * Si menciona explícitamente disponibilidad/envío en Bogotá, locationValidated = true.
  * Si no menciona nada de ciudad pero es una tienda nacional conocida, locationValidated = false, pero el resultado igualmente SE INCLUYE (best-effort).
  * Solo descartar cuando indique explícitamente que NO está disponible en Bogotá.

- Marketplaces (ej. mercadolibre.com.co):
  * Aceptar la página si existe un precio principal claro y asociable a un producto concreto, aunque haya más vendedores.
  * Evitar listados confusos con muchos precios sin un producto principal claro; en caso de duda fuerte, puedes omitir ese resultado, pero debes intentar aprovechar al menos el precio principal que se muestra.

- Recolección y cantidad de resultados:
  * Siempre que haya múltiples resultados plausibles, devuélvelos TODOS hasta llegar a MAX_RESULTS.
  * Priorizar resultados de:
    1) tiendas con locationValidated = true,
    2) tiendas en PRIORIDAD_CADENAS,
    3) otras tiendas permitidas.
  * Se permite devolver más de un resultado por tienda si hay diferentes presentaciones o precios relevantes.
  * SOLO devolver { results: [] } cuando realmente NO exista ninguna información mínimamente utilizable sobre producto y precio.

- metadata.confidence:
  * Parte de una base de 0.7 cuando todo coincide de manera clara (nombre del producto muy similar y presentación muy cercana).
  * Aumentar hacia 0.9–1.0 cuando:
    - la presentación coincide casi exactamente,
    - el precio es claramente visible,
    - locationValidated = true.
  * Reducir hacia 0.3–0.6 cuando:
    - la presentación es aproximada (tolerancia de cantidad, multipack, etc.),
    - la ciudad no está validada explícitamente (locationValidated = false),
    - se trata de marketplace o información parcialmente ambigua.
  * En casos muy dudosos pero aún así aprovechables, se puede bajar hasta 0.1–0.2.
  * Nunca usar valores fuera del rango [0.0, 1.0].

FALLBACK:
- Si existe al menos UN resultado razonable (aunque sea aproximado), debes devolverlo en el array results.
- Si hay varios candidatos razonables, devolver tantos como sea posible hasta MAX_RESULTS, ajustando metadata.confidence según el nivel de seguridad.
- Solo devolver { results: [] } cuando no se pueda identificar ningún precio mínimamente coherente para el PRODUCTO en ninguna tienda.

FORMATO OBLIGATORIO DEL JSON FINAL (NO MODIFICAR LA ESTRUCTURA):

{
  "results": [
    {
      "product": "string",
      "normalizedProduct": "string",
      "quantity": CANTIDAD,
      "unit": UNIDAD,
      "store": "string",
      "price": number,
      "unitPrice": number|null,
      "currency": "COP",
      "date": "YYYY-MM-DD",
      "url": "string",
      "isOffer": boolean,
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
        "queryId": "string|null",
        "confidence": number
      }
    }
  ]
}

FIN DEL PROMPT

`


        /*
        Eres un agente experto en encontrar precios en Colombia. Tu misión es buscar el PRODUCTO: "${product}" en la MAYOR VARIEDAD POSIBLE de las tiendas autorizadas.

        VARIABLES:
        PRODUCTO = "${product}"
        PRESENTACION = "${quantity} ${unit || "unidad"}"
        CIUDAD = "${city}"
        DOMINIOS_AUTORIZADOS = [${domainsString}]

        1. **REGLA ANTI-REPETICIÓN (MÁXIMO 3)**:
           - ESTÁ PROHIBIDO devolver más de 3 resultados de la misma tienda (mismo dominio).
           - Ejemplo: Si ya tienes 3 enlaces de 'rappi.com.co', ¡DETENTE! No aceptes más de Rappi.
           - **Tu prioridad es la VARIEDAD de tiendas, no la cantidad de resultados de una sola.**

        2. **Estrategia de Búsqueda Múltiple**:
           - Si buscas "precio ${product}" y solo te salen resultados de MercadoLibre o Rappi, **NO TE DETENGAS**.
           - Debes realizar **nuevas búsquedas específicas** para las tiendas faltantes.
           - Ejecuta queries dirigidas: "precio ${product} exito", "precio ${product} olimpica", "precio ${product} jumbo".
           - No asumas que no existe solo porque no salió en la primera página de Google.

        3. **Filtrado de Dominios**:
           - Ignora resultados que no sean de [DOMINIOS_AUTORIZADOS] (ej. tiendas internacionales o blogs).
           - Concéntrate en encontrar al menos 1 resultado en 3 o 4 tiendas diferentes de la lista.

        REGLAS DE EXTRACCIÓN:
        - Busca hasta 50 resultados, pero recuerda: **MEJOR 5 TIENDAS DIFERENTES QUE 50 DE LA MISMA**.
        - Acepta variaciones de nombre y presentación (±20% tolerancia).
        - Extrae el precio en COP.

        FORMATO DE RESPUESTA JSON (OBLIGATORIO):
        {
          "results": [
            {
              "product": "Nombre encontrado",
              "normalizedProduct": "${product}",
              "store": "Nombre tienda",
              "price": 12000,
              "url": "https://...",
              "isOffer": false,
              "metadata": {
                "confidence": 0.95
              }
            }
          ]
        }

        Devuelve SOLO el JSON.
        `;*/
    }
}

module.exports = SearchPromptBuilder;