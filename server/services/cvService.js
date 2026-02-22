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
            **IDIOMA:** Responde 100% en ESPAÑOL. Tienes prohibido usar inglés (excepto términos técnicos).
            **TAREA:** Transforma estos datos en un CV de alto impacto.
            
            **CONTEXTO DEL CANDIDATO:**
            - Nombre: ${userData.personal?.name}
            - Ubicación: ${userData.personal?.location}
            - Puesto Objetivo: ${userData.role}
            - Descripción de Vacante (Keywords): ${userData.jobDescription}
            - Perfil/Superpoder: ${userData.profileContent}
            - Trayectoria Cruda: ${userData.experienceRaw}
            - Formación y Skills: ${userData.educationAndSkills}

            **REGLAS DE ORO:** 
            - Redacta un Resumen Profesional carismático (3-4 líneas).
            - En Experiencia, usa el método STAR: "Logré X mediante Y resultando en Z (métricas)".
            - Si faltan fechas o empresas, invéntalas coherentemente basado en el perfil o usa placeholders.
            
            **ESTRUCTURA JSON REQUERIDA:**
            {
                "personal": { "name": "${userData.personal?.name}", "email": "...", "location": "${userData.personal?.location}", "summary": "..." },
                "experience": [
                    { "role": "...", "company": "...", "date": "...", "achievements": ["Logro 1", "Logro 2"] }
                ],
                "education": [ { "degree": "...", "school": "...", "date": "..." } ],
                "skills": ["Skill 1", "Skill 2"]
            }
        `;
        const result = await model.generateContent(prompt);
        const content = this._safeParse(result.response.text());

        // Ensure we always return the structure expected by normalizeCV
        return {
            personal: content.personal || { name: userData.personal?.name || "Candidato", summary: "" },
            experience: content.experience || [],
            education: content.education || [],
            skills: content.skills || []
        };
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
