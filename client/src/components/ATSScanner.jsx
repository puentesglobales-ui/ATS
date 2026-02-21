import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, AlertTriangle, CheckCircle, XCircle, X,
    Target, Sparkles, Loader, ShieldCheck, MessageCircle, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { Navigate } from 'react-router-dom';

const ATSScanner = ({ session }) => {
    // 1. STRICT GATE: Redirect to Login if no session
    if (!session) {
        return <Navigate to="/login" />;
    }

    const [file, setFile] = useState(null);
    const [cvText, setCvText] = useState('');
    const [inputMode, setInputMode] = useState('text');
    const [jobDescription, setJobDescription] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleAnalyze = async () => {
        if (inputMode === 'pdf' && !file) return setError('Please upload a CV PDF.');
        if (inputMode === 'text' && !cvText.trim()) return setError('Por favor pega el texto de tu CV.');
        if (!jobDescription.trim()) return setError('Please provide a Job Description.');

        setAnalyzing(true);
        setError('');
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('jobDescription', jobDescription);

            if (session && session.user) {
                formData.append('userId', session.user.id);
            }

            if (inputMode === 'pdf') {
                formData.append('cv', file);
            } else {
                formData.append('cvText', cvText);
            }

            const response = await api.post('/analyze-cv', formData);
            setResult(response.data);

        } catch (err) {
            console.error(err);
            setError('Failed to analyze CV. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 flex flex-col items-center font-sans selection:bg-cyan-500/30">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-600/5 border border-cyan-600/10 text-cyan-700 text-[10px] font-black uppercase tracking-widest mb-4">
                    <ShieldCheck size={12} /> Tecnología de Reclutamiento Enterprise
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2">
                    Escáner <span className="text-cyan-600">ATS Pro</span>
                </h1>
                <p className="text-slate-500 font-medium">Auditoría de afinidad con vacantes internacionales mediante IA.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
                {/* INPUT SECTION */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6">
                        {/* TABS */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                                onClick={() => setInputMode('text')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'text' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Pegar Texto
                            </button>
                            <button
                                onClick={() => setInputMode('pdf')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'pdf' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Subir PDF
                            </button>
                        </div>

                        {/* CV Input Area */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Tu Currículum</label>
                            {inputMode === 'pdf' ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-cyan-600/50 transition-colors cursor-pointer relative bg-slate-50">
                                    <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    {file ? <div className="text-cyan-600 flex items-center justify-center gap-2 font-black"><FileText /> {file.name}</div> : <span className="text-slate-400 font-bold">Arrastra tu PDF aquí o haz clic</span>}
                                </div>
                            ) : (
                                <textarea
                                    className="w-full h-48 bg-slate-50 border border-slate-200 rounded-3xl p-6 focus:border-cyan-600 outline-none transition-all text-sm leading-relaxed text-slate-700"
                                    placeholder="Pega el contenido de tu CV..."
                                    value={cvText}
                                    onChange={(e) => setCvText(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Job Description */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Descripción del Puesto</label>
                            <textarea
                                className="w-full h-48 bg-slate-50 border border-slate-200 rounded-3xl p-6 focus:border-cyan-600 outline-none transition-all text-sm leading-relaxed text-slate-700"
                                placeholder="Pega los requisitos de la vacante..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-lg hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {analyzing ? <Loader className="animate-spin" /> : <Sparkles size={20} />}
                            {analyzing ? 'Procesando Algoritmos...' : 'Analizar Afinidad ATS'}
                        </button>
                        {error && <p className="text-red-400 text-center text-xs font-bold uppercase tracking-widest">{error}</p>}
                    </div>
                </div>

                {/* RESULTS SECTION */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden min-h-[600px]">
                    {!result ? (
                        <div className="h-full flex items-center justify-center text-slate-300 flex-col gap-6 py-20">
                            <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center">
                                <Target size={40} className="text-slate-200" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-black uppercase tracking-[0.2em] text-xs">Esperando Datos</p>
                                <p className="text-sm text-slate-400 font-medium">Completa los campos para simular el filtro de IA.</p>
                            </div>
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {/* Score Display */}
                            <div className="text-center space-y-4">
                                <div className="inline-block relative">
                                    <svg className="w-40 h-40 transform -rotate-90">
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                        <circle cx="80" cy="80" r="70" fill="none" stroke="#0891b2" strokeWidth="10" strokeDasharray="440" strokeDashoffset={440 - (440 * (result.score || 0) / 100)} strokeLinecap="round" className="transition-all duration-1000" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black text-slate-900">{result.score || 0}%</span>
                                        <span className="text-[8px] font-black uppercase text-cyan-600 tracking-widest">Match Score</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">{result.match_level}</h3>
                            </div>

                            {/* Status Message */}
                            <div className={`p-6 rounded-[2rem] border ${result.score >= 80 ? 'bg-emerald-600/5 border-emerald-600/10 text-emerald-700' : 'bg-rose-600/5 border-rose-600/10 text-rose-700'}`}>
                                <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs mb-2">
                                    {result.score >= 80 ? <CheckCircle /> : <XCircle />}
                                    Veredicto del Algoritmo
                                </div>
                                <p className="text-sm font-medium leading-relaxed">
                                    {result.score >= 80
                                        ? "Tu perfil tiene una alta compatibilidad con el sistema de filtrado. Probabilidad de entrevista: ALTA."
                                        : "El sistema ATS detecta brechas críticas entre tu CV y los requisitos. Probabilidad de entrevista: BAJA."}
                                </p>
                            </div>

                            {/* RESULTS BREAKDOWN */}
                            <div className="space-y-6 pt-8 border-t border-slate-100">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Análisis del Reclutador</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        {result.summary}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl">
                                        <h5 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-4 flex items-center gap-2">
                                            <X size={12} /> Keywords Faltantes
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            {result.hard_skills_analysis?.missing_keywords?.map((word, i) => (
                                                <span key={i} className="px-3 py-1 bg-white border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg shadow-sm">
                                                    {word}
                                                </span>
                                            ))}
                                            {(!result.hard_skills_analysis?.missing_keywords || result.hard_skills_analysis?.missing_keywords.length === 0) && (
                                                <span className="text-xs text-slate-400 italic">No se detectaron brechas críticas.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl">
                                        <h5 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-4 flex items-center gap-2">
                                            <CheckCircle size={12} /> Puntos Fuertes
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            {result.hard_skills_analysis?.matched_keywords?.map((word, i) => (
                                                <span key={i} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg shadow-sm">
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Plan de Acción Inmediato</h4>
                                    <div className="space-y-3">
                                        {result.improvement_plan?.map((step, i) => (
                                            <div key={i} className="flex gap-4 items-start bg-white border border-slate-200 p-4 rounded-2xl shadow-sm group hover:border-cyan-600 transition-colors">
                                                <div className="w-6 h-6 bg-slate-900 text-white text-[10px] font-black flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 group-hover:bg-cyan-600">
                                                    {i + 1}
                                                </div>
                                                <p className="text-sm text-slate-700 font-medium">{step}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <a
                                        href="https://wa.me/your-number-here"
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3"
                                    >
                                        <MessageCircle size={14} /> Consultar a Alex Coach (WhatsApp)
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ATSScanner;
