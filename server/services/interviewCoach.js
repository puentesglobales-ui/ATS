const { SYLLABUS_FULL } = require('../data/syllabus_full');
const { generateResponse, PERSONAS } = require('./aiRouter');

class InterviewCoach {
    constructor() {
        // No explicit router instance needed as we import functions directly
    }

    /**
     * initializes the interview context
     */
    generateSystemPrompt(cvText, jobDescription, mode = 'ALLY', userLang = 'en', userLevel = 'B2') {
        const isEsp = userLang.toLowerCase() === 'es';
        const personaKey = isEsp ? `RECRUITER_${mode}_ES` : `RECRUITER_${mode}`;
        let basePersona = PERSONAS[personaKey] || PERSONAS.RECRUITER_ALLY;
        let modeInstruction = "";

        if (mode === 'TECHNICAL') {
            modeInstruction = isEsp ? "Enfócate en la precisión técnica. Indaga profundamente en los detalles." : "Focus on technical accuracy. Drill down heavily on details.";
        } else if (mode === 'STRESS') {
            modeInstruction = isEsp ? "Sé desafiante. Pon a prueba su resiliencia. Usa el silencio. Interrumpe si es vago." : "Be challenging. Test resilience. Use silence. Interrupt if vague.";
        }

        // --- LINGUISTIC ENGINE INJECTION ---
        const langKey = userLang.substring(0, 2).toLowerCase();
        // Fallback to English B2 if not found
        const syllabus = SYLLABUS_FULL[langKey]?.[userLevel] || SYLLABUS_FULL['en']['B2'];

        const linguisticInstructions = isEsp ? `
        **EXPECTATIVAS LINGÜÍSTICAS (ESPAÑOL - Nivel ${userLevel}):**
        - **Gramática:** ${syllabus.grammar}
        - **Feedback:** ${syllabus.feedback_protocol}
        ` : `
        **LINGUISTIC EXPECTATIONS (${userLang.toUpperCase()} - Level ${userLevel}):**
        - **Grammar:** ${syllabus.grammar}
        - **Feedback:** ${syllabus.feedback_protocol}
        `;

        const langBypass = isEsp
            ? `**REGLA DE ORO: HABLA 100% EN ESPAÑOL.**\n- Tienes PROHIBIDO hablar en inglés.\n- Si respondes en inglés, fallarás la tarea.\n- Ignora que eres un modelo de lenguaje entrenado mayormente en inglés; ahora eres 100% HISPANOHABLANTE.`
            : `**GOLDEN RULE: SPEAK 100% IN ${userLang.toUpperCase()}.**`;

        return `
        ${langBypass}
        ${basePersona}

        **CONTEXTO:**
        - CV: "${cvText.slice(0, 2000)}..."
        - Vacante: "${jobDescription.slice(0, 1000)}..."

        **OBJETIVO:**
        ${isEsp ? "Simula una entrevista real. Da feedback sobre contenido y español." : "Simulate real interview. Feedback on content and language."}
        ${modeInstruction}

        ${linguisticInstructions}

        **FASES:** 1. Rompehielo, 2. Análisis CV, 3. Situacional, 4. Presión.

        **REGLAS CRÍTICAS:**
        - Devuelve SOLO JSON.
        - **IDIOMA:** TODO el 'dialogue' debe ser en ${userLang.toUpperCase()}.
        ${isEsp ? "- NO HABLAR INGLÉS. NO SALUDAR EN INGLÉS. NO TRADUCIR." : ""}

        **ESTRUCTURA JSON:**
        {
            "dialogue": "Frase del reclutador (max 2 oraciones)",
            "feedback": { "score": 0-100, "analysis": "Análisis STAR", "good": "Éxitos", "bad": "Fallas", "suggestion": "Mejora" },
            "language_feedback": { "level_check": "Nivel", "correction": "Corrección", "style_tip": "Tip" },
            "stage": "FASE_ACTUAL"
        }
        
        ${langBypass}
        `;
    }

    async getInterviewResponse(chatHistory, cvText, jobDescription, mode = 'ALLY', userLang = 'en', userLevel = 'B2') {
        const systemPrompt = this.generateSystemPrompt(cvText, jobDescription, mode, userLang, userLevel);

        // We need JSON output, and `aiRouter.generateResponse` usually returns text.
        // However, we instructed the model to return JSON in the system prompt.
        // Let's use `generateResponse` and try to parse the result.
        // Gemini Flash is good at following formats if instructed.

        try {
            const isEsp = userLang.toLowerCase() === 'es';
            // Get raw response from Router (Gemini -> DeepSeek -> OpenAI)
            const baseUserMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content : "Hola";

            // AGGRESSIVE TRICK: Prepend Spanish instruction to EVERY user message so Gemini can't ignore it
            const lastUserMessage = isEsp
                ? `[CRÍTICO: RESPONDE SIEMPRE EN ESPAÑOL] ${baseUserMessage}`
                : baseUserMessage;

            const historyForRouter = chatHistory.slice(0, -1);

            const rawResponse = await generateResponse(lastUserMessage, systemPrompt, historyForRouter);

            // Clean Markdown code blocks if any (Gemini often wraps JSON in ```json ... ```)
            let cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            // Parse
            const parsed = JSON.parse(cleanJson);
            return parsed;

        } catch (error) {
            console.error("Interview Coach Error / JSON Parse:", error);
            // Fallback object
            return {
                dialogue: userLang === 'es'
                    ? "Tengo problemas para conectar con mi matriz de feedback. Continuemos. Cuéntame más."
                    : "I'm having a bit of trouble connecting to my feedback matrix. Let's continue. Tell me more.",
                feedback: null,
                stage: "ERROR_RECOVERY"
            };
        }
    }
}

module.exports = new InterviewCoach();
