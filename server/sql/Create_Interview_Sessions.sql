-- =====================================================================
-- 🧬 INTERVIEW SESSIONS TABLE
-- Persistencia de sesiones de entrevista para memoria conversacional
-- Career Mastery Engine v2.0
-- 
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Create Interview Sessions Table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session Configuration
    mode TEXT NOT NULL DEFAULT 'ALLY',           -- ALLY | TECHNICAL | STRESS
    language TEXT NOT NULL DEFAULT 'es',          -- es | en
    job_description TEXT,                          -- Target job description
    cv_summary TEXT,                               -- Summarized CV (not full text)
    
    -- Session State
    current_phase TEXT DEFAULT 'ICEBREAKER',      -- Current interview phase
    turn_count INTEGER DEFAULT 0,                  -- Number of turns completed
    status TEXT DEFAULT 'active',                   -- active | completed | abandoned
    
    -- Accumulated Data
    messages_summary TEXT,                          -- AI-generated summary of conversation so far
    scores JSONB DEFAULT '[]'::jsonb,              -- Array of scores per turn: [{turn: 1, score: 75}, ...]
    topics_covered TEXT[] DEFAULT '{}',             -- Topics already asked about
    
    -- Final Report (generated on session end)
    final_report JSONB,                             -- Full AI-generated report
    average_score INTEGER,                          -- Average of all turn scores
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Provider Tracking
    providers_used TEXT[] DEFAULT '{}'              -- Which AI providers were used
);

-- 2. Enable Row Level Security
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Policies: Users can only see/modify their own sessions
CREATE POLICY "Users can view own interview sessions"
    ON public.interview_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview sessions"
    ON public.interview_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview sessions"
    ON public.interview_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id 
    ON public.interview_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_status 
    ON public.interview_sessions(status);

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interview_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_interview_session ON public.interview_sessions;
CREATE TRIGGER trigger_update_interview_session
    BEFORE UPDATE ON public.interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_session_timestamp();

-- 6. Auto-abandon stale sessions (sessions older than 30 min with no activity)
-- This can be called periodically or via a cron job
CREATE OR REPLACE FUNCTION abandon_stale_interview_sessions()
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    UPDATE public.interview_sessions
    SET status = 'abandoned',
        completed_at = timezone('utc'::text, now())
    WHERE status = 'active'
      AND updated_at < (timezone('utc'::text, now()) - interval '30 minutes');
    
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comments
COMMENT ON TABLE public.interview_sessions IS 'Stores interview simulation sessions with conversational memory';
COMMENT ON COLUMN public.interview_sessions.messages_summary IS 'AI-generated rolling summary of conversation for context window management';
COMMENT ON COLUMN public.interview_sessions.scores IS 'JSON array of per-turn scores for final report calculation';
COMMENT ON COLUMN public.interview_sessions.topics_covered IS 'Array of topics already discussed to avoid repetition';
