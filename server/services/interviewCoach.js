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
        **EXPECTATIVAS LINGÜÍSTICAS (${userLang.toUpperCase()} - Nivel ${userLevel}):**
        - **Gramática a revisar:** ${syllabus.grammar}
        - **Errores comunes a marcar:** ${syllabus.expected_errors ? syllabus.expected_errors.join(", ") : "Errores básicos"}
        - **Estrategia de Feedback:** ${syllabus.feedback_protocol}
        ` : `
        **LINGUISTIC EXPECTATIONS (${userLang.toUpperCase()} - Level ${userLevel}):**
        - **Grammar to Check:** ${syllabus.grammar}
        - **Expected Style:** ${syllabus.interaction_style}
        - **Common Errors to Flag:** ${syllabus.expected_errors ? syllabus.expected_errors.join(", ") : "Basic grammar errors"}
        - **Feedback Strategy:** ${syllabus.feedback_protocol}
        `;

        const langBypass = isEsp
            ? `**REGLA CRÍTICA: DEBES HABLAR EN ESPAÑOL**\n- Toda la entrevista debe ser en ESPAÑOL.\n- Tienes PROHIBIDO decir que la entrevista será en inglés.\n- Si el CV o la vacante están en inglés, tradúcelos mentalmente y habla en ESPAÑOL.`
            : `**CRITICAL: YOU MUST SPEAK ${userLang.toUpperCase()}**\n- Conduct the entire interview in ${userLang.toUpperCase()}.`;

        return `
        ${langBypass}
        ${basePersona}

        **CONTEXTO:**
        - CV: "${cvText.slice(0, 2000)}..."
        - Vacante: "${jobDescription.slice(0, 1000)}..."

        **OBJETIVO:**
        ${isEsp ? "Realiza una entrevista de trabajo realista y proporciona feedback sobre el contenido y el idioma." : "Conduct a realistic job interview while providing feedback on content and language."}
        ${modeInstruction}

        ${linguisticInstructions}

        **FASES:**
        1. Rompehielo
        2. Análisis de CV
        3. Situacional (STAR)
        4. Presión

        **REGLAS:**
        - Devuelve ÚNICAMENTE JSON válido.
        - **IDIOMA:** Todo el 'dialogue' debe estar en ${userLang.toUpperCase()}.
        ${isEsp ? "- NO menciones el inglés a menos que el usuario te lo pida explícitamente." : ""}

        **STRICT JSON STRUCTURE:**
        {
            "dialogue": "Recruiter statement (max 2 sentences)",
            "feedback": { "score": 0-100, "analysis": "STAR method check", "good": "...", "bad": "...", "suggestion": "..." },
            "language_feedback": { "level_check": "...", "correction": "Grammar/Vocab fix", "style_tip": "..." },
            "stage": "ICEBREAKER | CV_DIVE | SITUATIONAL | PRESSURE"
        }
        `;
    }

    async getInterviewResponse(chatHistory, cvText, jobDescription, mode = 'ALLY', userLang = 'en', userLevel = 'B2') {
        const systemPrompt = this.generateSystemPrompt(cvText, jobDescription, mode, userLang, userLevel);

        // We need JSON output, and `aiRouter.generateResponse` usually returns text.
        // However, we instructed the model to return JSON in the system prompt.
        // Let's use `generateResponse` and try to parse the result.
        // Gemini Flash is good at following formats if instructed.

        try {
            // Get raw response from Router (Gemini -> DeepSeek -> OpenAI)
            const lastUserMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content : "Hello";
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
