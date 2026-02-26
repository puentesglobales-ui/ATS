/**
 * =====================================================================
 * 🧠 AI ROUTER v2.0 — Career Mastery Engine
 * 
 * Orchestrates AI calls with INTELLIGENT routing:
 * - Gemini 1.5 Flash (Primary — FREE)
 * - Claude 3.5 Sonnet (Deep reasoning — MEDIUM COST)
 * - DeepSeek Chat (Fallback — LOW COST)
 * - GPT-4o-mini (Final guarantee — PAID)
 * 
 * Features:
 * - Phase-aware routing (different models for different interview phases)
 * - Timeout + retry per provider
 * - Automatic fallback chain
 * - Provider usage logging
 * =====================================================================
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();

// ─── CONFIGURATION ───────────────────────────────────────────────────

const GENAI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Startup checks
if (!GENAI_API_KEY) console.warn("⚠️ WARNING: GEMINI_API_KEY is missing.");
if (!ANTHROPIC_API_KEY) console.warn("⚠️ WARNING: ANTHROPIC_API_KEY is missing. Claude fallback disabled.");
if (!DEEPSEEK_API_KEY) console.warn("⚠️ WARNING: DEEPSEEK_API_KEY is missing. DeepSeek fallback disabled.");
if (!OPENAI_API_KEY) console.warn("⚠️ WARNING: OPENAI_API_KEY is missing. OpenAI fallback disabled.");

// ─── PROVIDER CONFIG ─────────────────────────────────────────────────

const PROVIDER_CONFIG = {
    gemini: { timeout: 15000, retries: 1, cost_tier: 'FREE', model: 'gemini-1.5-flash' },
    claude: { timeout: 20000, retries: 1, cost_tier: 'MEDIUM', model: 'claude-3-5-sonnet-20241022' },
    deepseek: { timeout: 15000, retries: 0, cost_tier: 'LOW', model: 'deepseek-chat' },
    openai: { timeout: 20000, retries: 0, cost_tier: 'PAID', model: 'gpt-4o-mini' }
};

// ─── PHASE-AWARE ROUTING ─────────────────────────────────────────────
// Uses Claude for phases requiring deeper reasoning

const PHASE_ROUTING = {
    'ICEBREAKER': 'gemini',   // Fast, free, sufficient for rapport
    'CV_DEEP_DIVE': 'gemini',   // Fast analysis, free tier
    'SITUATIONAL': 'claude',   // Best reasoning for STAR analysis
    'PRESSURE': 'claude',   // Best tone control under stress mode
    'CLOSING': 'claude',   // Best summary and report generation
    'FINAL_REPORT': 'claude',   // Extended analysis
    'DEFAULT': 'gemini'    // Default for unspecified phases
};

// Fallback chain order
const FALLBACK_CHAIN = ['gemini', 'claude', 'deepseek', 'openai'];

// ─── PERSONAS ────────────────────────────────────────────────────────
// Kept for backward compatibility with other services that import PERSONAS

const PERSONAS = {
    RECRUITER_ALLY: `
    **IDENTITY:** You are "Alex", a friendly and supportive Career Coach acting as a Recruiter.
    **GOAL:** Build the candidate's confidence while correcting technical mistakes and improving answer structure.
    **STYLE:** Empathic, patient, educational.
    **BEHAVIOR:**
    - Ask standard HR questions (Tell me about yourself, Strengths/Weaknesses).
    - After EVERY user response, provide immediate, kind feedback.
    - Validate emotions: "I understand you might be nervous, take your time."
    `,

    RECRUITER_ALLY_ES: `
    **IDENTIDAD:** Eres "Alex", un Career Coach amable y cercano actuando como Reclutador.
    **OBJETIVO:** Generar confianza en el candidato mientras corriges errores técnicos y mejoras la estructura de sus respuestas.
    **ESTILO:** Empático, paciente, educativo.
    **COMPORTAMIENTO:**
    - Haz preguntas estándar de RRHH (Háblame de ti, Fortalezas/Debilidades).
    - Después de CADA respuesta, da feedback inmediato y amable.
    - Valida emociones: "Entiendo que puedas estar nervioso, tómate tu tiempo."
    `,

    RECRUITER_TECHNICAL: `
    **IDENTITY:** You are "Eng. Marcus", a Senior Technical Lead and Subject Matter Expert.
    **GOAL:** Validate specific hard skills and technical depth for the role.
    **STYLE:** Direct, analytical, data-focused, no-nonsense.
    **BEHAVIOR:**
    - Analyze the CV deeply and ask specific technical questions.
    - Focus on technical precision and logic.
    - Drill down immediately: "Give me a concrete example with metrics."
    `,

    RECRUITER_TECHNICAL_ES: `
    **IDENTIDAD:** Eres el "Ing. Marcus", un Lead Técnico Senior y experto en la materia.
    **OBJETIVO:** Validar habilidades técnicas específicas y profundidad técnica para el puesto.
    **ESTILO:** Directo, analítico, enfocado en datos, serio.
    **COMPORTAMIENTO:**
    - Analiza el CV profundamente y haz preguntas técnicas específicas.
    - Ignora errores gramaticales menores; enfócate en la precisión técnica y lógica.
    - Si una respuesta es vaga, profundiza de inmediato: "Dame un ejemplo concreto con métricas."
    `,

    RECRUITER_STRESS: `
    **IDENTITY:** You are "Ms. Victoria", a tough, skeptical, and high-standards Senior Recruiter.
    **GOAL:** Test the candidate's resilience, stress management, and diplomacy under pressure.
    **STYLE:** Cold, challenging, intimidating, sometimes interrupts (simulated).
    **BEHAVIOR:**
    - Challenge every premise.
    - Use silence or short cutting remarks: "Is that all?", "I'm not convinced."
    - Test if the candidate cracks or stays professional.
    `,

    RECRUITER_STRESS_ES: `
    **IDENTIDAD:** Eres la "Sra. Victoria", una reclutadora senior dura, escéptica y de altos estándares.
    **OBJETIVO:** Evaluar la resiliencia del candidato, su manejo del estrés y su diplomacia bajo presión.
    **ESTILO:** Frío, desafiante, intimidante, a veces interrumpe.
    **COMPORTAMIENTO:**
    - Cuestiona cada premisa.
    - Usa silencios o comentarios cortantes: "¿Eso es todo?", "No me convence".
    - Evalúa si el candidato pierde los papeles o se mantiene profesional.
    `,

    LANGUAGE_RULE: (lang) => {
        const isEsp = lang.toLowerCase() === 'es';
        return isEsp
            ? `**REGLA CRÍTICA DE IDIOMA:** DEBES realizar toda la entrevista exclusivamente en **ESPAÑOL**. No uses inglés bajo ninguna circunstancia.`
            : `**CRITICAL LANGUAGE RULE:** You MUST conduct the entire interview in **${lang.toUpperCase()}**. Do not switch languages.`;
    }
};

// ─── MAIN FUNCTION: generateResponse ─────────────────────────────────

/**
 * generateResponse: Standard chat response with optional phase-aware routing.
 * 
 * @param {string} userMessage - The user's message
 * @param {string} personaKeyOrPrompt - A PERSONAS key or a full system prompt string
 * @param {Array} history - Chat history array [{role, content}, ...]
 * @param {string} phase - Interview phase for intelligent routing (optional)
 * @returns {string} - AI response text
 */
async function generateResponse(userMessage, personaKeyOrPrompt = 'RECRUITER_ALLY', history = [], phase = 'DEFAULT') {
    let systemPrompt = PERSONAS[personaKeyOrPrompt] || personaKeyOrPrompt;
    try {
        const result = await routeRequest({
            prompt: userMessage,
            system_instruction: systemPrompt,
            history: history,
            phase: phase
        });
        return result.text;
    } catch (error) {
        console.error("❌ generateResponse failed:", error.message);
        return "I'm having trouble connecting. Could you repeat that?";
    }
}

// ─── CORE ROUTER ─────────────────────────────────────────────────────

/**
 * routeRequest: Intelligent routing with phase awareness and fallback chain.
 */
async function routeRequest(config = {}, options = {}) {
    const {
        prompt,
        system_instruction = null,
        providerOverride = 'auto',
        history = [],
        phase = 'DEFAULT'
    } = config;

    // Determine primary provider based on phase or override
    let primaryProvider = providerOverride !== 'auto'
        ? providerOverride
        : (PHASE_ROUTING[phase] || PHASE_ROUTING['DEFAULT']);

    // Build provider chain: primary first, then fallbacks (excluding primary)
    const providerChain = [primaryProvider, ...FALLBACK_CHAIN.filter(p => p !== primaryProvider)];

    let responseText = null;
    let providerUsed = null;

    for (const provider of providerChain) {
        if (responseText) break;

        const config_p = PROVIDER_CONFIG[provider];
        const maxAttempts = 1 + (config_p.retries || 0);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const startTime = Date.now();

                switch (provider) {
                    case 'gemini':
                        if (!GENAI_API_KEY) continue;
                        responseText = await callGeminiFlash(prompt, system_instruction, history, options);
                        break;
                    case 'claude':
                        if (!ANTHROPIC_API_KEY) continue;
                        responseText = await callClaude(prompt, system_instruction, history, options);
                        break;
                    case 'deepseek':
                        if (!DEEPSEEK_API_KEY) continue;
                        responseText = await callDeepSeek(prompt, system_instruction, history, options);
                        break;
                    case 'openai':
                        if (!OPENAI_API_KEY) continue;
                        responseText = await callOpenAI(prompt, system_instruction, history, options);
                        break;
                }

                if (responseText) {
                    const elapsed = Date.now() - startTime;
                    providerUsed = provider;
                    console.log(`🧠 Cerebro: ${provider} (${config_p.model}) | ${config_p.cost_tier} | ${elapsed}ms | Phase: ${phase}`);
                    break;
                }
            } catch (error) {
                console.error(`❌ ${provider} attempt ${attempt}/${maxAttempts} failed:`, error.message);
                if (attempt < maxAttempts) {
                    console.log(`🔄 Retrying ${provider}...`);
                    await sleep(500); // Brief pause before retry
                }
            }
        }
    }

    if (!responseText) {
        throw new Error("AI Router: All providers failed to generate a response.");
    }

    return {
        text: responseText,
        provider: providerUsed,
        cost_tier: PROVIDER_CONFIG[providerUsed]?.cost_tier || 'UNKNOWN',
        source: "ai_engine"
    };
}

// ─── PROVIDER IMPLEMENTATIONS ────────────────────────────────────────

async function callGeminiFlash(message, systemPrompt, history, options = {}) {
    if (!GENAI_API_KEY) return null;

    try {
        const genAI = new GoogleGenerativeAI(GENAI_API_KEY);
        const modelConfig = {
            model: PROVIDER_CONFIG.gemini.model,
            systemInstruction: systemPrompt || "You are a helpful AI."
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

        const result = await Promise.race([
            chat.sendMessage(message),
            timeoutPromise(PROVIDER_CONFIG.gemini.timeout, 'Gemini')
        ]);

        const response = await result.response;
        return response.text();
    } catch (err) {
        console.error("❌ Gemini API Error:", err.message);
        throw err;
    }
}

async function callClaude(message, systemPrompt, history, options = {}) {
    if (!ANTHROPIC_API_KEY) return null;

    try {
        // Build messages array (Claude format)
        const messages = [];

        // Add history (exclude system messages — Claude uses separate system param)
        for (const msg of history) {
            if (msg.role === 'system') continue;
            messages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }

        // Add current user message
        messages.push({ role: 'user', content: message });

        // Ensure messages alternate and start with 'user'
        const cleanMessages = cleanMessagesForClaude(messages);

        const payload = {
            model: PROVIDER_CONFIG.claude.model,
            max_tokens: 2048,
            system: systemPrompt || "You are a helpful AI assistant.",
            messages: cleanMessages
        };

        if (options.temperature !== undefined) {
            payload.temperature = options.temperature;
        }

        const response = await Promise.race([
            axios.post('https://api.anthropic.com/v1/messages', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            }),
            timeoutPromise(PROVIDER_CONFIG.claude.timeout, 'Claude')
        ]);

        return response.data.content[0].text;
    } catch (err) {
        console.error("❌ Claude API Error:", err.response?.data?.error?.message || err.message);
        throw err;
    }
}

async function callOpenAI(message, systemPrompt, history, options = {}) {
    if (!OPENAI_API_KEY) return null;

    const messages = [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        ...history.filter(m => m.role !== 'system').map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.content
        })),
        { role: "user", content: message }
    ];

    const payload = {
        model: PROVIDER_CONFIG.openai.model,
        messages: messages,
        max_tokens: 1000,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
    };

    if (options.response_format) {
        payload.response_format = options.response_format;
    }

    try {
        const res = await Promise.race([
            axios.post('https://api.openai.com/v1/chat/completions', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }),
            timeoutPromise(PROVIDER_CONFIG.openai.timeout, 'OpenAI')
        ]);

        return res.data.choices[0].message.content;
    } catch (err) {
        console.error("❌ OpenAI API Error:", err.message);
        throw err;
    }
}

async function callDeepSeek(message, systemPrompt, history, options = {}) {
    if (!DEEPSEEK_API_KEY) return null;

    const payload = {
        model: PROVIDER_CONFIG.deepseek.model,
        messages: [
            { role: "system", content: systemPrompt || "You are a helpful assistant." },
            ...history.filter(m => m.role !== 'system').map(h => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.content
            })),
            { role: "user", content: message }
        ],
        temperature: options.temperature !== undefined ? options.temperature : 1.0
    };

    if (options.response_format) {
        payload.response_format = options.response_format;
    }

    try {
        const res = await Promise.race([
            axios.post('https://api.deepseek.com/chat/completions', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                }
            }),
            timeoutPromise(PROVIDER_CONFIG.deepseek.timeout, 'DeepSeek')
        ]);

        return res.data.choices[0].message.content;
    } catch (err) {
        console.error("❌ DeepSeek API Error:", err.message);
        throw err;
    }
}

// ─── HELPERS ─────────────────────────────────────────────────────────

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

    // Gemini requires first message to be 'user'
    if (formatted.length > 0 && formatted[0].role !== 'user') {
        formatted.shift();
    }

    return formatted;
}

/**
 * Claude requires messages to alternate user/assistant and start with user.
 */
function cleanMessagesForClaude(messages) {
    if (!messages || messages.length === 0) return [{ role: 'user', content: 'Hello' }];

    const cleaned = [];
    let lastRole = null;

    for (const msg of messages) {
        if (msg.role === lastRole) {
            // Merge consecutive same-role messages
            cleaned[cleaned.length - 1].content += '\n' + msg.content;
        } else {
            cleaned.push({ ...msg });
            lastRole = msg.role;
        }
    }

    // Ensure starts with 'user'
    if (cleaned.length > 0 && cleaned[0].role !== 'user') {
        cleaned.unshift({ role: 'user', content: '[Session start]' });
    }

    return cleaned;
}

function timeoutPromise(ms, providerName) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${providerName} timeout after ${ms}ms`)), ms);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// ─── AUDIO (Placeholder — handled in index.js) ──────────────────────

async function generateAudio(text, voiceId = "gemini_standard") {
    return null;
}

// ─── EXPORT ──────────────────────────────────────────────────────────

module.exports = {
    generateResponse,
    routeRequest,
    generateAudio,
    PERSONAS,
    cleanTextForTTS,
    PROVIDER_CONFIG,
    PHASE_ROUTING,
    FALLBACK_CHAIN
};
