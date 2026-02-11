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

    // 3. The Stress Test (Bad Cop)
    RECRUITER_STRESS: `
    **IDENTITY:** You are "Ms. Victoria", a tough, skeptical, and high-standards Senior Recruiter.
    **GOAL:** Test the candidate's resilience, stress management, and diplomacy under pressure.
    **STYLE:** Cold, challenging, intimidating, sometimes interrupts (simulated).
    **BEHAVIOR:**
    - Challenge every premise: "Why should we hire you and not the other candidate who has more experience?", "Are those gaps in your CV due to being fired?"
    - Use silence or short cutting remarks: "Is that all?", "I'm not convinced."
    - Test if the candidate cracks or stays professional.
    `
};

// --- Main Text Generation Function ---
async function generateResponse(userMessage, personaKeyOrPrompt = 'RECRUITER_ALLY', history = []) {
    let responseText = null;

    // Determine System Prompt
    let systemPrompt = PERSONAS[personaKeyOrPrompt];
    if (!systemPrompt) {
        // Treat as raw prompt if not a known key
        systemPrompt = personaKeyOrPrompt;
    }

    // 1. Try GEMINI 2.0 FLASH (Fastest & Free-tier generous)
    try {
        if (GENAI_API_KEY) {
            responseText = await callGeminiFlash(userMessage, systemPrompt, history);
        }
    } catch (error) {
        console.error("❌ Gemini Flash Error:", error.message);
    }

    // 2. Fallback: DeepSeek (Cost effective) or ChatGPT (Reliable)
    if (!responseText) {
        console.log("⚠️ Falling back to Secondary AI Provider...");
        try {
            // Try DeepSeek if key exists, otherwise OpenAI
            if (DEEPSEEK_API_KEY) {
                responseText = await callDeepSeek(userMessage, systemPrompt, history);
            } else if (OPENAI_API_KEY) {
                responseText = await callOpenAI(userMessage, systemPrompt, history);
            }
        } catch (error) {
            console.error("❌ Secondary AI Error:", error.message);
        }
    }

    return responseText || "I'm having trouble connecting. Could you repeat that?";
}

// --- Specific AI Implementations ---

async function callGeminiFlash(message, systemPrompt, history) {
    const genAI = new GoogleGenerativeAI(GENAI_API_KEY);
    // Use systemInstruction for better persona adherence
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt
    });

    const chat = model.startChat({
        history: formatHistoryForGemini(history),
        generationConfig: {
            maxOutputTokens: 1000, // Increased for interview feedback
            temperature: 0.7,
        }
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
}

async function callOpenAI(message, systemPrompt, history) {
    const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: "user", content: message }
    ];

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini", // Cost effective
        messages: messages,
        max_tokens: 500
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
    });

    return res.data.choices[0].message.content;
}

async function callDeepSeek(message, systemPrompt, history) {
    const res = await axios.post('https://api.deepseek.com/chat/completions', {
        model: "deepseek-chat",
        messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ]
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
    });
    return res.data.choices[0].message.content;
}

// --- Helper: Format History ---
function formatHistoryForGemini(history) {
    let formatted = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
    }));
    return formatted;
}

// --- Audio Generation ---
async function generateAudio(text, voiceId = "gemini_standard") {
    // Placeholder - Logic handled in index.js currently
    if (ELEVENLABS_API_KEY) {
        return null; // Force fallback to index.js logic
    }
    return null;
}

module.exports = { generateResponse, generateAudio, PERSONAS };
