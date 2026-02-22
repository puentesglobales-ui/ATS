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

        try {
            const result = await model.generateContent(prompt);
            const content = this._safeParse(result.response.text());

            return {
                personal: content.personal || { name: userData.personal?.name || "Candidato", summary: "Profesional enfocado en resultados." },
                experience: content.experience || [],
                education: content.education || [],
                skills: content.skills || []
            };
        } catch (error) {
            console.error("❌ [CV-SERVICE] AI Content Generation Failed:", error);
            // FAILSAFE: Return a structured fallback so the app doesn't crash
            return {
                personal: {
                    name: userData.personal?.name || "Candidato",
                    location: userData.personal?.location || "Remoto",
                    summary: `Profesional con experiencia en ${userData.role || 'su área'}, buscando nuevas oportunidades en el mercado ${userData.market || 'Global'}.`
                },
                experience: [{ role: userData.role || 'Profesional', company: 'Empresa', date: 'Actualidad', achievements: ['Liderazgo de proyectos clave', 'Optimización de procesos operativos'] }],
                education: [],
                skills: ["Adaptabilidad", "Comunicación", "Liderazgo"]
            };
        }
    },

    // PASO 2: Generar los Design Tokens (El "look & feel")
    async generateDesignTokens(market, industry) {
        const prompt = `
            Genera tokens de diseño para un CV profesional de la industria ${industry} en el mercado ${market}.
            Output JSON: { "color": "#hex", "font": "string", "spacing": "string", "layout": "string" }
        `;

        try {
            const result = await model.generateContent(prompt);
            const tokens = this._safeParse(result.response.text());
            return {
                color: tokens.color || "#2563eb",
                font: tokens.font || "Sans",
                spacing: tokens.spacing || "compact",
                layout: tokens.layout || "single-column"
            };
        } catch (error) {
            console.error("❌ [CV-SERVICE] AI Tokens Failed:", error);
            return {
                color: "#2563eb",
                font: "Sans",
                spacing: "compact",
                layout: "single-column"
            };
        }
    }
};

module.exports = cvService;
