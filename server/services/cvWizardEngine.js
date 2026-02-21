const aiRouter = require('./aiRouter');

/**
 * CVWizardEngine: Motor de orquestación por pasos para el constructor de CV.
 * Implementa la lógica de "Pipeline" separando extracción, análisis de brecha y redacción.
 */
class CVWizardEngine {
    constructor() {
        this.router = aiRouter;
    }

    async processWizardStep(step, data) {
        console.log(`🚀 [CV-WIZARD] Procesando Paso ${step}...`);
        switch (parseInt(step)) {
            case 1:
                return await this.analyzeJobDescription(data);
            case 2:
                return await this.detectGap(data);
            case 3:
                return await this.extractRawExperience(data);
            case 4:
                return await this.buildImpactStatements(data);
            case 5:
                return await this.generateFinalPerformanceCV(data);
            default:
                throw new Error("Paso del Wizard no válido");
        }
    }

    // STEP 1: ADN de la Vacante
    async analyzeJobDescription(data) {
        const { jobDescription } = data;
        const prompt = `
        Actúa como un Headhunter Senior. Analiza esta Job Description (JD) y extrae su ADN técnico y cultural.
        
        JD: "${jobDescription.slice(0, 4000)}"
        
        Devuelve un JSON con esta estructura:
        {
            "detectedRole": "Título profesional exacto",
            "seniorityLevel": "Junior/Mid/Senior/Lead",
            "criticalSkills": ["Top 5 skills técnicas"],
            "softSkills": ["Top 3 habilidades humanas"],
            "redFlags": ["Cosas que el candidato NO debe decir/hacer para este puesto"],
            "idealPersona": "Descripción breve del candidato perfecto para este jefe"
        }
        `;
        const res = await this.router.routeRequest({ prompt, complexity: 'medium' });
        return this._safeParse(res.text);
    }

    // STEP 2: Detección de Brecha (The Gap)
    async detectGap(data) {
        const { currentProfile, jdAnalysis } = data;
        const prompt = `
        Compara el perfil del usuario con los requisitos de la vacante.
        
        PERFIL ACTUAL: ${JSON.stringify(currentProfile)}
        REQUISITOS VACANTE: ${JSON.stringify(jdAnalysis)}
        
        Identifica las brechas críticas que impedirían la contratación y los superpoderes que lo destacan.
        Devuelve JSON:
        {
            "gapAnalysis": "Explicación de lo que falta para llegar al nivel exigido",
            "superpower": "La ventaja injusta de este candidato",
            "matchScore": 0-100,
            "tacticalAdvice": "Consejo breve para 'vender' las debilidades como oportunidades"
        }
        `;
        const res = await this.router.routeRequest({ prompt, complexity: 'medium' });
        return this._safeParse(res.text);
    }

    // STEP 3: Extracción de Experiencia Cruda
    async extractRawExperience(data) {
        const { rawExperienceText } = data;
        const prompt = `
        Convierte este relato informal de experiencia en una estructura profesional organizada.
        NO me des bullets de CV aún. Solo organiza los hechos.
        
        INPUT: "${rawExperienceText}"
        
        Devuelve JSON:
        {
            "experiences": [
                { "company": "", "role": "", "duration": "", "mainTasks": [] }
            ]
        }
        `;
        const res = await this.router.routeRequest({ prompt, complexity: 'medium' });
        return this._safeParse(res.text);
    }

    // STEP 4: Construcción de Logros (Impact Statements)
    async buildImpactStatements(data) {
        const { structuredExperience, accomplishments } = data;
        const prompt = `
        Transforma las tareas y logros del usuario en Impact Statements usando la metodología STAR/Metric-First.
        
        EXPERIENCIA: ${JSON.stringify(structuredExperience)}
        LOGROS VERBALIZADOS: ${JSON.stringify(accomplishments)}
        
        Cada logro debe comenzar con un Verbo de Acción fuerte y contener, si es posible, una métrica implícita o explícita.
        Devuelve JSON:
        {
            "impactExperiences": [
                { "role": "", "company": "", "bullets": ["Logro 1 con métrica", "Logro 2 con impacto"] }
            ]
        }
        `;
        const res = await this.router.routeRequest({ prompt, complexity: 'hard' });
        return this._safeParse(res.text);
    }

    // STEP 5: Generación de CV Final de Alto Rendimiento
    async generateFinalPerformanceCV(data) {
        const { fullData } = data;
        const prompt = `
        Actúa como un Redactor de CVs para cargos de alto nivel.
        Genera la versión final del CV optimizada para ATS y humanos.
        
        DATA: ${JSON.stringify(fullData)}
        
        Devuelve JSON:
        {
            "summary": "Perfil profesional de alto impacto",
            "experience": [],
            "skills": { "technical": [], "behavioral": [] },
            "atsOptimizationNote": "Por qué este CV pasará los filtros"
        }
        `;
        const res = await this.router.routeRequest({ prompt, complexity: 'hard' });
        return this._safeParse(res.text);
    }

    _safeParse(text) {
        try {
            const clean = text.replace(/```json\n?|```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            console.error("Failed to parse AI JSON:", text);
            return { error: "Parse failed", raw: text };
        }
    }
}

module.exports = new CVWizardEngine();
