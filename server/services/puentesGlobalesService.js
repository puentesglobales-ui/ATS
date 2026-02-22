const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const cleanKey = (k) => (k || "").trim().replace(/[\r\n\t]/g, '').replace(/\s/g, '').replace(/["']/g, '');
const GENAI_API_KEY = cleanKey(process.env.GEMINI_API_KEY);

class PuentesGlobalesEngine {
    constructor() {
        const genAI = new GoogleGenerativeAI(GENAI_API_KEY);
        this.model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
        });
    }

    // Helper para parseo seguro
    _safeParse(text) {
        try {
            const clean = text.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Failed to parse AI JSON:", text);
            // Intento desesperado: buscar el primer '{' y el último '}'
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    return JSON.parse(text.substring(start, end + 1));
                } catch (e2) { return { error: "Parse failed" }; }
            }
            return { error: "Parse failed", raw: text };
        }
    }

    async initializeAssessment(cvText, jobTitle) {
        const prompt = `
      **IDENTIDAD:** Reclutador Senior y Psicólogo Organizacional de Puentes Globales.
      **CONTEXTO:** Analiza el CV del candidato (${cvText.slice(0, 1000)}) y la vacante (${jobTitle}).
      
      **TAREA:**
      1. Identifica los 5 rasgos de personalidad/comportamiento más críticos para tener éxito en este rol específico.
      2. Crea un test psicométrico adaptativo de 15 preguntas tipo Likert (1: Totalmente en desacuerdo, 5: Totalmente de acuerdo).
      3. Las preguntas deben ser sutiles, no directas.
      4. Incluye 3 "Lie Control Questions" para detectar deseabilidad social (trait: "lie_control").
      
      **FORMATO JSON REQUERIDO (ESTRICTO):**
      {
        "role_profile": { "trait_name": 0.8 },
        "questions": [
          { "id": "q1", "text": "...", "trait": "trait_name", "direction": "positive" }
        ]
      }
    `;

        try {
            const result = await this.model.generateContent(prompt);
            const assessment = this._safeParse(result.response.text());

            if (assessment.questions && assessment.questions.length > 10) {
                return assessment;
            }
            throw new Error("AI returned malformed or insufficient questions");
        } catch (error) {
            console.error("🚨 [PUENTES-SERVICE] Critical Failure:", error);
            // FAILSAFE: Return a hardcoded high-quality set of questions if AI fails
            return {
                role_profile: { "Comunicación": 0.8, "Liderazgo": 0.7, "Resiliencia": 0.9, "Trabajo en Equipo": 0.8, "Atención al Detalle": 0.7 },
                questions: [
                    { id: "f1", text: "Prefiero planificar cada detalle antes de empezar un proyecto.", trait: "Atención al Detalle", direction: "positive" },
                    { id: "f2", text: "Me siento cómodo liderando discusiones en grupos grandes.", trait: "Liderazgo", direction: "positive" },
                    { id: "f3", text: "Cuando enfrento un problema difícil, no me rindo hasta resolverlo.", trait: "Resiliencia", direction: "positive" },
                    { id: "f4", text: "Disfruto colaborar con otros más que trabajar solo.", trait: "Trabajo en Equipo", direction: "positive" },
                    { id: "f5", text: "Me es fácil explicar conceptos complejos a personas sin experiencia.", trait: "Comunicación", direction: "positive" },
                    { id: "f6", text: "A veces me distraigo fácilmente con tareas irrelevantes.", trait: "Atención al Detalle", direction: "reverse" },
                    { id: "f7", text: "Prefiero que otros tomen las decisiones difíciles.", trait: "Liderazgo", direction: "reverse" },
                    { id: "f8", text: "Me recupero rápido después de un fracaso profesional.", trait: "Resiliencia", direction: "positive" },
                    { id: "f9", text: "Creo que la competencia individual es mejor que la colaboración.", trait: "Trabajo en Equipo", direction: "reverse" },
                    { id: "f10", text: "Mis compañeros siempre entienden mis instrucciones a la primera.", trait: "Comunicación", direction: "positive" },
                    { id: "f11", text: "Siempre digo la verdad, incluso cuando me perjudica.", trait: "lie_control", direction: "positive" },
                    { id: "f12", text: "Nunca he llegado tarde a una cita en mi vida.", trait: "lie_control", direction: "positive" },
                    { id: "f13", text: "Soy una persona perfectamente equilibrada en todo momento.", trait: "lie_control", direction: "positive" }
                ]
            };
        }
    }

    // PASO 2: Calcular resultados (Matemática pura, stateless)
    calculateResults(responses, profile) {
        let totalScore = 0;
        let weightSum = 0;
        let liePoints = 0;
        let lieCount = 0;
        const traits = Object.keys(profile).filter(t => t !== 'lie_control');

        responses.forEach(res => {
            // Invertir escala si la pregunta es "reverse"
            const value = res.direction === 'reverse' ? (6 - res.value) : res.value;

            if (res.trait === 'lie_control') {
                // En lie_control, puntajes altos sugieren "fingir bondad" (Social Desirability)
                liePoints += value;
                lieCount++;
            } else {
                const weight = profile[res.trait] || 1;
                totalScore += value * weight;
                weightSum += weight;
            }
        });

        const fit_score = Math.round((totalScore / (5 * weightSum)) * 100);
        const lie_score = lieCount > 0 ? Math.round((liePoints / (5 * lieCount)) * 100) : 0;

        return {
            fit_score,
            lie_score,
            is_honest: lie_score < 50,
            traits,
            timestamp: new Date().toISOString()
        };
    }

    // PASO 3: Generar el Reporte Final (Cruce de Datos CV + Psicometría)
    async generateFinalReport(cvText, jobTitle, results) {
        const prompt = `
      **IDENTITY:** 
      Eres el "Senior Talent Strategist" de Puentes Globales. Tu especialidad es leer entre líneas y predecir el éxito a largo plazo de un candidato.

      **INPUT DATA:**
      - CANDIDATO (CV): ${cvText}
      - PUESTO: ${jobTitle}
      - RESULTADOS PSICOMÉTRICOS: Fit: ${results.fit_score}%, Honestidad: ${results.lie_score}%
      - RASGOS EVALUADOS: ${results.traits.join(", ")}

      **TASK:**
      Genera un reporte de recomendación de contratación que sea directo, honesto y sin rodeos.

      **CONSTRAINTS:**
      - Si el Fit Score es < 60%, sé muy estricto en el descarte.
      - Si el Lie Score es > 50%, menciona que el candidato intentó manipular el test.
      - Idioma: Español profesional.
      - FORMATO: JSON puro.

      **EXPECTED JSON STRUCTURE:**
      {
        "status": "Contratar" | "Entrevistar con cautela" | "Descartar",
        "verdict_summary": "Explicación de 2 frases sobre la relación experiencia-personalidad.",
        "critical_strength": "El rasgo más potente que aporta al equipo.",
        "hidden_risk": "Qué podría fallar si se le presiona demasiado.",
        "interview_killer": "Una pregunta específica y punzante para validar debilidades."
      }
    `;

        const result = await this.model.generateContent(prompt);
        return this._safeParse(result.response.text());
    }
}

module.exports = new PuentesGlobalesEngine();
