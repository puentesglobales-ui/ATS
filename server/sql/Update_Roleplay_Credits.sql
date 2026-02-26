-- =====================================================
-- PASO 1: Crear columnas si no existen
-- =====================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_ats INT DEFAULT 1;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_roleplay INT DEFAULT 1;

-- =====================================================
-- PASO 2: Setear valores iniciales
-- =====================================================
UPDATE public.profiles SET credits_ats = 1 WHERE credits_ats IS NULL;
UPDATE public.profiles SET credits_roleplay = 1 WHERE credits_roleplay IS NULL;

-- =====================================================
-- PASO 3: Funcion para decrementar creditos
-- =====================================================
CREATE OR REPLACE FUNCTION decrement_credit(p_user_id UUID, p_type TEXT) 
RETURNS VOID AS $$
BEGIN
    IF p_type = 'ats' THEN
        UPDATE public.profiles 
        SET credits_ats = GREATEST(credits_ats - 1, 0),
            usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = p_user_id;
    ELSIF p_type = 'roleplay' THEN
        UPDATE public.profiles 
        SET credits_roleplay = GREATEST(credits_roleplay - 1, 0),
            usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PASO 4: Verificar
-- =====================================================
SELECT id, email, credits_ats, credits_roleplay, is_premium, role 
FROM public.profiles 
ORDER BY role DESC, email;
