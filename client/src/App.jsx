import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import api from './services/api';
import Login from './components/Login';

import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

import LanguageSelector from './components/LanguageSelector';
import StudyPlan from './components/StudyPlan';
import AdminDashboard from './components/AdminDashboard';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';
import PaymentSetup from './components/PaymentSetup';
import ATSScanner from './components/ATSScanner';
import CVEditor from './components/CVEditor';
import CVBuilder from './components/CVBuilder';
import CVWizard from './components/CVWizard';
import InterviewSimulator from './components/InterviewSimulator';
import PsychometricTest from './components/PsychometricTest';
import PuentesAssessment from './components/PuentesAssessment';
import EtiquetadoDashboard from './components/EtiquetadoDashboard';


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  useEffect(() => {
    // Safety check: specific handling if supabase client is null (config error)
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) checkProfile(newSession.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-900 p-4">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Error de Conexión</h2>
          <p className="text-slate-300 mb-4">
            No se ha podido conectar con el servidor (Supabase).
            Esto suele deberse a que faltan las variables de entorno en Vercel.
          </p>
          <p className="text-xs text-slate-500 font-mono bg-black/50 p-2 rounded">
            VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no detectadas.
          </p>
        </div>
      </div>
    );
  }

  const checkProfile = async (userId) => {
    try {
      const response = await api.get(`/profile/${userId}`);
      if (response.data) {
        const profile = response.data;
        setOnboardingComplete(!!profile.onboarding_completed);
      } else {
        setOnboardingComplete(false);
      }
    } catch (e) {
      console.error("Profile check failed", e);
      setOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-900">Cargando...</div>;
  }

  const getRedirectPath = () => {
    if (!session) return "/login";
    // Bypass obsolete onboarding checks, go straight to hub
    return "/dashboard";
  };

  // Helper for protected routes that should also respect payment gate
  const ProtectedRoute = ({ children }) => {
    if (!session) return <Navigate to="/login" />;

    const { is_student, payment_completed } = session?.user?.user_metadata || {};
    const ADMIN_EMAILS = ['visasytrabajos@gmail.com', 'tutrabajoeneuropa@gmail.com'];
    const isMasterKey = ADMIN_EMAILS.includes(session?.user?.email);

    if (is_student === false && !payment_completed && !isMasterKey) {
      return <Navigate to="/payment-setup" />;
    }

    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to={getRedirectPath()} />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard session={session} />
            </ProtectedRoute>
          } />

          {/* Tools */}
          <Route path="/ats-scanner" element={<ProtectedRoute><ATSScanner session={session} /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewSimulator session={session} /></ProtectedRoute>} />
          <Route path="/psychometric" element={<ProtectedRoute><PuentesAssessment session={session} /></ProtectedRoute>} />

          {/* CEREBRO MAESTRO */}
          <Route path="/cerebro" element={<ProtectedRoute><EtiquetadoDashboard session={session} /></ProtectedRoute>} />

          <Route path="/cv-builder" element={<ProtectedRoute><CVBuilder session={session} /></ProtectedRoute>} />
          <Route path="/cv-editor" element={<ProtectedRoute><CVEditor session={session} /></ProtectedRoute>} />
          <Route path="/cv-wizard" element={<ProtectedRoute><CVWizard session={session} /></ProtectedRoute>} />
          <Route path="/languages" element={<ProtectedRoute><LanguageSelector session={session} /></ProtectedRoute>} />
          <Route path="/study" element={<ProtectedRoute><StudyPlan session={session} /></ProtectedRoute>} />


          {/* Utility Routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingWizard session={session} onComplete={() => { setOnboardingComplete(true); }} />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={<ProtectedRoute><AdminDashboard session={session} /></ProtectedRoute>} />
          <Route path="/payment-setup" element={session ? <PaymentSetup session={session} /> : <Navigate to="/login" />} />

          <Route path="/" element={<LandingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
