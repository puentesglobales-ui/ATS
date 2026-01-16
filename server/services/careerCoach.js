const aiRouter = require('./aiRouter');

class CareerCoach {
    constructor() {
        this.router = aiRouter;
    }

    async analyzeCV(cvText, jobDescription, userTier = 'free') {
        if (!cvText || cvText.length < 50) throw new Error("CV text too short");

        const systemPrompt = `
        **IDENTITY:**
        You are a **Senior Technical Recruiter & ATS Algorithm** at a top-tier Global Firm. 
        You are cynical, fact-focused, and immune to "fluff". Your job is to FILTER OUT candidates who don't match the job description perfectly.

        **SCORING MATRIX (Total: 100):**
        - **Hard Skills (40%):** Exact keyword matches from JD to CV.
        - **Experience Impact (30%):** quantifiable achievements (numbers, $, %) vs generic duties.
        - **Communication/Soft Skills (20%):** Clarity, structure, language levels (CEFR).
        - **Format/Professionalism (10%):** Structure, length, typo-free.

        **NEGATIVE SCORING (PENALTIES):**
        - "-5 points" for every vague cliché (e.g., "motivated team player", "hard worker").
        - "-10 points" for missing a MUST-HAVE technical skill from the JD.
        - "-5 points" for spelling errors.

        **TASK:**
        User will provide a CV and a Job Description. 
        Analyze them ruthlessly. 
        Calculate the match score based on the Matrix above.

        **OUTPUT FORMAT (JSON ONLY):**
        {
            "score": Integer (0-100),
            "match_level": "High (80+)" | "Medium (50-79)" | "Low (<50)",
            "summary": "2-sentence executive summary for the Hiring Manager.",
            "hard_skills_analysis": {
                "score": Integer (0-40),
                "missing_keywords": ["string", "string"],
                "matched_keywords": ["string", "string"]
            },
            "experience_analysis": {
                "score": Integer (0-30),
                "feedback": "string (e.g., 'Too many generic duties, lacks metrics.')"
            },
            "soft_skills_analysis": {
                "score": Integer (0-20),
                "feedback": "string"
            },
            "formatting_analysis": {
                "score": Integer (0-10),
                "issues": ["string"]
            },
            "red_flags": ["string (e.g., 'Gap in employment', 'Spelling errors')"],
            "improvement_plan": ["Actionable step 1", "Actionable step 2"]
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

            const fullAnalysis = JSON.parse(response.text);

            // --- FREEMIUM LOGIC: CENSORSHIP ---
            if (userTier === 'free') {
                return {
                    score: fullAnalysis.score,
                    match_level: fullAnalysis.match_level,
                    summary: fullAnalysis.summary, // Hook: They see the summary

                    // PARTIAL FEEDBACK (Hook)
                    hard_skills_analysis: {
                        score: fullAnalysis.hard_skills_analysis?.score,
                        // Show only 2 missing keywords as teaser
                        missing_keywords: fullAnalysis.hard_skills_analysis?.missing_keywords?.slice(0, 2) || [],
                        total_missing: fullAnalysis.hard_skills_analysis?.missing_keywords?.length || 0,
                        is_locked: true
                    },

                    // LOCKED SECTIONS
                    experience_analysis: {
                        score: fullAnalysis.experience_analysis?.score,
                        feedback: "🔒 Upgrade to PRO to see detailed experience analysis.",
                        is_locked: true
                    },
                    soft_skills_analysis: {
                        score: fullAnalysis.soft_skills_analysis?.score,
                        feedback: "🔒 Upgrade to PRO to see soft skills feedback.",
                        is_locked: true
                    },
                    formatting_analysis: {
                        score: fullAnalysis.formatting_analysis?.score,
                        issues: ["🔒 Upgrade to unlock formatting audit."],
                        is_locked: true
                    },
                    red_flags: fullAnalysis.red_flags?.slice(0, 1) || [], // Show 1 red flag only
                    improvement_plan: ["🔒 Unlock the full Action Plan with PRO."]
                };
            }

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
}

module.exports = new CareerCoach();
