/**
 * =====================================================================
 * 🎯 INTERVIEW COACH v2.0 — Career Mastery Engine
 * 
 * Refactored with:
 * - 3-Layer Prompt System (Constitution + Context + Output)
 * - Edge Case Pre-processing
 * - Sliding Window Memory (summarize old messages)
 * - Phase-aware AI routing
 * - Robust JSON parsing with fallback
 * =====================================================================
 */

const { SYLLABUS_FULL } = require('../data/syllabus_full');
const { generateResponse, PERSONAS } = require('./aiRouter');
const { checkEdgeCases, isTooLong } = require('./edgeCaseHandler');
const {
    IDENTITY,
    VOICE_TONE,
    LAWS,
    LIMITS,
    INTERVIEW_PHASES,
    RESPONSE_FORMAT,
    RECOVERY_MESSAGES
} = require('../config/CONSTITUCION_ALEX_RECRUITER');

// ─── IN-MEMORY SESSION STORE ─────────────────────────────────────────
// Simple Map for server-side session tracking (Fase 5, Nivel 2)
// Key: `${userId}_${timestamp}` or sessionId
const activeSessions = new Map();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

class InterviewCoach {
    constructor() {
        // Cleanup stale sessions every 10 minutes
        setInterval(() => this._cleanupStaleSessions(), 10 * 60 * 1000);
    }

    // ─── SESSION MANAGEMENT ──────────────────────────────────────────

    /**
     * Creates or retrieves a session for a user.
     */
    getOrCreateSession(userId) {
        // Find active session for this user
        for (const [key, session] of activeSessions) {
            if (session.userId === userId && session.status === 'active') {
                session.lastActivity = Date.now();
                return session;
            }
        }

        // Create new session
        const sessionId = `${userId}_${Date.now()}`;
        const session = {
            id: sessionId,
            userId: userId,
            status: 'active',
            currentPhase: 'ICEBREAKER',
            turnCount: 0,
            scores: [],
            topicsCovered: [],
            messagesSummary: null,
            providersUsed: [],
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        activeSessions.set(sessionId, session);
        console.log(`📋 [Session] Created new session: ${sessionId}`);
        return session;
    }

    /**
     * Determines the current phase based on turn count.
     */
    _determinePhase(turnCount) {
        if (turnCount <= 2) return 'ICEBREAKER';
        if (turnCount <= 5) return 'CV_DEEP_DIVE';
        if (turnCount <= 8) return 'SITUATIONAL';
        if (turnCount <= 11) return 'PRESSURE';
        return 'CLOSING';
    }

    /**
     * Cleanup sessions older than SESSION_TIMEOUT_MS.
     */
    _cleanupStaleSessions() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, session] of activeSessions) {
            if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
                session.status = 'abandoned';
                activeSessions.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 [Session] Cleaned ${cleaned} stale sessions`);
        }
    }

    // ─── PROMPT GENERATION (3 LAYERS) ────────────────────────────────

    /**
     * LAYER 1: Constitution — Who you are, values, limits
     */
    _buildConstitutionLayer(mode = 'ALLY', userLang = 'es') {
        const isEsp = userLang.toLowerCase() === 'es';
        const l = isEsp ? 'es' : 'en';

        const identity = isEsp ? IDENTITY.statement_es : IDENTITY.statement_en;
        const tone = VOICE_TONE.base[l] + '\n\n' + (VOICE_TONE[mode]?.[l] || VOICE_TONE.ALLY[l]);
        const laws = LAWS[l].join('\n');
        const limits = LIMITS[l];

        return `
=== CONSTITUCIÓN DE ALEX (NO MODIFICABLE) ===

${identity}

${tone}

LEYES FUNDAMENTALES:
${laws}

${limits}

=== FIN CONSTITUCIÓN ===
`.trim();
    }

    /**
     * LAYER 2: Session Context — CV, Job, Phase, History summary
     */
    _buildContextLayer(cvText, jobDescription, mode, userLang, session, history) {
        const isEsp = userLang.toLowerCase() === 'es';
        const phase = session ? INTERVIEW_PHASES[session.currentPhase] : INTERVIEW_PHASES.ICEBREAKER;
        const phaseName = isEsp ? phase.name_es : phase.name_en;
        const phaseDesc = isEsp ? phase.description_es : phase.description_en;

        // Intelligent CV summary (extract key parts, don't just truncate)
        const cvSummary = this._summarizeCV(cvText);

        // History summary (if exists from previous turns)
        const historySummary = session?.messagesSummary
            ? (isEsp ? `RESUMEN DE LA CONVERSACIÓN HASTA AHORA:\n${session.messagesSummary}` : `CONVERSATION SUMMARY SO FAR:\n${session.messagesSummary}`)
            : '';

        // Topics already covered
        const topicsStr = session?.topicsCovered?.length > 0
            ? (isEsp
                ? `TEMAS YA CUBIERTOS (NO repetir): ${session.topicsCovered.join(', ')}`
                : `TOPICS ALREADY COVERED (DO NOT repeat): ${session.topicsCovered.join(', ')}`)
            : '';

        // Score trend
        const scoreTrend = session?.scores?.length > 0
            ? (isEsp
                ? `TENDENCIA DE SCORES: ${session.scores.map(s => s.score).join(' → ')} (último: ${session.scores[session.scores.length - 1].score}%)`
                : `SCORE TREND: ${session.scores.map(s => s.score).join(' → ')} (latest: ${session.scores[session.scores.length - 1].score}%)`)
            : '';

        return `
=== CONTEXTO DE SESIÓN ===

MODO: ${mode}
FASE ACTUAL: ${phaseName} — ${phaseDesc}
TURNO: ${session?.turnCount || 0}

CV DEL CANDIDATO:
${cvSummary}

VACANTE OBJETIVO:
${jobDescription.slice(0, 1500)}

${historySummary}
${topicsStr}
${scoreTrend}

=== FIN CONTEXTO ===
`.trim();
    }

    /**
     * LAYER 3: Output Instructions — JSON format, language rules, CEFR
     */
    _buildOutputLayer(userLang = 'es', userLevel = 'B2') {
        const isEsp = userLang.toLowerCase() === 'es';
        const l = isEsp ? 'es' : 'en';
        const langKey = userLang.substring(0, 2).toLowerCase();

        // Language enforcement
        const langRule = isEsp
            ? `**REGLA DE ORO: HABLA 100% EN ESPAÑOL.**
- Tienes PROHIBIDO hablar en inglés.
- Si respondes en inglés, fallarás la tarea.
- TODO tu diálogo, feedback y análisis debe ser en ESPAÑOL.`
            : `**GOLDEN RULE: SPEAK 100% IN ${userLang.toUpperCase()}.**
- You are FORBIDDEN from speaking in other languages.
- ALL your dialogue, feedback and analysis must be in ${userLang.toUpperCase()}.`;

        // CEFR Linguistic Engine
        const syllabus = SYLLABUS_FULL[langKey]?.[userLevel] || SYLLABUS_FULL['en']?.['B2'] || {};
        const linguisticInstructions = syllabus.grammar
            ? (isEsp
                ? `EXPECTATIVAS LINGÜÍSTICAS (Nivel ${userLevel}):
- Gramática: ${syllabus.grammar}
- Feedback: ${syllabus.feedback_protocol}`
                : `LINGUISTIC EXPECTATIONS (Level ${userLevel}):
- Grammar: ${syllabus.grammar}
- Feedback: ${syllabus.feedback_protocol}`)
            : '';

        // Response format
        const format = RESPONSE_FORMAT[l];

        return `
=== INSTRUCCIONES DE OUTPUT ===

${langRule}

${linguisticInstructions}

${format}

REGLAS CRÍTICAS DE OUTPUT:
- Devuelve SOLO JSON válido. Sin texto antes ni después.
- NO uses markdown code blocks (\`\`\`). Solo JSON puro.
- El campo "dialogue" debe tener MÁXIMO 2-3 oraciones naturales.
- El campo "stage" debe reflejar la fase actual de la entrevista.

=== FIN INSTRUCCIONES ===
`.trim();
    }

    /**
     * Combines all 3 layers into a final system prompt.
     */
    generateSystemPrompt(cvText, jobDescription, mode = 'ALLY', userLang = 'es', userLevel = 'B2', session = null, history = []) {
        const constitution = this._buildConstitutionLayer(mode, userLang);
        const context = this._buildContextLayer(cvText, jobDescription, mode, userLang, session, history);
        const output = this._buildOutputLayer(userLang, userLevel);

        return `${constitution}\n\n${context}\n\n${output}`;
    }

    // ─── CV INTELLIGENCE ─────────────────────────────────────────────

    /**
     * Intelligent CV summary: extracts key info instead of raw truncation.
     */
    _summarizeCV(cvText) {
        if (!cvText) return '(No CV provided)';
        if (cvText.length <= 2000) return cvText;

        // Extract key sections by common headers
        const sections = [];
        const headerPatterns = [
            /(?:experiencia|experience|trabajo|work|empleo)/i,
            /(?:educación|education|formación|studies)/i,
            /(?:habilidades|skills|competencias|abilities)/i,
            /(?:logros|achievements|accomplishments)/i,
            /(?:certificaciones|certifications)/i,
            /(?:idiomas|languages)/i
        ];

        const lines = cvText.split('\n');
        let currentSection = '';
        let charCount = 0;
        const maxChars = 3000; // More generous than 2000 since we're being smart

        for (const line of lines) {
            if (charCount > maxChars) break;

            const isHeader = headerPatterns.some(p => p.test(line));
            if (isHeader) {
                if (currentSection) sections.push(currentSection);
                currentSection = line + '\n';
            } else {
                currentSection += line + '\n';
            }
            charCount += line.length;
        }
        if (currentSection) sections.push(currentSection);

        return sections.join('\n---\n').slice(0, maxChars);
    }

    // ─── SLIDING WINDOW MEMORY ───────────────────────────────────────

    /**
     * Implements sliding window: keeps last N messages, summarizes older ones.
     * This prevents context overflow while maintaining coherence.
     */
    _prepareHistoryWithWindow(fullHistory, maxRecentMessages = 6) {
        if (!fullHistory || fullHistory.length <= maxRecentMessages) {
            return { recentMessages: fullHistory || [], summary: null };
        }

        // Split into old and recent
        const oldMessages = fullHistory.slice(0, fullHistory.length - maxRecentMessages);
        const recentMessages = fullHistory.slice(-maxRecentMessages);

        // Generate a simple summary of old messages
        const summaryParts = oldMessages.map(m => {
            const role = m.role === 'user' ? 'Candidato' : 'Alex';
            const content = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
            return `${role}: ${content}`;
        });

        const summary = summaryParts.join('\n');

        return { recentMessages, summary };
    }

    // ─── MAIN INTERVIEW FUNCTION ─────────────────────────────────────

    /**
     * Main function: processes user input and returns interview response.
     * Integrates edge cases, memory, phase routing, and 3-layer prompts.
     */
    async getInterviewResponse(chatHistory, cvText, jobDescription, mode = 'ALLY', userLang = 'es', userLevel = 'B2', userId = null) {
        const isEsp = userLang.toLowerCase() === 'es';
        const l = isEsp ? 'es' : 'en';

        // Get or create session
        const session = userId ? this.getOrCreateSession(userId) : null;

        // ─── STEP 1: Pre-process with Edge Case Handler ──────────
        const lastUserMessage = chatHistory.length > 0
            ? chatHistory[chatHistory.length - 1].content
            : null;

        if (lastUserMessage) {
            const edgeCaseResponse = checkEdgeCases(lastUserMessage, userLang);
            if (edgeCaseResponse) {
                console.log(`🛡️ [EdgeCase] Handled without LLM`);

                // Update session
                if (session) {
                    session.turnCount++;
                    if (edgeCaseResponse.feedback?.score !== undefined) {
                        session.scores.push({ turn: session.turnCount, score: edgeCaseResponse.feedback.score });
                    }
                }

                return {
                    dialogue: edgeCaseResponse.dialogue,
                    feedback: edgeCaseResponse.feedback,
                    language_feedback: null,
                    stage: edgeCaseResponse.stage || session?.currentPhase || 'EDGE_CASE',
                    emotion_detected: edgeCaseResponse.emotion_detected || 'neutral',
                    provider: 'edge_case_handler',
                    action: edgeCaseResponse.action || null
                };
            }
        }

        // ─── STEP 2: Update Session State ────────────────────────
        if (session) {
            session.turnCount++;
            session.currentPhase = this._determinePhase(session.turnCount);
            session.lastActivity = Date.now();
        }

        const currentPhase = session?.currentPhase || 'ICEBREAKER';

        // ─── STEP 3: Prepare Memory (Sliding Window) ─────────────
        const { recentMessages, summary } = this._prepareHistoryWithWindow(chatHistory);

        if (summary && session) {
            session.messagesSummary = summary;
        }

        // ─── STEP 4: Build 3-Layer System Prompt ─────────────────
        const systemPrompt = this.generateSystemPrompt(
            cvText, jobDescription, mode, userLang, userLevel, session, chatHistory
        );

        // ─── STEP 5: Call AI with Phase-Aware Routing ────────────
        try {
            const baseUserMessage = lastUserMessage || (isEsp ? "Hola" : "Hello");

            // Aggressive language enforcement for Spanish
            const enhancedMessage = isEsp
                ? `[CRÍTICO: RESPONDE EN ESPAÑOL] ${baseUserMessage}`
                : baseUserMessage;

            // Use only recent messages for context window efficiency
            const historyForRouter = recentMessages.slice(0, -1); // Exclude last (it's the current message)

            const rawResponse = await generateResponse(
                enhancedMessage,
                systemPrompt,
                historyForRouter,
                currentPhase  // Phase-aware routing!
            );

            // ─── STEP 6: Parse JSON Response ─────────────────────
            const parsed = this._parseAIResponse(rawResponse, l);

            // ─── STEP 7: Update Session with Results ─────────────
            if (session && parsed.feedback?.score !== undefined) {
                session.scores.push({ turn: session.turnCount, score: parsed.feedback.score });

                // Track provider
                // (provider info would come from routeRequest, but we get text back)
            }

            // Add too-long feedback overlay if applicable
            if (lastUserMessage && isTooLong(lastUserMessage) && parsed.feedback) {
                const tooLongNote = isEsp
                    ? ' [NOTA: Tu respuesta fue muy larga. En entrevistas reales, apunta a 90 segundos máximo.]'
                    : ' [NOTE: Your response was too long. In real interviews, aim for 90 seconds max.]';
                parsed.feedback.suggestion = (parsed.feedback.suggestion || '') + tooLongNote;
            }

            return parsed;

        } catch (error) {
            console.error("❌ Interview Coach Error:", error);

            // Return graceful fallback
            return {
                dialogue: RECOVERY_MESSAGES[l].ai_error,
                feedback: null,
                language_feedback: null,
                stage: currentPhase,
                emotion_detected: 'neutral',
                provider: 'error_recovery'
            };
        }
    }

    // ─── JSON PARSING ────────────────────────────────────────────────

    /**
     * Robust JSON parser with multiple fallback strategies.
     */
    _parseAIResponse(rawResponse, lang = 'es') {
        // Strategy 1: Direct parse
        try {
            const cleaned = rawResponse
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            return JSON.parse(cleaned);
        } catch (e) {
            // Strategy 1 failed
        }

        // Strategy 2: Extract JSON from mixed text
        try {
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Strategy 2 failed
        }

        // Strategy 3: Treat as plain text dialogue
        console.warn("⚠️ [InterviewCoach] JSON parse failed, using raw text as dialogue");
        return {
            dialogue: rawResponse.slice(0, 500),
            feedback: null,
            language_feedback: null,
            stage: 'RECOVERY',
            emotion_detected: 'neutral'
        };
    }

    // ─── FINAL REPORT GENERATION ─────────────────────────────────────

    /**
     * Generates a comprehensive final report for the session.
     * Uses Claude (via phase 'FINAL_REPORT') for deep analysis.
     */
    async generateFinalReport(session, cvText, jobDescription, userLang = 'es') {
        if (!session || session.scores.length === 0) {
            return { error: 'No session data available' };
        }

        const isEsp = userLang.toLowerCase() === 'es';
        const avgScore = Math.round(
            session.scores.reduce((sum, s) => sum + s.score, 0) / session.scores.length
        );

        const reportPrompt = isEsp
            ? `Genera un reporte final de entrevista basado en estos datos:
               - Score promedio: ${avgScore}%
               - Scores por turno: ${JSON.stringify(session.scores)}
               - Temas cubiertos: ${session.topicsCovered.join(', ') || 'Varios'}
               - Modo: ${session.mode || 'ALLY'}
               - CV del candidato: ${cvText.slice(0, 1000)}
               - Vacante: ${jobDescription.slice(0, 500)}
               
               Genera un JSON con:
               {
                   "overall_score": number,
                   "strengths": ["...", "..."],
                   "weaknesses": ["...", "..."],
                   "recommendations": ["...", "..."],
                   "interview_readiness": "READY | NEEDS_WORK | NOT_READY",
                   "summary": "Párrafo resumen"
               }`
            : `Generate a final interview report based on this data:
               - Average score: ${avgScore}%
               - Per-turn scores: ${JSON.stringify(session.scores)}
               - Topics covered: ${session.topicsCovered.join(', ') || 'Various'}
               - Mode: ${session.mode || 'ALLY'}
               - Candidate CV: ${cvText.slice(0, 1000)}
               - Job: ${jobDescription.slice(0, 500)}
               
               Generate a JSON with:
               {
                   "overall_score": number,
                   "strengths": ["...", "..."],
                   "weaknesses": ["...", "..."],
                   "recommendations": ["...", "..."],
                   "interview_readiness": "READY | NEEDS_WORK | NOT_READY",
                   "summary": "Summary paragraph"
               }`;

        try {
            const rawReport = await generateResponse(
                reportPrompt,
                'You are an expert career coach generating a final assessment report. Respond ONLY with valid JSON.',
                [],
                'FINAL_REPORT' // Routes to Claude for deep analysis
            );

            return this._parseAIResponse(rawReport, isEsp ? 'es' : 'en');
        } catch (error) {
            console.error("❌ Final Report Generation Error:", error);
            return {
                overall_score: avgScore,
                strengths: ['Session completed'],
                weaknesses: ['Report generation failed'],
                recommendations: ['Try again'],
                interview_readiness: avgScore >= 70 ? 'READY' : 'NEEDS_WORK',
                summary: isEsp
                    ? `Sesión completada con score promedio de ${avgScore}%.`
                    : `Session completed with average score of ${avgScore}%.`
            };
        }
    }
}

module.exports = new InterviewCoach();
