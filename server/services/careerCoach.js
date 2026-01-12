const aiRouter = require('./aiRouter');

class CareerCoach {
    constructor() {
        this.router = aiRouter;
    }

    async analyzeCV(cvText, jobDescription) {
        if (!cvText || cvText.length < 50) throw new Error("CV text too short");

        const prompt = `
        Role: Expert ATS Scanner and Recruiter Algorithm.
        Task: Analyze the provided CV against the Job Description.

        Job Description:
        "${jobDescription.slice(0, 5000)}"

        CV Text:
        "${cvText.slice(0, 5000)}"

        Output JSON format only:
        {
            "score": number (0-100),
            "match_level": "High" | "Medium" | "Low",
            "missing_keywords": ["string", "string"],
            "critical_errors": ["string"],
            "feedback_summary": "string (brief explanation)"
        }
        
        Strictly evaluate keyword matching, formatting, and relevance. Be harsh appropriately.
        `;

        try {
            const response = await this.router.routeRequest({
                prompt: prompt,
                complexity: 'medium', // Use DeepSeek/GPT-4o mini for analysis
                providerOverride: 'auto',
                system_instruction: "You are an ATS Scoring Engine. Output only JSON."
            });

            // Attempt to parse JSON from response
            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("CareerCoach Analysis Error:", error);
            throw new Error("Failed to analyze CV");
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
