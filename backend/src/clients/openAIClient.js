// clients/openAIClient.js
const OpenAI = require("openai");
require("dotenv").config();

class OpenAIClient {
    constructor() {
        if (OpenAIClient.instance) return OpenAIClient.instance;

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("Falta la variable de entorno OPENAI_API_KEY");
        }

        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.model = process.env.OPENAI_MODEL || "gpt-5-mini";
        this.temperature = 0.1;
        this.maxTokens = 2000;

        OpenAIClient.instance = this;
    }

    async sendPrompt(prompt) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: this.temperature,
            max_tokens: this.maxTokens
        });

        return response.choices?.[0]?.message?.content?.trim();
    }
}

module.exports = OpenAIClient;
