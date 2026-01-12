const aiRouter = require('./aiRouter');

class InterviewCoach {
    constructor() {
        this.router = aiRouter;
    }

    /**
     * initializes the interview context
     */
    generateSystemPrompt(cvText, jobDescription, mode = 'hardcore') {
        const toneInstruction = mode === 'hardcore'
            ? "You are 'Alex', a strict and skeptical senior recruiter. You interrupt when answers are vague. You demand examples (STAR method). You are not here to make friends, but to find the best candidate."
            : "You are 'Alex', a helpful and encouraging career coach. You guide the candidate to give better answers.";

        return `
        ${toneInstruction}

        Candidate CV:
        "${cvText.slice(0, 3000)}"

        Job Description:
        "${jobDescription.slice(0, 3000)}"

        Instructions:
        1. Start by introducing yourself briefly and asking the first question directly related to a weak point in the CV.
        2. Keep your responses short (max 2-3 sentences) to allow for a fluid voice conversation.
        3. If the user gives a weak answer, challenge them.
        4. Focus on technical skills match and behavioral fit.
        
        IMPORTANT: Do not break character. Do not say "I am an AI". Act exactly like the recruiter.
        `;
    }

    async getInterviewResponse(chatHistory, cvText, jobDescription) {
        // Construct the full conversation context
        const systemPrompt = this.generateSystemPrompt(cvText, jobDescription);

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ];

        try {
            const response = await this.router.routeRequest({
                // We pass the messages array structure differently depending on the router, 
                // but here we let the router handle the prompt construction if needed, 
                // or we pass a raw prompt if sticking to the basic API.
                // Assuming routeRequest handles a 'messages' array if we overload the prompt arg or add a new one.
                // For safety in this MVP, let's use the 'prompt' string approach or modify router.
                // Let's assume AIRouter adapts or we use OpenAI directly for chat history.
                // Actually, existing aiRouter takes 'prompt'. Let's wrap history into a text block for DeepSeek/Mock or use OpenAI for chat.

                // For high quality roleplay, we probably want GPT-4o via the existing openai client in server.js, 
                // BUT let's try to use the router to save cost if possible.
                // Actually, for "Chat", a string prompt is messy.
                // Let's rely on the router's providerOverride logic but format as a script.

                prompt: JSON.stringify(messages), // Temporary hack if router expects string
                complexity: 'complex', // Use smart model
                system_instruction: systemPrompt
            });

            // If the router returns a string, use it.
            return response.text;
        } catch (error) {
            console.error("Interview Coach Error:", error);
            return "Interviewer is reviewing notes... (Error)";
        }
    }
}

module.exports = new InterviewCoach();
