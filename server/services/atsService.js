const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const cleanKey = (k) => (k || "").trim().replace(/[\r\n\t]/g, '').replace(/\s/g, '').replace(/["']/g, '');
const GENAI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(GENAI_API_KEY);

/**
 * atsService: Handles Job Description comparison and CV optimization.
 * Focuses on keyword alignment and STAR method improvements.
 */
const atsService = {
    async getATSComparison(userData, jobDescription) {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" },
            systemInstruction: `
                **IDENTITY:**
                Eres el "ATS Optimizer Engine" de Puentes Globales. Tu objetivo es maximizar el "Match Score" entre un usuario y una oferta de empleo específica.

                **TASKS:**
                1. **KEYWORD EXTRACTION:** Identifica las 10 habilidades técnicas (Hard Skills) y verbos de acción más importantes de la Job Description (JD).
                2. **CONTENT ALIGNMENT:** Reescribe la experiencia del usuario (Raw Data) para integrar esas palabras clave de forma natural.
                3. **STAR METHOD:** Cada logro debe seguir la estructura: [Verbo de Acción] + [Tarea] + [Resultado Cuantificable].
                4. **ATS SCORING:** Calcula una puntuación de 1 a 100 basada en la relevancia.

                **OUTPUT FORMAT (JSON ONLY):**
                {
                  "match_score": number,
                  "missing_keywords": string[],
                  "optimized_content": {
                    "personal": { "name": "...", "email": "...", "summary": "..." },
                    "experience": [
                       { "role": "...", "company": "...", "date": "...", "achievements": ["..."] }
                    ],
                    "skills": ["..."]
                  },
                  "ats_advice": "Consejo breve para mejorar el CV manualmente"
                }

                **CONSTRAINTS:**
                - No inventes experiencia que el usuario no tiene.
                - Si no hay métricas en el raw data, deja un marcador como "[X]%" para que el usuario lo complete.
                - Prohibido usar adjetivos vagos (ej. "trabajador", "entusiasta").
            `
        });

        const prompt = `
            JOB DESCRIPTION: 
            ${jobDescription}

            USER RAW DATA:
            ${JSON.stringify(userData.rawData || userData)}

            MARKET: ${userData.market || 'Global'} (USA = Métricas / EU = Competencias)
        `;

        try {
            const result = await model.generateContent(prompt);
            return JSON.parse(result.response.text());
        } catch (error) {
            console.error("Error en el motor ATS:", error);
            throw error;
        }
    }
};

module.exports = atsService;
