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
        return JSON.parse(result.response.text());
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
        return JSON.parse(result.response.text());
    }
};

module.exports = cvService;
