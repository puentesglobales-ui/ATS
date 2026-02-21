const aiRouter = require('./aiRouter');

class CareerCoach {
    constructor() {
        this.router = aiRouter;
    }

    async analyzeCV(cvText, jobDescription, userTier = 'free', language = 'es') {
        if (!cvText || cvText.length < 50) throw new Error("CV text too short");

        const isEsp = language === 'es';

        const systemPrompt = isEsp ? `
        **IDENTIDAD:**
        Eres un **ATS (Sistema de Seguimiento de Candidatos)**. Realiza una evaluación técnica estricta.

        **SCORING:**
        - Hard Skills (40%), Experiencia (25%), Idiomas (10%), Educación (10%), Soft (10%), Formato (5%).

        **UMBRALES:**
        0-59: Rechazado | 60-79: Preseleccionado | 80-100: Aceptado.

        **IMPORTANTE:** Tu análisis, sumario y plan de mejora deben estar 100% en ESPAÑOL.

        **SALIDA (JSON ÚNICAMENTE):**
        {
            "score": Integer,
            "match_level": "Aceptado" | "Preseleccionado" | "Rechazado",
            "summary": "Justificación técnica en ESPAÑOL.",
            "hard_skills_analysis": { "missing_keywords": [], "matched_keywords": [] },
            "improvement_plan": ["Paso 1 en ESPAÑOL", "Paso 2..."]
        }
        ` : `
        **IDENTITY:**
        You are a **Production-Grade ATS**. Perform a strict evaluation.

        **OUTPUT FORMAT (JSON ONLY):**
        {
            "score": Integer,
            "match_level": "Aceptado" | "Preseleccionado" | "Rechazado",
            "summary": "Technical justification.",
            "hard_skills_analysis": { "missing_keywords": [], "matched_keywords": [] },
            "improvement_plan": []
        }
        `;

        const userPrompt = `
        ${isEsp ? "[CRÍTICO: RESPONDE SIEMPRE EN ESPAÑOL. El resumen, las keywords y el plan deben estar en español.]" : ""}
        **JOB DESCRIPTION:**
        ${jobDescription.slice(0, 4000)}

        **CANDIDATE CV:**
        ${cvText.slice(0, 4000)}
        `;

        try {
            // Using aiRouter with new options support
            const response = await this.router.routeRequest({
                prompt: userPrompt,
                complexity: 'hard', // Force High Logic
                providerOverride: 'auto',
                system_instruction: systemPrompt
            }, {
                response_format: { type: "json_object" },
                temperature: 0.2 // Low temp for factual analysis
            });

            // Clean response in case AI included markdown blocks
            const cleanText = response.text.replace(/```json\n?|```/g, '').trim();
            const fullAnalysis = JSON.parse(cleanText);

            // Force score to be a Number
            if (fullAnalysis.score) fullAnalysis.score = Number(fullAnalysis.score);

            // --- FUNNEL LOGIC (Improved for Transparency & Conversion) ---
            // We show the match and the gaps, but emphasize the CALL as the solution.

            const hasGaps = (fullAnalysis.hard_skills_analysis?.missing_keywords || []).length > 0;
            const callCTA = "\n\n💡 RECOMENDACIÓN: Para corregir estas brechas de inmediato, te sugerimos agendar una sesión estratégica gratuita.";

            const funnelResponse = {
                score: fullAnalysis.score,
                match_level: fullAnalysis.score >= 50 ? "Alta Probabilidad" : "Potencial en Desarrollo",
                summary: (fullAnalysis.summary || "Análisis completado.") + (fullAnalysis.score < 85 ? callCTA : ""),

                // Show actual data so the user (and admin) can see the REAL problem
                hard_skills_analysis: {
                    matched_keywords: fullAnalysis.hard_skills_analysis?.matched_keywords || [],
                    missing_keywords: fullAnalysis.hard_skills_analysis?.missing_keywords || [],
                    is_locked: false // No longer locking, as per user feedback
                },

                // The Plan
                improvement_plan: fullAnalysis.improvement_plan || [
                    "🚀 Optimiza tus logros con métricas.",
                    "🎯 Nivela tus keywords con la vacante."
                ],

                cta_url: "https://calendly.com/puentesglobales/agendar",
                cta_type: "SCHEDULE_CALL",
                cta_message: "Haz que este CV sea IRRESTISTIBLE. Agenda tu llamada estratégica ahora."
            };

            if (funnelResponse.score < 80) {
                funnelResponse.improvement_plan.push("📅 Agenda una llamada estratégica gratuita inmediata para resolver el nivel requerido y mejorar tu perfil.");
            }

            return funnelResponse;

        } catch (error) {
            console.error("CareerCoach Analysis Error:", error);
            // Fallback for valid frontend structure if AI fails
            return {
                score: 0,
                match_level: "Error",
                summary: "Analysis failed due to technical issues.",
                hard_skills_analysis: { missing_keywords: [] },
                experience_analysis: {},
                soft_skills_analysis: {},
                formatting_analysis: {},
                red_flags: [],
                improvement_plan: ["Retry analysis"]
            };
        }
    }

    async rewriteCV(cvText) {
        if (!cvText) throw new Error("No CV Text to rewrite");

        const prompt = `
        Role: Expert CV Writer and Career Coach.
        Task: Rewrite weak bullet points in the provided CV using the STAR Method (Situation, Task, Action, Result).
        
        Input CV:
        "${cvText.slice(0, 4000)}"

        Instructions:
        1. Identify the 3-5 weakest or most vague experience bullet points.
        2. Rewrite them to be quantifiable and impact-driven.
        3. Keep the tone professional and executive.

        Output JSON only:
        {
            "improvements": [
                {
                    "original": "Responsible for sales in the region.",
                    "improved": "Spearheaded regional sales strategy, driving a 20% revenue increase YoY."
                },
                ...
            ],
            "general_advice": "Brief summary of changes made."
        }
        `;

        try {
            const response = await this.router.routeRequest({
                prompt: prompt,
                complexity: 'medium',
                system_instruction: "You are a STAR Method CVrewriter. Output JSON only."
            });

            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("CareerCoach Rewrite Error:", error);
            throw new Error("Failed to rewrite CV");
        }
    }

    async generateCV(userData) {
        // userData: { role, market, industry, experienceLevel, ... }
        const { role, market, industry, rawData } = userData;

        const isUSA = market === 'USA';

        const systemPrompt = `
        **IDENTITY:**
        You are an expert Resume Writer & Career Strategist with 15 years of experience in Fortune 500 recruiting.
        
        **OBJECTIVE:**
        Draft a high-impact, professional CV content based on the user's provided data.
        
        **MARKET CONTEXT: ${market || 'Global'}**
        ${isUSA ?
                `REGLAS USA:
            1. Philosophy: "Action + Impact". Do not say what you did, say what you ACHIEVED.
            2. Format: Extreme brevity. Bullet points starting with strong action verbs.
            3. NO PERSONAL DATA: No photo, age, marital status, or religion.
            4. Metrics: Quantify results where possible.`
                :
                `REGLAS EUROPE/LATAM:
            1. Philosophy: "Competence + Responsibility". Show technical solidity and soft skills.
            2. Format: Clear and professional structure.
            3. Personal: Include languages with levels (A1-C2).`
            }

        **OUTPUT FORMAT (JSON ONLY):**
        Return a JSON object that matches this structure exactly:
        {
            "personal": {
                "name": "User Name",
                "email": "email@example.com",
                "phone": "+123...",
                "location": "City, Country",
                "summary": "3-4 lines professional summary following: [Adjetivo] + [Título] + [Exp] + [Logro]"
            },
            "experience": [
                { 
                    "id": 1, 
                    "role": "Job Title", 
                    "company": "Company Name", 
                    "date": "20XX - Present", 
                    "description": "• Bullet point 1 (Action + Impact)\n• Bullet point 2\n• Bullet point 3" 
                }
            ],
            "education": [
                { "id": 1, "degree": "Degree Name", "school": "University Name", "date": "20XX - 20XX" }
            ]
        }
        `;

        const userPrompt = `
        **USER PROFILE:**
        Target Role: ${role}
        Industry: ${industry}
        Raw Input / Context: ${JSON.stringify(rawData || {})}
        
        Please generate the CV content now.
        `;

        try {
            const response = await this.router.routeRequest({
                prompt: userPrompt,
                complexity: 'hard',
                system_instruction: systemPrompt
            }, {
                response_format: { type: "json_object" }
            });

            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);

        } catch (error) {
            console.error("CareerCoach Generate Error:", error);
            // Return fallback structure so frontend doesn't crash
            return {
                personal: { name: "Error Generando", summary: "Hubo un error al conectar con la IA." },
                experience: [],
                education: []
            };
        }
    }
}

module.exports = new CareerCoach();
