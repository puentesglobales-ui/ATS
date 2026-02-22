const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Ensure the API Key is correctly sanitized
const cleanKey = (k) => (k || "").trim().replace(/[\r\n\t]/g, '').replace(/\s/g, '').replace(/["']/g, '');
const GENAI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(GENAI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const cvService = {
    _safeParse(text) {
        try {
            const clean = text.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("❌ [CV-SERVICE] Failed to parse AI JSON:", text);
            // Search for content within { } just in case
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    return JSON.parse(text.substring(start, end + 1));
                } catch (e2) { return { error: "Parse failure", raw: text }; }
            }
            return { error: "Parse failure", raw: text };
        }
    },

    // PASO 1: Generar el contenido redactado profesionalmente
    async generateContent(userData) {
        const prompt = `
            **IDENTIDAD:** Experto en Recruiting Internacional y Branding Personal.
            **IDIOMA:** Responde 100% en ESPAÑOL. Tienes prohibido usar inglés a menos que sea un término técnico inevitable.
            **TAREA:** Transforma los datos conversacionales en un CV de alto impacto.
            
            **METODOLOGÍA:** 
            - Usa el método STAR para logros.
            - Cuantifica resultados (métricas, %, tiempo).
            - Perfil profesional: Charismático y orientado a resultados.
            
            **INPUT DEL USUARIO:** 
            ${JSON.stringify(userData)}

            **ESTRUCTURA DE SALIDA (JSON ÚNICAMENTE):**
            {
                "personal": { "name": "...", "email": "...", "location": "...", "summary": "Perfil Pro en Español" },
                "experience": [
                    { "role": "Cargo", "company": "Empresa", "date": "Periodo", "achievements": ["Logro 1 con métrica", "Logro 2..."] }
                ],
                "education": [ { "degree": "Título", "school": "Institución", "date": "Año" } ],
                "skills": ["Skill 1", "Skill 2", "Skill 3"]
            }
        `;
        const result = await model.generateContent(prompt);
        return this._safeParse(result.response.text());
    },

    // PASO 2: Generar los Design Tokens (El "look & feel")
    async generateDesignTokens(market, industry) {
        const prompt = `
            Genera tokens de diseño para un CV profesional de la industria ${industry} en el mercado ${market}.
            Define: 
            - primaryColor (hex), 
            - fontPairing (Serif o Sans), 
            - spacing (compact o relaxed), 
            - layout (single-column o two-column).
            Output JSON: { "color": "#hex", "font": "string", "spacing": "string", "layout": "string" }
        `;
        const result = await model.generateContent(prompt);
        const tokens = this._safeParse(result.response.text());

        // Fallback for safety
        return {
            color: tokens.color || "#2563eb",
            font: tokens.font || "Sans",
            spacing: tokens.spacing || "compact",
            layout: tokens.layout || "single-column"
        };
    }
};

module.exports = cvService;
