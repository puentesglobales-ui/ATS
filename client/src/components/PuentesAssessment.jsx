import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Loader, CheckCircle2, AlertCircle, TrendingUp, Info, ArrowRight, ShieldCheck, FileText, Calendar, MessageCircle } from 'lucide-react';
import api from '../services/api';

const PuentesAssessment = ({ session }) => {
    const isMasterKey = session?.user?.email === 'visasytrabajos@gmail.com';
    const [stage, setStage] = useState('INIT'); // INIT, TESTING, LOADING, REPORT
    const [cvText, setCvText] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [questions, setQuestions] = useState([]);
    const [profile, setProfile] = useState(null);
    const [answers, setAnswers] = useState({}); // { qId: 1-5 }
    const [currentIndex, setCurrentIndex] = useState(0);
    const [report, setReport] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // PERSISTENCE (Anti Gravity & Restart Resilience)
    useEffect(() => {
        const savedProgress = localStorage.getItem('puentes_progress');
        if (savedProgress) {
            const { answers: savedAnswers, currentIndex: savedIdx, stage: savedStage, questions: savedQs, profile: savedProfile, cvText: savedCv, jobTitle: savedJob } = JSON.parse(savedProgress);
            setAnswers(savedAnswers || {});
            setCurrentIndex(savedIdx || 0);
            setStage(savedStage || 'INIT');
            setQuestions(savedQs || []);
            setProfile(savedProfile || null);
            setCvText(savedCv || '');
            setJobTitle(savedJob || '');
        }
    }, []);

    useEffect(() => {
        if (stage !== 'INIT' && stage !== 'REPORT') {
            localStorage.setItem('puentes_progress', JSON.stringify({
                answers, currentIndex, stage, questions, profile, cvText, jobTitle
            }));
        }
    }, [answers, currentIndex, stage]);

    const handleStart = async () => {
        if (!cvText || !jobTitle) return alert("Por favor completa el CV y el Puesto.");
        setIsProcessing(true);
        console.log("🚀 [PUENTES-CLIENT] Starting assessment for:", jobTitle);
        try {
            const { data } = await api.post('/workpass/start', {
                cvText,
                jobTitle,
                userId: session?.user?.id
            });

            if (data.questions && data.questions.length > 0) {
                console.log("✅ [PUENTES-CLIENT] Questions received:", data.questions.length);
                setQuestions(data.questions);
                setProfile(data.role_profile);
                setStage('TESTING');
            } else {
                throw new Error("El motor no devolvió preguntas válidas.");
            }
        } catch (e) {
            console.error("❌ [PUENTES-CLIENT] Start Error:", e);
            alert(`Error al iniciar el motor: ${e.message || "Problema de conexión"}. Por favor intenta de nuevo.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAnswer = (val) => {
        const q = questions[currentIndex];
        const newAnswers = { ...answers, [q.id]: val };
        setAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleSubmit(newAnswers);
        }
    };

    const handleSubmit = async (finalAnswers) => {
        setStage('LOADING');
        console.log("🚀 [PUENTES-CLIENT] Submitting answers...");
        try {
            // Format responses for backend
            const responses = questions.map(q => ({
                trait: q.trait,
                value: finalAnswers[q.id],
                direction: q.direction
            }));

            const { data } = await api.post('/workpass/submit', {
                responses,
                profile,
                cvText,
                jobTitle,
                userId: session?.user?.id
            });

            setReport(data);
            setStage('REPORT');
            localStorage.removeItem('puentes_progress'); // Clear on success
        } catch (e) {
            console.error("❌ [PUENTES-CLIENT] Submit Error:", e);
            alert("Error al procesar el reporte final. Tu progreso se ha guardado.");
            setStage('TESTING');
        }
    };

    // --- RENDER HELPERS ---
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-cyan-500/30">
            <div className="max-w-4xl mx-auto px-6 py-12">

                {/* STAGE: INIT */}
                {stage === 'INIT' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        <header className="text-center space-y-4">
                            <div className="inline-block p-3 bg-cyan-600/10 rounded-2xl border border-cyan-600/20 mb-4">
                                <ShieldCheck className="text-cyan-600 w-8 h-8" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Puentes <span className="text-cyan-600">Globales v5.1</span></h1>
                            <p className="text-slate-500 font-medium max-w-lg mx-auto">Evaluación psicométrica adaptativa con IA para un reclutamiento sin sesgos.</p>
                        </header>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">Tu Perfil (CV)</label>
                                <textarea
                                    className="w-full h-64 bg-white border border-slate-200 rounded-2xl p-4 focus:border-cyan-600 outline-none transition-all text-sm leading-relaxed"
                                    placeholder="Pega aquí tu CV o experiencia..."
                                    value={cvText}
                                    onChange={(e) => setCvText(e.target.value)}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">Puesto Objetivo</label>
                                <input
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 focus:border-cyan-600 outline-none transition-all text-sm font-bold"
                                    placeholder="Ej: Senior Fullstack Developer"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                />
                                <div className="p-5 bg-slate-100 rounded-2xl border border-slate-200 space-y-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase"><Info size={14} className="text-cyan-600" /> Cómo funciona</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Analizaremos tu CV para diseñar un test adaptado al rol. No hay respuestas malas, solo perfiles que encajan mejor con ciertas culturas.
                                    </p>
                                    <button
                                        onClick={handleStart}
                                        disabled={isProcessing || !cvText || !jobTitle}
                                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <Loader className="animate-spin" size={20} /> : <TrendingUp size={20} />}
                                        {isProcessing ? 'Diseñando Test...' : 'Comenzar Evaluación'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STAGE: TESTING */}
                {stage === 'TESTING' && questions[currentIndex] && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-xl mx-auto space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600">Pregunta {currentIndex + 1} de {questions.length}</span>
                            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-cyan-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 p-12 rounded-[2rem] text-center shadow-xl">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-12 leading-tight">
                                {questions[currentIndex].text}
                            </h2>

                            <div className="grid grid-cols-5 gap-3">
                                {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => handleAnswer(val)}
                                        className="aspect-square rounded-2xl bg-white hover:bg-slate-900 border border-slate-200 hover:border-slate-900 transition-all flex items-center justify-center text-xl font-bold hover:text-white hover:scale-105 active:scale-95 group relative"
                                    >
                                        {val}
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-widest text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all">
                                            {val === 1 ? 'Nunca' : val === 5 ? 'Siempre' : ''}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STAGE: LOADING */}
                {stage === 'LOADING' && (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <Loader className="w-16 h-16 text-cyan-600 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-slate-900 rounded-full animate-ping" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Generando Reporte Final...</h2>
                        <p className="text-slate-500 text-sm max-w-xs italic font-medium">Cruzando 20 señales psicométricas con la experiencia en tu CV.</p>
                    </div>
                )}

                {/* STAGE: REPORT */}
                {stage === 'REPORT' && report && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900">Reporte Ejecutivo</h1>
                                <p className="text-slate-500 font-medium">Análisis Conductual Avanzado de Puentes Globales</p>
                            </div>
                            <div className={`px-6 py-3 rounded-full border flex items-center gap-3 ${report.report.status === 'Contratar' ? 'bg-emerald-600/10 border-emerald-600/20 text-emerald-700' : 'bg-amber-600/10 border-amber-600/20 text-amber-700'}`}>
                                <CheckCircle2 size={18} />
                                <span className="font-black uppercase tracking-widest text-xs">Veredicto: {report.report.status}</span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* SCORE CARD */}
                            <div className="md:col-span-1 bg-white border border-slate-200 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 text-center shadow-lg shadow-slate-200/50">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                                        <circle cx="64" cy="64" r="60" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                        <circle cx="64" cy="64" r="60" fill="none" stroke="#0891b2" strokeWidth="8" strokeDasharray="377" strokeDashoffset={377 - (377 * report.results.fit_score / 100)} strokeLinecap="round" className="transition-all duration-1000" />
                                    </svg>
                                    <span className="text-4xl font-black text-slate-900">{report.results.fit_score}%</span>
                                </div>
                                <h3 className="font-bold text-slate-800">Culture Fit Score</h3>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">Alineación natural con las demandas del puesto de {jobTitle}.</p>
                            </div>

                            {/* ANALYSIS CARD - FREE VERSION (LOCKED RECOMMENDATIONS) */}
                            <div className="md:col-span-2 bg-white border border-slate-200 p-8 rounded-3xl space-y-6 relative overflow-hidden shadow-lg shadow-slate-200/50">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-cyan-600 font-black uppercase text-[10px] tracking-widest">
                                        <Target size={14} /> Veredicto Global
                                    </div>
                                    <p className="text-xl font-black text-slate-900 leading-relaxed">
                                        {report.report.status === 'Descartar' ? 'Perfil No Compatible actualmente.' : 'Perfil Compatible con el rol.'}
                                    </p>
                                    <p className="text-xs text-slate-500 italic font-medium">"El análisis completo de tu CV ha sido procesado por Alex IA."</p>
                                </div>

                                {/* GATE CALL TO ACTION */}
                                {!isMasterKey ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/60 backdrop-blur-sm rounded-xl">
                                        <ShieldCheck className="text-cyan-600 mb-2" size={32} />
                                        <h4 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-tighter">Reporte Maestro Bloqueado</h4>
                                        <p className="text-[10px] text-slate-500 mb-4 max-w-[200px] font-medium">Las recomendaciones específicas y el plan de acción están reservados.</p>
                                        <a
                                            href="https://wa.me/5491131065715"
                                            className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
                                        >
                                            <MessageCircle size={12} /> Desbloquear con Alex
                                        </a>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-4">
                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                            <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2 mb-2"><CheckCircle2 size={12} /> Fortaleza Crítica (Master Access)</h4>
                                            <p className="text-sm text-slate-700 font-medium">{report.report.fortalezas?.[0] || 'Liderazgo adaptativo y alta resiliencia cognitiva.'}</p>
                                        </div>
                                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                            <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-widest flex items-center gap-2 mb-2"><AlertCircle size={12} /> Riesgo Oculto (Master Access)</h4>
                                            <p className="text-sm text-slate-700 font-medium">{report.report.riesgos?.[0] || 'Posible agotamiento por alta auto-exigencia en entornos ambiguos.'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* INTERVIEW KILLER - LOCKED */}
                            <div className="md:col-span-3 p-8 bg-white border border-slate-200 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shadow-lg shadow-slate-200/50">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <FileText className="text-slate-400" size={24} />
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-2 opacity-10 blur-md select-none">
                                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Pregunta de Entrevista (Interview Killer)</h4>
                                    <p className="text-sm text-slate-400 font-bold italic">"Contenido bloqueado por política de privacidad de la IA..."</p>
                                </div>
                                <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-[2.5rem] pointer-events-none"></div>
                                <div className="md:relative z-10">
                                    <div className="text-center px-6 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                                        <span className="block text-[8px] uppercase text-slate-400 mb-1 font-black">Lie Score</span>
                                        <span className="text-lg font-black text-slate-900">
                                            {report.results.lie_score}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => setStage('INIT')}
                                className="px-8 py-3 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-900 text-xs font-black rounded-xl transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm"
                            >
                                <ArrowRight className="rotate-180" size={14} /> Nueva Evaluación
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default PuentesAssessment;

const Lightbulb = ({ className, size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.1.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
    </svg>
);
