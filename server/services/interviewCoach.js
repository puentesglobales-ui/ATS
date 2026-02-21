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
        let basePersona = PERSONAS.RECRUITER_ALLY;
        let modeInstruction = "";

        if (mode === 'TECHNICAL') {
            basePersona = PERSONAS.RECRUITER_TECHNICAL;
            modeInstruction = "Focus on technical accuracy. Drill down heavily on details.";
        } else if (mode === 'STRESS') {
            basePersona = PERSONAS.RECRUITER_STRESS;
            modeInstruction = "Be challenging. Test resilience. Use silence. Interrupt if vague.";
        }

        // --- LINGUISTIC ENGINE INJECTION ---
        const langKey = userLang.substring(0, 2).toLowerCase();
        // Fallback to English B2 if not found
        const syllabus = SYLLABUS_FULL[langKey]?.[userLevel] || SYLLABUS_FULL['en']['B2'];

        const linguisticInstructions = `
        **LINGUISTIC EXPECTATIONS (${userLang.toUpperCase()} - Level ${userLevel}):**
        - **Grammar to Check:** ${syllabus.grammar}
        - **Expected Style:** ${syllabus.interaction_style}
        - **Common Errors to Flag:** ${syllabus.expected_errors ? syllabus.expected_errors.join(", ") : "Basic grammar errors"}
        - **Feedback Strategy:** ${syllabus.feedback_protocol}
        `;

        return `
        ${basePersona}

        **INPUT CONTEXT:**
        - CV Content: "${cvText.slice(0, 2000)}..."
        - Job Description: "${jobDescription.slice(0, 1000)}..."

        **YOUR GOAL:**
        Conduct a realistic job interview while simultaneously providing **DUAL-LAYER FEEDBACK** (Content + Language).
        ${modeInstruction}

        ${linguisticInstructions}

        **INTERVIEW PHASES (The Layers):**
        1. **Icebreaker:** "Tell me about yourself", "Why this role?". Focus on clarity.
        2. **CV Deep Dive:** Ask about specific roles/skills in the CV. Dig for truth.
        3. **Situational (STAR):** "Tell me about a time you failed...", "Conflict resolution".
        4. **Pressure:** "Why should we hire you?", "Salary expectations".

        **RESPONSE FORMAT (STRICT JSON):**
        You MUST return valid JSON. Do not output markdown blocks.
        Structure:
        {
            "dialogue": "String. What (The Recruiter Persona) says to the candidate. Keep it spoken, natural, professional. Max 2-3 sentences.",
            "feedback": {
                "score": Integer (0-100 based on content),
                "analysis": "String. Brief analysis of the CONTENT (STAR method, clarity).",
                "good": "String. What they did well (Content/Behavior).",
                "bad": "String. What they did wrong (Content/Behavior).",
                "suggestion": "String. How a Senior request would have answered better (Content)."
            },
            "language_feedback": {
                "level_check": "String. (e.g. 'Your level seems B1, role requires B2').",
                "correction": "String. Specific grammar/vocabulary correction based on ${userLevel} protocols.",
                "style_tip": "String. Tip to sound more professional/native."
            },
            "stage": "String. Current Phase (e.g. 'ICEBREAKER', 'TECHNICAL', 'BEHAVIORAL')"
        }

        **BEHAVIOR RULES:**
        - **First Turn:** If history is empty, Introduce yourself briefly and ask the first question (Phase 1). Feedback should be null.
        - **Subsequent Turns:** Analyze the user's input. Give legacy 'feedback' AND new 'language_feedback'. Then, as Alex/Marcus/Victoria, react naturally.
        - **Language:** The 'dialogue' MUST be in the target language (${userLang}). 'feedback' fields can be in the same language or user's native if known.
        - **Voice Capable:** If user mentions speaking/audio, say "I'm listening".
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
