import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Globe, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [accountType, setAccountType] = useState('student');
    const [message, setMessage] = useState('');

    // GDPR Consent States
    const [consentTerms, setConsentTerms] = useState(false); // Mandatory
    const [consentFuture, setConsentFuture] = useState(false); // Optional

    const navigate = useNavigate();

    const logConsent = async (userId) => {
        try {
            await api.post('/consent/log', {
                userId,
                consents: [
                    { type: 'process_specific', status: consentTerms }, // Terms for THIS process
                    { type: 'future_matching', status: consentFuture } // Future reuse
                ]
            });
            console.log("Consent logged successfully");
        } catch (err) {
            console.error("Failed to log consent", err);
        }
    };

    const handleGoogleLogin = async () => {
        if (isSignUp && !consentTerms) {
            setMessage("Debes aceptar los Términos para continuar.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/languages'
                }
            });
            if (error) throw error;
            // Note: Consent logging for OAuth happens post-redirect callback usually, 
            // or we assume if they click this button they accepted the marked checkboxes.
            // For MVP, we can't easily hook into the callback here without a new route.
            // Ideally, we'd log this ON specific 'Sign Up' intent, but OAuth blends them.
        } catch (error) {
            setMessage(error.message);
            setLoading(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (isSignUp && !consentTerms) {
            setLoading(false);
            setMessage("Debes aceptar los Términos y Condiciones obligatorios.");
            return;
        }

        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.user) {
                    await logConsent(data.user.id);
                    await api.post('/profile', { userId: data.user.id, email });
                }

                console.log("Registro Exitoso:", data);
                setMessage('¡Registro exitoso! Revisa tu email para confirmar.');

                if (data.session) {
                    if (accountType === 'freemium') navigate('/payment-setup');
                    else navigate('/languages');
                }

            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.user) {
                    await api.post('/profile', { userId: data.user.id, email });
                }

                console.log("Login Exitoso:", data);
                navigate('/languages');
            }
        } catch (error) {
            console.error("Auth Error:", error);
            setMessage(error.message || "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="absolute top-6 left-6 z-10">
                <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} /> Volver al inicio
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 relative z-10"
            >
                <div className="flex justify-center mb-6">
                    <img src="/logo-new.png" alt="Puentes Globales Logo" className="w-16 h-16 object-contain" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">
                    {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
                </h1>

                {/* LOGIN / SIGNUP TOGGLE */}
                <div className="flex justify-center gap-4 mb-6 bg-slate-950 p-1 rounded-xl border border-slate-800 mt-6">
                    <button
                        onClick={() => setIsSignUp(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isSignUp ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        onClick={() => setIsSignUp(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isSignUp ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        Registrarse
                    </button>
                </div>

                {/* GOOGLE LOGIN */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full mb-4 py-3 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continuar con Google
                </button>

                <p className="text-[10px] text-slate-400 text-center mb-6 leading-relaxed">
                    Al continuar, permites que usemos tus datos para que, en caso de que una empresa se interese en tu perfil, puedan contactarte directamente por estas herramientas.
                </p>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">O usa tu email</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <form onSubmit={handleAuth} className="space-y-5 mt-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium"
                                placeholder="tu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {isSignUp && (
                        <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            {/* OBLIGATORIO */}
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConsentTerms(!consentTerms)}>
                                {consentTerms ? <CheckSquare className="text-cyan-400 shrink-0 mt-0.5" size={18} /> : <Square className="text-slate-500 shrink-0 mt-0.5" size={18} />}
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <span className="font-bold text-cyan-400">OBLIGATORIO:</span> Acepto que mis datos sean tratados únicamente para participar en los procesos de selección relacionados con esta oferta.
                                </p>
                            </div>

                            {/* OPCIONAL */}
                            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setConsentFuture(!consentFuture)}>
                                {consentFuture ? <CheckSquare className="text-green-400 shrink-0 mt-0.5" size={18} /> : <Square className="text-slate-500 shrink-0 mt-0.5" size={18} />}
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <span className="font-bold text-green-400">OPCIONAL (Recomendado):</span> Autorizo a Puentes Globales a conservar mi perfil para <strong>futuros procesos de selección</strong> adecuados a mi perfil.
                                    <br /><span className="text-[10px] text-slate-500 italic">Podrás revocar esto en cualquier momento.</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`p-4 rounded-xl text-sm flex items-start gap-2 ${message.includes('exitoso') || message.includes('creado') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (isSignUp && !consentTerms)}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        {isSignUp ? 'Crear Cuenta' : 'Entrar'}
                    </button>
                </form>

            </motion.div>
        </div>
    );
}
