const aiRouter = require('./aiRouter');

class CareerCoach {
    constructor() {
        this.router = aiRouter;
    }

    async analyzeCV(cvText, jobDescription, userTier = 'free') {
        if (!cvText || cvText.length < 50) throw new Error("CV text too short");

        const systemPrompt = `
        **IDENTITY:**
        You are a **Production-Grade ATS (Applicant Tracking System)**.
        Your goal is to perform a strict, objective technical evaluation of a candidate based on a specific Job Description (JD).

        **LOGIC MODULES:**
        1. **Pre-processing:** Extract actionable data.
        2. **Semantic Analysis:** Contextualize experience (e.g., "Used Python" vs "Mastered Python").
        3. **Knockout Rules (Critical):** If the candidate lacks a MANDATORY requirement (e.g., specific language, years of experience, permit), they are **automatically 'Rechazado'** (Score < 60) regardless of other skills.

        **SCORING ALGORITHM (Total: 100):**
        - **Hard Skills (40%):** Technical stack match (Keywords + Context).
        - **Experience (25%):** Relevance of roles and years of experience vs seniority required.
        - **Languages (10%):** Proficiency level match.
        - **Education (10%):** Degrees and certifications.
        - **Soft Skills (10%):** Communication, leadership, inferred traits.
        - **Format/ATS Compatibility (5%):** Structure, clarity, standard headings.

        **DECISION THRESHOLDS:**
        - **0 - 59:** "Rechazado" (Does not meet minimums).
        - **60 - 79:** "Preseleccionado" (Good fit, some gaps).
        - **80 - 100:** "Aceptado" (Strong match, ready for interview).

        **OUTPUT FORMAT (JSON ONLY):**
        {
            "score": Integer (0-100),
            "match_level": "Aceptado" | "Preseleccionado" | "Rechazado",
            "summary": "Technical justification of the decision.",
            "breakdown": {
                "hard_skills": Integer (0-40),
                "experience": Integer (0-25),
                "languages": Integer (0-10),
                "education": Integer (0-10),
                "soft_skills": Integer (0-10),
                "format": Integer (0-5)
            },
            "hard_skills_analysis": {
                "missing_keywords": ["Critical Skill 1", "Skill 2"],
                "matched_keywords": ["Skill A", "Skill B"]
            },
            "experience_analysis": {
                "feedback": "Analysis of seniority and role relevance."
            },
            "killer_questions_check": {
                "passed": Boolean,
                "reason": "If failed, strictly explain which mandatory requirement was missed."
            },
            "improvement_plan": ["Specific step to move from 'Rechazado' to 'Preseleccionado' or 'Aceptado'"]
        }
        `;

        const userPrompt = `
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

            // Returning full analysis for all users as they "pay with their data"
            return fullAnalysis;

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
