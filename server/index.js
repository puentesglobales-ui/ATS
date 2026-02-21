const express = require('express');
const cors = require('cors');
require('dotenv').config();

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const cvService = require('./services/cvService');
const atsService = require('./services/atsService');
const cvWizardEngine = require('./services/cvWizardEngine');
const puentesGlobales = require('./services/puentesGlobalesService');
const { normalizeCV } = require('./services/cvNormalizer');

// Configure Multer for temp storage
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir + '/' });

// Helper: Delete file
const cleanup = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
  } catch (e) { console.error('Cleanup error:', e); }
};

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseAdmin = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const OpenAI = require('openai');
// Fix 401: Trim API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '',
});

app.use(express.urlencoded({ extended: true }));

// WhatsApp module removed for Career Mastery MVP
// const whatsapp = require('./whatsapp');
// app.use('/api/whatsapp', whatsapp);Router);

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    server: 'mvp-idiomas-server',
    checks: {
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      supabase_url: !!process.env.SUPABASE_URL
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => res.send('OK'));
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MVP Idiomas AI Server Running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-config', (req, res) => {
  res.json({
    has_openai: !!process.env.OPENAI_API_KEY,
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_anon_key: !!process.env.SUPABASE_ANON_KEY,
    supabase_admin_ready: !!supabaseAdmin,
    env_port: process.env.PORT
  });
});

app.get('/api/debug/keys', async (req, res) => {
  const results = {
    openai: 'PENDING',
    elevenlabs: 'PENDING'
  };

  // 1. Test OpenAI
  const openaiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';
  const openaiKeyHint = openaiKey ? `${openaiKey.substring(0, 4)}...` : 'MISSING';

  try {
    await openai.models.list();
    results.openai = `OK (Key: ${openaiKeyHint})`;
  } catch (e) {
    results.openai = `FAIL: ${e.response ? e.response.status : e.message} (Key: ${openaiKeyHint})`;
  }

  // 2. Test ElevenLabs (Real generation attempt)
  const elevenKey = process.env.ELEVENLABS_KEY_NEW
    ? process.env.ELEVENLABS_KEY_NEW.trim()
    : (process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : '');
  const elevenKeyHint = elevenKey ? `${elevenKey.substring(0, 4)}...` : 'MISSING';
  const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel

  try {
    const ttsResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: "System check okay.",
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      {
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    results.elevenlabs = `OK (Key: ${elevenKeyHint}) - Audio Generated (${ttsResponse.data.length} bytes)`;
  } catch (e) {
    const errorDetail = e.response && e.response.data ? Buffer.from(e.response.data).toString() : e.message;
    results.elevenlabs = `FAIL: ${e.response ? e.response.status : 'ERR'} (Key: ${elevenKeyHint}) - Detail: ${errorDetail}`;
  }

  res.json(results);
});

app.get('/api/admin/users', async (req, res) => {
  if (!supabaseAdmin) return res.status(500).json({ error: 'DB not connected' });

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .from('profiles')
      .select('id, email, goal, level, usage_count, is_premium, created_at, last_active, ats_score, ats_status, role_title')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 for performance

    if (error) throw error;

    // Transform for frontend
    const users = data.map(u => ({
      id: u.id,
      email: u.email || 'No Email',
      role_title: u.role_title || 'N/A', // New Field
      progress: `Score: ${u.ats_score || 0} (${u.ats_status || 'PENDING'})`,
      type: u.is_premium ? 'Premium' : 'Free',
      usage: u.usage_count,
      last_active: u.last_active ? new Date(u.last_active).toLocaleDateString() : 'N/A'
    }));

    res.json(users);
  } catch (err) {
    console.error('Admin Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin Config Endpoint (For Provider Switcher)
const { generateResponse, generateAudio, PERSONAS, cleanTextForTTS } = require('./services/aiRouter'); // Ensure this is singleton
const aiRouter = { override: null, abRatio: 0.5, setOverride: (v) => { aiRouter.override = v; } }; // Placeholder for stats logic if missing
app.get('/api/admin/config', (req, res) => {
  res.json({
    force_provider: aiRouter.override || 'auto',
    ab_ratio: aiRouter.abRatio
  });
});

app.post('/api/admin/config', (req, res) => {
  const { provider } = req.body;
  // provider: 'premium' | 'challenger' | 'auto' (null)
  const overrideVal = provider === 'auto' ? null : provider;

  if (provider) {
    aiRouter.setOverride(overrideVal);
    res.json({ success: true, message: `Provider forced to ${overrideVal || 'AUTO'}` });
  } else {
    res.status(400).json({ error: 'Missing provider' });
  }
});

// const scenarios = require('./scenarios');

const getSystemMessage = (scenarioId) => {
  // Placeholder for ATS mode
  return { role: 'system', content: "You are an AI assistant." };
};

const { getPlanConfig } = require('./services/profileRules');

const checkUsage = async (userId, usageType = 'general') => {
  if (!userId || !supabaseAdmin) return { allowed: true };
  try {
    let { data: profile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('usage_count, is_premium, role, email, credits_ats, credits_roleplay')
      .eq('id', userId)
      .single();

    if (!profile && (!selectError || selectError.code === 'PGRST116')) {
      console.log('⚠️ Profile missing. Creating default profile...');
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert([{ id: userId, usage_count: 0, is_premium: false, credits_ats: 1, credits_roleplay: 20 }])
        .select()
        .single();
      if (createError) {
        console.error('Error creating profile:', createError);
        return { allowed: false, error: 'User profile error' };
      }
      profile = newProfile;
    }

    if (profile) {
      // 1. Super Admin / Premium Bypass
      if (profile.role === 'admin' || profile.email === 'visasytrabajos@gmail.com' || profile.is_premium) {
        return { allowed: true };
      }

      // 2. Specific Credit Check
      let hasCredit = false;
      let limitMsg = '';

      if (usageType === 'ats') {
        hasCredit = (profile.credits_ats || 0) > 0;
        limitMsg = 'Ya has probado nuestras herramientas de CV. Si quieres más, agenda una llamada.';
      } else if (usageType === 'roleplay') {
        hasCredit = (profile.credits_roleplay || 0) > 0;
        limitMsg = 'Ya has probado nuestro simulador de entrevistas. Si quieres más, agenda una llamada.';
      } else {
        // Fallback or other types checking general usage_count if needed
        hasCredit = true;
      }

      if (!hasCredit) {
        console.log(`🛑 ${usageType.toUpperCase()} Limit Reached for ${userId}`);
        return {
          allowed: false,
          status: 402,
          message: limitMsg
        };
      }

      // Decrement logic is handled by caller or we can do it here via RPC
      // For atomicity, usually better via RPC, but let's assume caller triggers it 
      // OR we call the specific decrement RPC here for convenience if 'allowed'.
      // Note: If we decrement HERE, we must ensure we don't double count if the operation fails later.
      // Strategy: Check here, Decrement after success in the endpoint.

      return { allowed: true };
    }
  } catch (err) {
    console.error('Freemium Check Error:', err);
    return { allowed: true };
  }
  return { allowed: true };
};

app.post('/api/profile', async (req, res) => {
  const { userId, email, goal, level, interests, age, role_title, role_industry, work_context } = req.body;
  if (!supabaseAdmin) return res.status(500).json({ error: 'DB not connected' });

  try {
    // Super Admin Auto-Promotion
    let role = 'user';
    let is_premium = false;
    let subscription_tier = 'free';

    if (email === 'visasytrabajos@gmail.com') {
      role = 'admin';
      is_premium = true;
      subscription_tier = 'premium';
      console.log('👑 Super Admin Identified:', email);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email, // Sync Email
        role: role,   // Update Role
        is_premium: is_premium,
        subscription_tier: subscription_tier,
        goal,
        level,
        interests,
        age,
        role_title,
        role_industry,
        work_context,
        onboarding_completed: true
      });

    if (error) throw error;
    res.json({ success: true, message: 'Profile saved' });
  } catch (err) {
    console.error('Profile Save Error:', err);
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!supabaseAdmin) return res.status(500).json({ error: 'DB not connected' });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.post('/api/verify-code', (req, res) => {
  const { code } = req.body;
  const validCodes = (process.env.STUDENT_ACCESS_CODES || '').split(',');
  if (validCodes.includes(code)) {
    res.json({ valid: true });
  } else {
    res.json({ valid: false });
  }
});

// LEGAL: Log Consent (RPC preferred, but fallback to direct insert if RPC missing)
app.post('/api/consent/log', async (req, res) => {
  const { userId, consents } = req.body; // consents: [{ type: 'future_matching', status: true }]

  if (!supabaseAdmin) return res.status(500).json({ error: 'DB not connected' });
  if (!userId || !consents || !Array.isArray(consents)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const logs = consents.map(c => ({
      user_id: userId,
      consent_type: c.type,
      status: c.status,
      source: 'web_login_v2',
      ip_address: req.ip // Audit trail
    }));

    const { error } = await supabaseAdmin
      .from('opt_in_logs')
      .insert(logs);

    if (error) throw error;

    // Also update profile last_interaction to prevent purging
    await supabaseAdmin
      .from('profiles')
      .update({
        last_interaction_at: new Date().toISOString(),
        tos_accepted_at: new Date().toISOString() // Mark as onboarded
      })
      .eq('id', userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Consent Log Error:', err);
    res.status(500).json({ error: 'Failed to log consent' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, scenarioId, userId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const usageCheck = await checkUsage(userId, 'roleplay');
    if (!usageCheck.allowed) {
      return res.status(usageCheck.status || 402).json({
        error: 'Limit Reached',
        message: usageCheck.message
      });
    }

    // Decrement Credit (Async)
    if (userId && supabaseAdmin) {
      supabaseAdmin.rpc('decrement_credit', { p_user_id: userId, p_type: 'roleplay' })
        .then(({ error }) => { if (error) console.error('Error decrementing roleplay credit:', error); });
    }

    let systemMsg = { role: 'system', content: 'You are a helpful tutor.' };

    if (userId && supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile && profile.goal) {
        const planConfig = getPlanConfig(profile);
        systemMsg = planConfig.systemPrompt;
        console.log(`🧠 Rule Engine for ${userId}: Plan=${planConfig.planId}`);
      } else {
        systemMsg = getSystemMessage(scenarioId);
      }
    } else {
      systemMsg = getSystemMessage(scenarioId);
    }

    const userMessages = messages.filter(m => m.role !== 'system');
    const finalMessages = [systemMsg, ...userMessages];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: finalMessages,
    });

    res.json({
      role: 'assistant',
      content: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

const { processTranslation } = require('./services/translator');

const { extractTextFromPDF } = require('./services/pdfService');
const careerCoach = require('./services/careerCoach');

app.post('/api/analyze-cv', upload.single('cv'), async (req, res) => {
  const cvFile = req.file;
  const { jobDescription, cvText: bufCvText } = req.body; // accept text input

  if ((!cvFile && !bufCvText) || !jobDescription) {
    if (cvFile) cleanup(cvFile.path);
    return res.status(400).json({ error: 'Missing CV (File or Text) or Job Description' });
  }

  try {
    // 1. Extract Text
    let finalCvText = "";
    if (cvFile) {
      finalCvText = await extractTextFromPDF(fs.readFileSync(cvFile.path));
    } else {
      finalCvText = bufCvText;
    }

    // 2. Fetch User Plan & AI Analysis
    const userId = req.body.userId;
    let userTier = 'free';

    if (userId && supabaseAdmin) {
      // CREDIT CHECK
      const usageCheck = await checkUsage(userId, 'ats');
      if (!usageCheck.allowed) {
        if (cvFile) cleanup(cvFile.path);
        return res.status(402).json({
          error: 'Limit Reached',
          message: usageCheck.message
        });
      }

      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (userProfile) {
        userTier = userProfile.subscription_tier || 'free';
      }
    }

    const analysis = await careerCoach.analyzeCV(finalCvText, jobDescription, userTier);

    // 3. Save to Supabase (if userId provided)
    if (userId && supabaseAdmin) {
      try { // WRAPPED TO PREVENT CRASH
        const status = analysis.score >= 80 ? 'APPROVED' : 'BLOCKED';
        await supabaseAdmin
          .from('profiles')
          .update({
            ats_score: analysis.score,
            ats_status: status,
            ats_missing_keywords: analysis.hard_skills_analysis?.missing_keywords || []
          })
          .eq('id', userId);

        // Decrement ATS Credit
        await supabaseAdmin.rpc('decrement_credit', { p_user_id: userId, p_type: 'ats' });

      } catch (dbErr) {
        console.warn('DB Update Failed (Non-Critical):', dbErr.message);
        // Do NOT throw. Continue to return analysis.
      }
    }

    res.json(analysis);

  } catch (error) {
    console.error('CV Analysis Error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  } finally {
    if (cvFile && cvFile.path) cleanup(cvFile.path);
  }
});

app.post('/api/rewrite-cv', upload.single('cv'), async (req, res) => {
  const cvFile = req.file;

  if (!cvFile) {
    return res.status(400).json({ error: 'Missing CV file' });
  }

  try {
    const cvText = await extractTextFromPDF(fs.readFileSync(cvFile.path));
    const analysis = await careerCoach.rewriteCV(cvText);
    res.json(analysis);

  } catch (error) {
    console.error('CV Rewrite Error:', error);
    res.status(500).json({ error: 'Rewrite failed', details: error.message });
  } finally {
    cleanup(cvFile.path);
  }
});

app.post('/api/generate-cv', async (req, res) => {
  const userData = req.body;

  try {
    const { userId } = userData;
    if (userId) {
      const usageCheck = await checkUsage(userId, 'ats');
      if (!usageCheck.allowed) {
        return res.status(402).json({ error: 'Limit Reached', message: usageCheck.message });
      }
    }

    console.log(`🚀 [CV-ENGINE] Generating stateless CV for ${userData.role} in ${userData.market || 'Global'}`);

    // 1. Generate Content and Design Tokens in Parallel
    const [aiContent, designTokens] = await Promise.all([
      cvService.generateContent(userData),
      cvService.generateDesignTokens(userData.market || 'Global', userData.industry || 'General')
    ]);

    // 2. Normalize for Safety
    const cleanData = normalizeCV(aiContent);

    // 3. Return both Content and Tokens
    res.json({
      data: cleanData,
      tokens: designTokens,
      metadata: {
        generated_at: new Date().toISOString(),
        engine: "Gemini 1.5 Flash (v5.1 Architecture)"
      }
    });

    // Final Stage Crediting
    if (userId && supabaseAdmin) {
      await supabaseAdmin.rpc('decrement_credit', { p_user_id: userId, p_type: 'ats' });
    }

  } catch (error) {
    console.error('CV Generation Error:', error);
    res.status(500).json({ error: 'Generation failed', details: error.message });
  }
});

app.post('/api/ats-optimize', async (req, res) => {
  const { userData, jobDescription } = req.body;

  if (!userData || !jobDescription) {
    return res.status(400).json({ error: 'Missing user data or job description' });
  }

  try {
    const { userId } = userData;
    if (userId) {
      const usageCheck = await checkUsage(userId, 'ats');
      if (!usageCheck.allowed) {
        return res.status(402).json({ error: 'Limit Reached', message: usageCheck.message });
      }
    }
    console.log(`🚀 [ATS-ENGINE] Optimizing CV for ${userData.role || 'User'} based on JD`);
    const result = await atsService.getATSComparison(userData, jobDescription);

    if (userId && supabaseAdmin) {
      await supabaseAdmin.rpc('decrement_credit', { p_user_id: userId, p_type: 'ats' });
    }

    // Normalize the optimized content
    const cleanContent = normalizeCV(result.optimized_content);

    res.json({
      ...result,
      optimized_content: cleanContent
    });
  } catch (error) {
    console.error('ATS Optimization Error:', error);
    res.status(500).json({ error: 'Optimization failed' });
  }
});

// NUEVA RUTA: CV WIZARD PIPELINE
app.post('/api/cv-wizard/:step', async (req, res) => {
  const { step } = req.params;
  const data = req.body;

  try {
    const { userId } = data;
    if (userId) {
      const usageCheck = await checkUsage(userId, 'ats');
      if (!usageCheck.allowed) {
        return res.status(402).json({ error: 'Limit Reached', message: usageCheck.message });
      }
    }

    const result = await cvWizardEngine.processWizardStep(step, data);

    // If it's the final generation step, decrement credit
    if (parseInt(step) === 5 && userId && supabaseAdmin) {
      await supabaseAdmin.rpc('decrement_credit', { p_user_id: userId, p_type: 'ats' });
    }

    res.json(result);
  } catch (error) {
    console.error(`❌ Error en Wizard Paso ${step}:`, error);
    res.status(500).json({ error: `Fallo en el paso ${step} del constructor` });
  }
});

// --- PUENTES GLOBALES ENGINE (PSICOMETRÍA ADAPTATIVA) ---

app.post('/api/workpass/start', async (req, res) => {
  const { cvText, jobTitle, userId } = req.body;
  try {
    if (!cvText || !jobTitle) return res.status(400).json({ error: "Missing CV text or Job Title" });

    console.log(`🧠 [PUENTES-GLOBALES] Initializing adaptive assessment for ${jobTitle}`);
    const assessment = await puentesGlobales.initializeAssessment(cvText, jobTitle);

    // Persistencia para Anti Gravity (v5.1 Stateless Design)
    if (userId && supabaseAdmin) {
      try {
        await supabaseAdmin.from('psychometric_evaluations').insert([{
          user_id: userId,
          job_title: jobTitle,
          ai_analysis: { questions: assessment.questions, profile: assessment.role_profile, status: 'started' }
        }]);
      } catch (dbErr) { console.warn("DB Persist Failed:", dbErr.message); }
    }

    res.json(assessment);
  } catch (error) {
    console.error("Puentes Globales Start error:", error);
    res.status(500).json({ error: "Failed to initialize assessment", details: error.message });
  }
});

app.post('/api/workpass/submit', async (req, res) => {
  const { userId, responses, profile, cvText, jobTitle } = req.body;
  // responses: [{ trait: '...', value: 1-5, direction: '...' }]

  try {
    if (!responses || !profile) return res.status(400).json({ error: "Missing test responses or role profile" });

    // 1. Math Calculation (Stateless)
    const results = puentesGlobales.calculateResults(responses, profile);

    // 2. AI FINAL REPORT (Cruce de datos)
    console.log(`📄 [PUENTES-GLOBALES] Generating Final Report for ${userId}...`);
    const report = await puentesGlobales.generateFinalReport(cvText || "", jobTitle || "General", results);

    // 3. Persist Final Result
    if (userId && supabaseAdmin) {
      try {
        await supabaseAdmin.from('psychometric_evaluations').insert([{
          user_id: userId,
          job_title: jobTitle,
          match_score: results.fit_score,
          ai_analysis: report
        }]);
      } catch (dbErr) { console.warn("DB Report Persist Failed:", dbErr.message); }
    }

    res.json({ results, report });
  } catch (error) {
    console.error("Puentes Globales Submit error:", error);
    res.status(500).json({ error: "Failed to process assessment results", details: error.message });
  }
});

const interviewCoach = require('./services/interviewCoach');

app.post('/api/interview/start', async (req, res) => {
  const { cvText, jobDescription, mode } = req.body;

  if (!cvText || !jobDescription) {
    return res.status(400).json({ error: 'Missing CV or Job Description' });
  }

  try {
    const responseObj = await interviewCoach.getInterviewResponse([], cvText, jobDescription, mode);
    // V2: responseObj is { dialogue, feedback, stage }
    res.json({ message: responseObj.dialogue, feedback: responseObj.feedback, stage: responseObj.stage });
  } catch (error) {
    console.error('Interview Start Error:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

app.post('/api/interview/chat', async (req, res) => {
  const { messages, cvText, jobDescription, mode } = req.body;

  try {
    const responseObj = await interviewCoach.getInterviewResponse(messages, cvText, jobDescription, mode);
    // V2: responseObj is { dialogue, feedback, stage }
    res.json({ message: responseObj.dialogue, feedback: responseObj.feedback, stage: responseObj.stage });
  } catch (error) {
    console.error('Interview Chat Error:', error);
    res.status(500).json({ error: 'Failed to chat' });
  }
});

const psychometricService = require('./services/psychometricService');

app.post('/api/psychometric/submit', async (req, res) => {
  const { answers, userData } = req.body;
  // userData: { cvText, jobDescription, role, market } or similar

  if (!answers || !userData || !userData.cvText || !userData.jobDescription) {
    return res.status(400).json({ error: 'Missing answers or user data (CV/Job)' });
  }

  try {
    // 1. Calculate Core Scores
    const dass21 = psychometricService.calculateDASS21(answers);
    const flow = psychometricService.calculateFlow(answers);
    const big5 = psychometricService.calculateBig5(answers);

    const scores = { dass: dass21, flow: flow, big5: big5 };

    // 2. Generate AI Report
    const aiReport = await psychometricService.generateReport(
      userData.cvText,
      userData.jobDescription,
      scores
    );

    // 3. Save to DB (Optional / Async)
    if (userData.userId && supabaseAdmin) {
      // ... (Insert into psychometric_evaluations logic) ...
      // Simplified for MVP speed: Just return JSON first
    }

    res.json({
      success: true,
      scores: scores,
      ai_report: aiReport
    });

  } catch (error) {
    console.error('Psychometric Submit Error:', error);
    res.status(500).json({ error: 'Processing failed', details: error.message });
  }
});

app.post('/api/interview/speak', upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  const { cvText, jobDescription, messages, mode } = req.body;

  let parsedMessages = [];
  try {
    parsedMessages = typeof messages === 'string' ? JSON.parse(messages) : (messages || []);
  } catch (e) {
    parsedMessages = [];
    console.error("Error parsing messages json", e);
  }

  if (!audioFile) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  let currentStage = 'INIT';

  try {
    // 1. STT: Whisper
    currentStage = 'STT (Whisper)';
    const path = require('path');
    const ext = path.extname(audioFile.originalname) || '.m4a';

    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.path), `audio${ext}`);
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : ''}`
        }
      }
    );
    const userText = transcriptionResponse.data.text;
    console.log('[Interview Speak] User said:', userText);

    // 2. Chat: Interview Coach
    currentStage = 'LLM (InterviewCoach)';
    // Append user's spoken text to history
    const newHistory = [...parsedMessages, { role: 'user', content: userText }];

    // Get AI response
    // Get AI response (V2: returns { dialogue, feedback, stage })
    const responseObj = await interviewCoach.getInterviewResponse(newHistory, cvText, jobDescription, mode);
    const assistantText = cleanTextForTTS(responseObj.dialogue || "Error generating response.");
    const feedback = responseObj.feedback;
    const stage = responseObj.stage;

    if (!assistantText) {
      return res.json({ userText, assistantText: "I'm sorry, I couldn't generate a response.", feedback, stage, audioBase64: null });
    }

    // 3. TTS: ElevenLabs
    currentStage = 'TTS (ElevenLabs)';

    const crypto = require('crypto');
    const cacheDir = 'audio_cache';
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
    const hash = crypto.createHash('md5').update(assistantText + ELEVENLABS_VOICE_ID).digest('hex');
    const cachePath = path.join(cacheDir, `${hash}.mp3`);

    let audioBase64;
    if (fs.existsSync(cachePath)) {
      audioBase64 = fs.readFileSync(cachePath).toString('base64');
      console.log('✅ Audio loaded from cache');
    } else {
      console.log('Generating new audio with Google TTS (FREE) 🎉');
      try {
        const googleTTS = require('google-tts-api');
        const ttsUrl = googleTTS.getAudioUrl(assistantText, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com'
        });
        const ttsResponse = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(cachePath, Buffer.from(ttsResponse.data));
        audioBase64 = Buffer.from(ttsResponse.data).toString('base64');
        console.log('✅ Google TTS Success (Cost: $0.00)');
      } catch (err) {
        console.error('[ERROR] Google TTS Failed:', err.message);
        throw err;
      }
    }

    res.json({
      userText,
      assistantText,
      feedback,
      stage,
      audioBase64
    });

  } catch (error) {
    console.error(`Error in /api/interview/speak [${currentStage}]:`, error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Processing failed', stage: currentStage, details: error.message });
  } finally {
    cleanup(audioFile.path);
  }
});

app.post('/api/translate', upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  const { userId, fromLang, toLang } = req.body;

  if (!audioFile) return res.status(400).json({ error: 'No audio provided' });

  try {
    const result = await processTranslation({
      audioPath: audioFile.path,
      fromLang: fromLang || 'es',
      toLang: toLang || 'en',
      userId
    });

    res.json(result);

  } catch (error) {
    console.error('Translation Endpoint Error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  } finally {
    cleanup(audioFile.path);
  }
});

// Speak Endpoint
app.post('/api/speak', upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  if (!audioFile) {
    return res.status(400).json({ error: 'No audio file uploaded', message: 'No se recibió el archivo de audio. (Error 400)' });
  }

  let currentStage = 'INIT';

  try {
    const userId = req.body.userId;
    const usageCheck = await checkUsage(userId);
    if (!usageCheck.allowed) {
      if (req.file && req.file.path) cleanup(req.file.path);
      return res.status(usageCheck.status || 402).json({
        error: 'Limit Reached',
        message: usageCheck.message || 'Has alcanzado tu límite.'
      });
    }

    // 1. STT: Send to OpenAI Whisper
    currentStage = 'STT (Whisper)';
    const path = require('path');
    const ext = path.extname(audioFile.originalname) || '.m4a';

    // Fix: Explicitly declare formData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.path), `audio${ext}`);
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          // Fix 401: Trim API Key here as well
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : ''}`
        }
      }
    );
    const userText = transcriptionResponse.data.text;
    console.log('User said:', userText);

    // 2. Chat: Send text to GPT
    currentStage = 'LLM (Chat)';
    const scenarioId = req.body.scenarioId;
    let systemMsg = { role: 'system', content: 'You are a helpful tutor.' };

    if (userId && supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profile && profile.goal) {
        const planConfig = getPlanConfig(profile);
        systemMsg = planConfig.systemPrompt;
      } else {
        systemMsg = getSystemMessage(scenarioId);
      }
    } else {
      systemMsg = getSystemMessage(scenarioId);
    }

    const jsonSystemMsg = {
      role: 'system',
      content: `${systemMsg.content} 
        IMPORTANT: You must respond in valid JSON format with two fields:
        1. "dialogue": The spoken response to the user (Keep it conversational and brief).
        2. "feedback": Any corrections, grammar tips, or suggestions (in the user's language). If perfect, this can be null or empty.
        Example: { "dialogue": "Bonjour! Un café?", "feedback": "Dijiste 'un cafe', recuerda el acento." }`
    };

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        jsonSystemMsg,
        { role: 'user', content: userText }
      ],
      response_format: { type: "json_object" }
    });

    const aiContent = JSON.parse(chatCompletion.choices[0].message.content);
    const assistantText = cleanTextForTTS(aiContent.dialogue);
    const feedbackText = aiContent.feedback;

    if (!assistantText) {
      return res.json({ userText, assistantText: "Lo siento, no pude generar una respuesta.", feedbackText, audioBase64: null });
    }

    // 3. TTS: ElevenLabs
    currentStage = 'TTS (ElevenLabs)';
    const crypto = require('crypto');
    const cacheDir = 'audio_cache';
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }

    const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
    const hash = crypto.createHash('md5').update(assistantText + ELEVENLABS_VOICE_ID).digest('hex');
    const cachePath = path.join(cacheDir, `${hash}.mp3`);

    let audioBase64;

    if (fs.existsSync(cachePath)) {
      console.log('Serving from CACHE (Money Saved!) 💰');
      const audioBuffer = fs.readFileSync(cachePath);
      audioBase64 = audioBuffer.toString('base64');
    } else {
      console.log('Generating new audio with Google TTS (FREE) 🎉');
      try {
        const googleTTS = require('google-tts-api');
        const ttsUrl = googleTTS.getAudioUrl(assistantText, {
          lang: 'en',
          slow: false,
          host: 'https://translate.google.com'
        });
        const ttsResponse = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(cachePath, Buffer.from(ttsResponse.data));
        audioBase64 = Buffer.from(ttsResponse.data).toString('base64');
        console.log('✅ Google TTS Success (Cost: $0.00)');
      } catch (err) {
        console.error('[ERROR] Google TTS Failed:', err.message);
        throw err;
      }
    }

    res.json({
      userText,
      assistantText,
      feedbackText,
      audioBase64
    });

  } catch (error) {
    console.error(`Error in /api/speak [${currentStage}]:`, error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Processing failed', stage: currentStage, details: error.message });
  } finally {
    if (audioFile) cleanup(audioFile.path);
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { data, error } = await supabaseAdmin
      .from('usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const totalCost = data.reduce((acc, row) => acc + (row.cost_estimated || 0), 0);
    const deepSeekCount = data.filter(row => row.provider_llm === 'deepseek-chat').length;

    res.json({
      logs: data,
      summary: {
        total_cost_window: totalCost,
        deepseek_usage_pct: Math.round((deepSeekCount / data.length) * 100) || 0,
        cache_hits: data.filter(r => r.is_cache_hit).length
      }
    });

  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
