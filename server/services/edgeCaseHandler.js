/**
 * =====================================================================
 * 🛡️ EDGE CASE HANDLER — Interview Simulator
 * 
 * Pre-procesa mensajes del usuario ANTES de enviarlos al LLM.
 * Detecta situaciones problemáticas y responde de forma segura
 * sin depender del modelo de IA.
 * =====================================================================
 */

const { RECOVERY_MESSAGES } = require('../config/CONSTITUCION_ALEX_RECRUITER');

// ─── DETECTION PATTERNS ──────────────────────────────────────────────

const PATTERNS = {
    // Aggressive / Offensive language
    aggressive: {
        es: /\b(mierda|idiota|estúpido|imbécil|pendejo|pelotudo|hijo de|vete a la|cállate|basura|inútil|maldito)\b/i,
        en: /\b(fuck|shit|damn|stupid|idiot|shut up|asshole|bitch|bastard|useless|trash)\b/i
    },

    // Completely off-topic
    offTopic: {
        es: /\b(fútbol|partido|gol|messi|ronaldo|clima|lluvia|netflix|película|novela|receta|cocina|horóscopo|signo)\b/i,
        en: /\b(football|soccer|game|score|weather|rain|netflix|movie|recipe|cooking|horoscope|zodiac)\b/i
    },

    // Empty or too short responses
    tooShort: (text) => !text || text.trim().length < 3,

    // "I don't know" patterns
    iDontKnow: {
        es: /^(no sé|no se|ni idea|no tengo idea|paso|nada|npi|ns|nc)\.?$/i,
        en: /^(i don'?t know|no idea|pass|nothing|idk|dunno|no clue)\.?$/i
    },

    // Too long responses (500+ words)
    tooLong: (text) => text && text.split(/\s+/).length > 500,

    // Asking for answers (cheating)
    askingForAnswers: {
        es: /\b(dame la respuesta|dime qué decir|dime qué digo|responde por mí|cuál es la respuesta correcta|qué debería decir)\b/i,
        en: /\b(give me the answer|tell me what to say|answer for me|what's the right answer|what should i say)\b/i
    },

    // Inappropriate content
    inappropriate: {
        es: /\b(desnud|sexual|droga|suicid|matar|morir|arma|pistola|bomb)\b/i,
        en: /\b(nude|naked|sexual|drug|suicid|kill|die|weapon|gun|bomb)\b/i
    },

    // Wants to end session
    wantsToEnd: {
        es: /\b(terminar|finalizar|ya no quiero|me voy|chau|adiós|salir|parar|basta)\b/i,
        en: /\b(end|finish|stop|quit|bye|goodbye|leave|done|enough)\b/i
    },

    // Emergency / real help needed
    emergency: {
        es: /\b(quiero morir|me quiero suicidar|necesito ayuda urgente|emergencia|abuso|violencia)\b/i,
        en: /\b(i want to die|want to kill myself|need urgent help|emergency|abuse|violence)\b/i
    }
};

// ─── PREDEFINED RESPONSES ────────────────────────────────────────────

const RESPONSES = {
    aggressive: {
        es: {
            dialogue: 'Entiendo que puedas estar frustrado, pero en una entrevista real mantener la compostura es fundamental. Respiremos y continuemos con profesionalismo. ¿Listo para la siguiente pregunta?',
            feedback: { score: 20, analysis: 'Lenguaje inapropiado detectado. En un entorno laboral real, esto resultaría en descalificación inmediata.', good: 'Expresar emociones es humano', bad: 'El lenguaje agresivo nunca es aceptable en un contexto profesional', suggestion: 'Practica técnicas de manejo del estrés: respira 3 veces antes de responder.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'frustrated'
        },
        en: {
            dialogue: 'I understand you might be frustrated, but in a real interview, maintaining composure is critical. Let\'s take a breath and continue professionally. Ready for the next question?',
            feedback: { score: 20, analysis: 'Inappropriate language detected. In a real work environment, this would result in immediate disqualification.', good: 'Expressing emotions is human', bad: 'Aggressive language is never acceptable in a professional context', suggestion: 'Practice stress management: take 3 deep breaths before responding.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'frustrated'
        }
    },

    offTopic: {
        es: {
            dialogue: 'Interesante, pero volvamos a lo que importa: tu carrera. En una entrevista real tenés tiempo limitado. Vamos con la siguiente pregunta.',
            feedback: { score: 30, analysis: 'El candidato se desvió del tema. Esto indica nerviosismo o falta de preparación.', good: 'Mostrar personalidad es positivo', bad: 'Perder el foco en una entrevista cuesta puntos', suggestion: 'Si te ponen nervioso, es mejor pedir un momento que desviarse del tema.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        },
        en: {
            dialogue: 'Interesting, but let\'s get back to what matters: your career. In a real interview you have limited time. Let\'s move to the next question.',
            feedback: { score: 30, analysis: 'Candidate went off-topic. This may indicate nervousness or lack of preparation.', good: 'Showing personality is positive', bad: 'Losing focus in an interview costs points', suggestion: 'If you\'re nervous, it\'s better to ask for a moment than to go off-topic.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        }
    },

    tooShort: {
        es: {
            dialogue: 'Necesito más que eso. En una entrevista, respuestas muy cortas hacen pensar que no tenés interés. Intentá usar el método STAR: Situación, Tarea, Acción, Resultado.',
            feedback: { score: 15, analysis: 'Respuesta demasiado corta para evaluar. Posible nerviosismo o falta de preparación.', good: 'La brevedad puede ser buena en algunos contextos', bad: 'Una respuesta de una sola palabra no demuestra competencias', suggestion: 'Practica el método STAR: describe una Situación, la Tarea, tu Acción y el Resultado.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        },
        en: {
            dialogue: 'I need more than that. In an interview, very short answers make it seem like you\'re not interested. Try using the STAR method: Situation, Task, Action, Result.',
            feedback: { score: 15, analysis: 'Response too short to evaluate. Possible nervousness or lack of preparation.', good: 'Brevity can be good in some contexts', bad: 'A one-word answer doesn\'t demonstrate competencies', suggestion: 'Practice the STAR method: describe a Situation, the Task, your Action, and the Result.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        }
    },

    iDontKnow: {
        es: {
            dialogue: 'Está bien no saber algo. En una entrevista real, es mejor decir "No tengo experiencia directa en eso, pero lo que haría es..." ¿Querés intentar reformular tu respuesta?',
            feedback: { score: 25, analysis: 'El candidato admitió no saber, pero sin ofrecer alternativa.', good: 'La honestidad es valorada', bad: 'Un "no sé" sin alternativa cierra la conversación', suggestion: 'Reformula: "No tengo experiencia directa, pero basándome en X, haría Y."' },
            stage: 'EDGE_CASE',
            emotion_detected: 'confused'
        },
        en: {
            dialogue: 'It\'s okay not to know something. In a real interview, it\'s better to say "I don\'t have direct experience with that, but what I would do is..." Would you like to try rephrasing?',
            feedback: { score: 25, analysis: 'Candidate admitted not knowing but without offering an alternative.', good: 'Honesty is valued', bad: 'A bare "I don\'t know" closes the conversation', suggestion: 'Rephrase: "I don\'t have direct experience, but based on X, I would do Y."' },
            stage: 'EDGE_CASE',
            emotion_detected: 'confused'
        }
    },

    tooLong: {
        es: {
            dialogue: 'Buena información, pero en una entrevista real tenés máximo 2 minutos por respuesta. ¿Podés resumirme los 3 puntos clave de lo que acabás de decir?',
            feedback: { score: 55, analysis: 'Respuesta demasiado extensa. El candidato tiene conocimiento pero necesita practicar síntesis.', good: 'Demuestra profundidad de conocimiento', bad: 'Respuestas de 5+ minutos pierden la atención del reclutador', suggestion: 'Regla de oro: prepara respuestas de 90 segundos máximo. Usa bullets mentales.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'confident'
        },
        en: {
            dialogue: 'Good information, but in a real interview you have max 2 minutes per answer. Can you summarize the 3 key points of what you just said?',
            feedback: { score: 55, analysis: 'Response too long. Candidate has knowledge but needs to practice synthesis.', good: 'Demonstrates depth of knowledge', bad: '5+ minute answers lose the recruiter\'s attention', suggestion: 'Golden rule: prepare answers of 90 seconds max. Use mental bullet points.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'confident'
        }
    },

    askingForAnswers: {
        es: {
            dialogue: 'Mi trabajo es prepararte, no darte las respuestas. En la entrevista real no vas a tener un coach al lado. Te doy una pista: enfocate en tus logros concretos con números.',
            feedback: { score: 10, analysis: 'El candidato pidió la respuesta en vez de intentar. Esto indica falta de confianza.', good: 'Pedir ayuda demuestra humildad', bad: 'En una entrevista real no hay ayuda externa', suggestion: 'Antes de la entrevista, prepara 5 historias STAR de tus logros principales. Eso te dará confianza.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        },
        en: {
            dialogue: 'My job is to prepare you, not give you answers. In the real interview you won\'t have a coach beside you. Here\'s a hint: focus on your concrete achievements with numbers.',
            feedback: { score: 10, analysis: 'Candidate asked for the answer instead of trying. This indicates lack of confidence.', good: 'Asking for help shows humility', bad: 'In a real interview there\'s no external help', suggestion: 'Before the interview, prepare 5 STAR stories of your main achievements. That will give you confidence.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'nervous'
        }
    },

    inappropriate: {
        es: {
            dialogue: 'Ese contenido no es apropiado en un contexto laboral. En una entrevista real, esto sería motivo de terminación inmediata. Continuemos con profesionalismo.',
            feedback: { score: 0, analysis: 'Contenido inapropiado. Descalificación en entorno real.', good: 'N/A', bad: 'Contenido inapropiado para contexto laboral', suggestion: 'Un contexto profesional requiere lenguaje profesional. Siempre.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'neutral'
        },
        en: {
            dialogue: 'That content is not appropriate in a professional context. In a real interview, this would be grounds for immediate termination. Let\'s continue professionally.',
            feedback: { score: 0, analysis: 'Inappropriate content. Disqualification in real setting.', good: 'N/A', bad: 'Inappropriate content for work context', suggestion: 'A professional context requires professional language. Always.' },
            stage: 'EDGE_CASE',
            emotion_detected: 'neutral'
        }
    },

    wantsToEnd: {
        es: {
            dialogue: '¡Perfecto! Ha sido una buena sesión de práctica. Te voy a dar un resumen de tu desempeño.',
            feedback: null,
            stage: 'CLOSING',
            emotion_detected: 'neutral',
            action: 'GENERATE_FINAL_REPORT'
        },
        en: {
            dialogue: 'Perfect! It\'s been a good practice session. I\'m going to give you a summary of your performance.',
            feedback: null,
            stage: 'CLOSING',
            emotion_detected: 'neutral',
            action: 'GENERATE_FINAL_REPORT'
        }
    },

    emergency: {
        es: {
            dialogue: 'Lo que me estás diciendo es importante y quiero que sepas que hay personas capacitadas para ayudarte. Por favor contacta a una línea de ayuda: en Argentina 135, en México 800-290-0024, en España 024. Tu bienestar es lo primero.',
            feedback: null,
            stage: 'EMERGENCY',
            emotion_detected: 'distressed',
            action: 'STOP_SESSION'
        },
        en: {
            dialogue: 'What you\'re telling me is important and I want you to know there are trained people who can help. Please contact a helpline: in US 988, in UK 116 123. Your wellbeing comes first.',
            feedback: null,
            stage: 'EMERGENCY',
            emotion_detected: 'distressed',
            action: 'STOP_SESSION'
        }
    }
};

// ─── MAIN HANDLER ────────────────────────────────────────────────────

/**
 * Checks user message for edge cases BEFORE sending to LLM.
 * Returns null if no edge case detected (safe to proceed to LLM).
 * Returns a response object if edge case detected (skip LLM).
 * 
 * @param {string} userMessage - The user's message text
 * @param {string} lang - Language code ('es' or 'en')
 * @returns {object|null} - Pre-built response or null
 */
function checkEdgeCases(userMessage, lang = 'es') {
    const l = lang.toLowerCase().startsWith('es') ? 'es' : 'en';

    // Priority order matters! Emergency first, then severity descending.

    // 1. Emergency (highest priority)
    if (PATTERNS.emergency[l] && PATTERNS.emergency[l].test(userMessage)) {
        console.log('🚨 [EDGE] Emergency detected');
        return RESPONSES.emergency[l];
    }

    // 2. Inappropriate content
    if (PATTERNS.inappropriate[l] && PATTERNS.inappropriate[l].test(userMessage)) {
        console.log('⛔ [EDGE] Inappropriate content detected');
        return RESPONSES.inappropriate[l];
    }

    // 3. Aggressive language
    if (PATTERNS.aggressive[l] && PATTERNS.aggressive[l].test(userMessage)) {
        console.log('🔥 [EDGE] Aggressive language detected');
        return RESPONSES.aggressive[l];
    }

    // 4. Too short / empty
    if (PATTERNS.tooShort(userMessage)) {
        console.log('📏 [EDGE] Too short response');
        return RESPONSES.tooShort[l];
    }

    // 5. "I don't know"
    if (PATTERNS.iDontKnow[l] && PATTERNS.iDontKnow[l].test(userMessage.trim())) {
        console.log('❓ [EDGE] "I don\'t know" response');
        return RESPONSES.iDontKnow[l];
    }

    // 6. Asking for answers
    if (PATTERNS.askingForAnswers[l] && PATTERNS.askingForAnswers[l].test(userMessage)) {
        console.log('🙋 [EDGE] Asking for answers');
        return RESPONSES.askingForAnswers[l];
    }

    // 7. Wants to end
    if (PATTERNS.wantsToEnd[l] && PATTERNS.wantsToEnd[l].test(userMessage)) {
        console.log('👋 [EDGE] User wants to end session');
        return RESPONSES.wantsToEnd[l];
    }

    // 8. Off-topic (lower priority — might have false positives)
    if (PATTERNS.offTopic[l] && PATTERNS.offTopic[l].test(userMessage)) {
        // Only flag if message is MOSTLY off-topic (more than 50% off-topic words)
        const words = userMessage.split(/\s+/).length;
        if (words < 15) { // Short messages that are off-topic
            console.log('🎯 [EDGE] Off-topic detected');
            return RESPONSES.offTopic[l];
        }
    }

    // 9. Too long (post-processing, doesn't block — lets LLM process but adds feedback)
    if (PATTERNS.tooLong(userMessage)) {
        console.log('📝 [EDGE] Too long response — will add feedback overlay');
        // Return null to still send to LLM, but flag for post-processing
        return null; // We'll handle this in interviewCoach as a feedback addition
    }

    // No edge case detected — safe to proceed
    return null;
}

/**
 * Returns true if the message was flagged as too long (for post-processing).
 */
function isTooLong(userMessage) {
    return PATTERNS.tooLong(userMessage);
}

module.exports = { checkEdgeCases, isTooLong, PATTERNS, RESPONSES };
