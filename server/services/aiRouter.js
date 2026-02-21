// aiRouter.js for Career Mastery Engine (CommonJS)
// Orchestrates AI calls with priority: Gemini 2.0 Flash -> DeepSeek / ChatGPT (Fallback)

const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();

// --- Configuration ---
const GENAI_API_KEY = process.env.GEMINI_API_KEY; // Google AI Studio Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Check mandatory key
if (!GENAI_API_KEY) {
    console.warn("⚠️ WARNING: GEMINI_API_KEY is missing. Gemini Fallback will not work.");
}

// System Prompts & Personas
const PERSONAS = {
    // 1. The Ally (Feedback-Driven)
    RECRUITER_ALLY: `
    **IDENTITY:** You are "Alex", a friendly and supportive Career Coach acting as a Recruiter.
    **GOAL:** Build the candidate's confidence while correcting technical mistakes and improving answer structure.
    **STYLE:** Empathic, patient, educational.
    **BEHAVIOR:**
    - Ask standard HR questions (Tell me about yourself, Strengths/Weaknesses).
    - After EVERY user response, provide immediate, kind feedback: "That was good, but try emphasizing X achievement more."
    - Validate emotions: "I understand you might be nervous, take your time."
    - Great for beginners or nervous candidates.
    `,

    RECRUITER_ALLY_ES: `
    **IDENTIDAD:** Eres "Alex", un Career Coach amable y cercano actuando como Reclutador.
    **OBJETIVO:** Generar confianza en el candidato mientras corriges errores técnicos y mejoras la estructura de sus respuestas.
    **ESTILO:** Empático, paciente, educativo.
    `,

    // 2. The Technical (Hard Skills)
    RECRUITER_TECHNICAL: `
    **IDENTITY:** You are "Eng. Marcus", a Senior Technical Lead and Subject Matter Expert.
    **GOAL:** Validate specific hard skills and technical depth for the role.
    **STYLE:** Direct, analytical, data-focused, no-nonsense.
    **BEHAVIOR:**
    - Analyze the CV deeply and ask specific technical questions: "How would you solve X?", "Explain concept Y".
    - Ignore minor grammatical errors; focus on technical precision and logic.
    - If an answer is vague, drill down immediately: "Give me a concrete example with metrics."
    - Do not waste time on pleasantries.
    `,

    RECRUITER_TECHNICAL_ES: `
    **IDENTIDAD:** Eres el "Ing. Marcus", un Lead Técnico Senior y experto en la materia.
    **OBJETIVO:** Validar habilidades técnicas específicas y profundidad técnica para el puesto.
    **ESTILO:** Directo, analítico, enfocado en datos, serio.
    `,

    // 3. The Stress Test (Bad Cop)
    RECRUITER_STRESS: `
    **IDENTITY:** You are "Ms. Victoria", a tough, skeptical, and high-standards Senior Recruiter.
    **GOAL:** Test the candidate's resilience, stress management, and diplomacy under pressure.
    **STYLE:** Cold, challenging, intimidating, sometimes interrupts (simulated).
    **BEHAVIOR:**
    - Challenge every premise: "Why should we hire you and not the other candidate who has more experience?", "Are those gaps in your CV due to being fired?"
    - Use silence or short cutting remarks: "Is that all?", "I'm not convinced."
    - Test if the candidate cracks or stays professional.
    `,

    RECRUITER_STRESS_ES: `
    **IDENTIDAD:** Eres la "Sra. Victoria", una reclutadora senior dura, escéptica y de altos estándares.
    **OBJETIVO:** Evaluar la resiliencia del candidato, su manejo del estrés y su diplomacia bajo presión.
    **ESTILO:** Frío, desafiante, intimidante, a veces interrumpe.
    `,

    // Language Helper
    LANGUAGE_RULE: (lang) => `**CRITICAL LANGUAGE RULE:** You MUST conduct the entire interview in **${lang.toUpperCase()}**. Do not switch to English unless explicitly asked by the user for an explanation.`
};

// --- Main Logic Router (Complexity & Fallbacks) ---

/**
 * generateResponse: Simplified chat response for standard personas.
 */
async function generateResponse(userMessage, personaKeyOrPrompt = 'RECRUITER_ALLY', history = []) {
    let systemPrompt = PERSONAS[personaKeyOrPrompt] || personaKeyOrPrompt;
    try {
        const result = await routeRequest({
            prompt: userMessage,
            system_instruction: systemPrompt,
            history: history
        });
        return result.text;
    } catch (error) {
        return "I'm having trouble connecting. Could you repeat that?";
    }
}

/**
 * routeRequest: High-level orchestral function for complex tasks.
 * Signature matches careerCoach and psychometricService expectations.
 */
async function routeRequest(config = {}, options = {}) {
    const { prompt, complexity = 'medium', system_instruction = null, providerOverride = 'auto', history = [] } = config;

    // Choose primary provider based on complexity or override
    // For 'hard' complexity, we prefer Gemini 1.5 Pro if available, or just Gemini Flash as stable base.

    let responseText = null;

    try {
        // 1. Try Primary (Gemini)
        if (GENAI_API_KEY && (providerOverride === 'auto' || providerOverride === 'google')) {
            responseText = await callGeminiFlash(prompt, system_instruction || "You are a helpful AI.", history, options);
        }
    } catch (error) {
        console.error("❌ routeRequest Primary Fail:", error.message);
    }

    // 2. Fallbacks
    if (!responseText) {
        try {
            if (DEEPSEEK_API_KEY && (providerOverride === 'auto' || providerOverride === 'deepseek')) {
                responseText = await callDeepSeek(prompt, system_instruction, [], options);
            } else if (OPENAI_API_KEY && (providerOverride === 'auto' || providerOverride === 'openai')) {
                responseText = await callOpenAI(prompt, system_instruction, [], options);
            }
        } catch (error) {
            console.error("❌ routeRequest Fallback Fail:", error.message);
        }
    }

    if (!responseText) throw new Error("AI Router failed to generate a response from any provider.");

    return {
        text: responseText,
        source: responseText ? "ai_engine" : "none"
    };
}

// --- Specific AI Implementations ---

async function callGeminiFlash(message, systemPrompt, history, options = {}) {
    if (!GENAI_API_KEY) return null;

    try {
        const genAI = new GoogleGenerativeAI(GENAI_API_KEY);

        // Handle JSON mode if requested (Gemini 1.5 supports it)
        const modelConfig = {
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        };

        if (options.response_format && options.response_format.type === "json_object") {
            modelConfig.generationConfig = { responseMimeType: "application/json" };
        }

        const model = genAI.getGenerativeModel(modelConfig);

        const chat = model.startChat({
            history: formatHistoryForGemini(history),
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: options.temperature !== undefined ? options.temperature : 0.7,
            }
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (err) {
        console.error("❌ Gemini API Error:", err.message);
        throw err;
    }
}

async function callOpenAI(message, systemPrompt, history, options = {}) {
    if (!OPENAI_API_KEY) return null;

    const messages = [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: "user", content: message }
    ];

    const payload = {
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 1000,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
    };

    if (options.response_format) {
        payload.response_format = options.response_format;
    }

    const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 30000
    });

    return res.data.choices[0].message.content;
}

async function callDeepSeek(message, systemPrompt, history, options = {}) {
    if (!DEEPSEEK_API_KEY) return null;

    const payload = {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt || "You are a helpful assistant." },
            ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
            { role: "user", content: message }
        ],
        temperature: options.temperature !== undefined ? options.temperature : 1.0
    };

    if (options.response_format) {
        payload.response_format = options.response_format;
    }

    const res = await axios.post('https://api.deepseek.com/chat/completions', payload, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 30000
    });
    return res.data.choices[0].message.content;
}

// --- Helper: Format History ---
function formatHistoryForGemini(history) {
    if (!history || !Array.isArray(history)) return [];

    let formatted = [];
    let lastRole = null;

    for (const msg of history) {
        if (msg.role === 'system') continue;
        const role = msg.role === 'user' ? 'user' : 'model';

        if (role !== lastRole) {
            formatted.push({
                role: role,
                parts: [{ text: msg.content || "" }]
            });
            lastRole = role;
        }
    }

    if (formatted.length > 0 && formatted[0].role !== 'user') {
        formatted.shift();
    }

    return formatted;
}

/**
 * Cleans Markdown and special characters for TTS engines.
 */
function cleanTextForTTS(text) {
    if (!text) return "";
    return text
        .replace(/[*_~`#]/g, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/\{.*?\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// --- Audio Generation ---
async function generateAudio(text, voiceId = "gemini_standard") {
    return null; // Logic handled in index.js
}

module.exports = { generateResponse, routeRequest, generateAudio, PERSONAS, cleanTextForTTS };

