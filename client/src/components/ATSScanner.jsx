import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

import { analyzeATS } from '../services/atsLogic';

import { Navigate } from 'react-router-dom';

const ATSScanner = ({ session }) => {
    // 1. STRICT GATE: Redirect to Login if no session
    // This runs before anything else renders
    if (!session) {
        return <Navigate to="/login" />;
    }

    const [file, setFile] = useState(null);
    const [cvText, setCvText] = useState('');
    const [inputMode, setInputMode] = useState('text'); // Default to text for easier testing
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

            // Always call the Real AI Backend
            const response = await api.post('/analyze-cv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setResult(response.data);

        } catch (err) {
            console.error(err);
            setError('Failed to analyze CV. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center font-sans">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent text-center"
            >
                AI Career Mastery Engine
            </motion.h1>
            <p className="text-slate-400 mb-8 text-center">Auditoría ATS & Filtro de Calidad (Nivel Profesional)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
                {/* INPUT SECTION */}
                <div className="space-y-6">
                    {/* TABS: PDF VS TEXT */}
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            onClick={() => setInputMode('pdf')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${inputMode === 'pdf' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            PDF Upload
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${inputMode === 'text' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Pegar Texto
                        </button>
                    </div>

                    {/* CV Input Area */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            {inputMode === 'pdf' ? <Upload className="text-blue-400" /> : <FileText className="text-blue-400" />}
                            {inputMode === 'pdf' ? 'Sube tu CV (PDF)' : 'Pega el contenido de tu CV'}
                        </h3>

                        {inputMode === 'pdf' ? (
                            <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="text-green-400 flex items-center justify-center gap-2 font-bold">
                                        <FileText /> {file.name}
                                    </div>
                                ) : (
                                    <span className="text-slate-400">Arrastra tu PDF aquí o haz clic</span>
                                )}
                            </div>
                        ) : (
                            <textarea
                                value={cvText}
                                onChange={(e) => setCvText(e.target.value)}
                                placeholder="Copia y pega el texto de tu CV aquí para probar la lógica ATS..."
                                className="bg-slate-900 w-full h-48 rounded-xl p-4 text-sm text-slate-300 border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
                            />
                        )}
                    </div>

                    {/* Job Description */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-64 flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <FileText className="text-purple-400" /> Descripción de la Vacante
                        </h3>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Pega aquí la descripción del puesto (ej: requisitos, skills)..."
                            className="bg-slate-900 w-full flex-1 rounded-xl p-4 text-sm text-slate-300 border border-slate-600 focus:border-purple-500 focus:outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                    >
                        {analyzing ? 'Procesando Lógica ATS (GPT-4o)...' : 'EJECUTAR SIMULACIÓN ATS'}
                    </button>
                    {error && <p className="text-red-400 text-center">{error}</p>}
                </div>

                {/* RESULTS SECTION */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl relative overflow-y-auto max-h-[800px]">
                    {!result ? (
                        <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                            <div className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center">
                                <span className="text-2xl font-bold">0%</span>
                            </div>
                            <p>Esperando análisis...</p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            {/* Score Circle & Level */}
                            <div className="flex flex-col items-center mb-6">
                                <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center shadow-xl mb-2 ${result.score >= 80 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-500'}`}>
                                    <div className="text-center">
                                        <span className="block text-4xl font-extrabold">{result.score}</span>
                                        <span className="text-xs font-bold uppercase">ATS Score</span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${result.score >= 80 ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                                    Nivel: {result.match_level}
                                </span>
                            </div>

                            {/* Executive Summary */}
                            <div className="bg-slate-900 p-4 rounded-xl text-sm text-slate-300 leading-relaxed border border-slate-700">
                                <span className="text-blue-400 font-bold block mb-1">Resumen Ejecutivo:</span>
                                {result.summary || result.feedback_summary}
                            </div>

                            {/* Missing Keywords (Hook vs Full) */}
                            {result.hard_skills_analysis?.missing_keywords?.length > 0 && (
                                <div>
                                    <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">
                                        ⛔ Keywords Faltantes {result.hard_skills_analysis.is_locked && <span className="text-xs text-orange-400 ml-2">(Vista Previa Limitada)</span>}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.hard_skills_analysis.missing_keywords.map((kw, i) => (
                                            <span key={i} className="px-3 py-1 bg-red-900/20 border border-red-900/50 rounded-full text-xs text-red-300">
                                                {kw}
                                            </span>
                                        ))}
                                        {result.hard_skills_analysis.is_locked && (
                                            <span className="px-3 py-1 bg-slate-800 border border-slate-700/50 rounded-full text-xs text-slate-500 italic flex items-center gap-1">
                                                <AlertTriangle size={10} /> +{result.hard_skills_analysis.total_missing - 2} ocultas
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* LOCKED SECTION: EXPERIENCE */}
                            <div className="relative group">
                                <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">Análisis de Experiencia</h4>
                                {result.experience_analysis?.is_locked ? (
                                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 relative overflow-hidden">
                                        <div className="absolute inset-0 backdrop-blur-sm bg-black/40 flex flex-col items-center justify-center z-10">
                                            <div className="bg-slate-900 p-2 rounded-full mb-2 shadow-xl border border-blue-500/30">
                                                <AlertTriangle className="text-blue-400" />
                                            </div>
                                            <p className="text-sm font-bold text-white mb-2">Análisis Detallado Bloqueado</p>
                                            <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-4 py-2 rounded-lg text-xs hover:scale-105 transition-transform">
                                                DESBLOQUEAR PREMIUM
                                            </button>
                                        </div>
                                        {/* Fake Content for Blur Effect */}
                                        <p className="text-slate-600 blur-sm">
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore...
                                            Impacto no cuantificado en roles anteriores... falta uso de métricas claras.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900 p-4 rounded-xl text-sm text-slate-300 border border-slate-700">
                                        {result.experience_analysis?.feedback}
                                    </div>
                                )}
                            </div>

                            {/* LOCKED SECTION: SOFT SKILLS */}
                            <div className="relative">
                                <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">Soft Skills & Cultura</h4>
                                {result.soft_skills_analysis?.is_locked ? (
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 border-dashed text-center">
                                        <p className="text-xs text-slate-500 italic flex items-center justify-center gap-2">
                                            <AlertTriangle size={12} /> Disponible en versión PRO
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-300">{result.soft_skills_analysis?.feedback}</p>
                                )}
                            </div>

                            {/* Red Flags / Issues */}
                            {(result.red_flags?.length > 0) && (
                                <div>
                                    <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">🚩 Red Flags</h4>
                                    <ul className="space-y-2">
                                        {result.red_flags.map((err, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-red-300 bg-red-900/10 p-2 rounded-lg border border-red-900/30">
                                                <XCircle size={16} className="mt-0.5 min-w-[16px]" /> {err}
                                            </li>
                                        ))}
                                        {result.experience_analysis?.is_locked && (
                                            <li className="text-xs text-slate-500 italic pl-6">... y otros riesgos detectados (Bloqueado)</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Formatting Issues (Locked logic if needed, but usually open? Let's check backend) */}
                            {result.formatting_analysis?.issues?.length > 0 && (
                                <div>
                                    <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">⚠️ Formato</h4>
                                    <ul className="space-y-1">
                                        {result.formatting_analysis.issues.map((iss, i) => (
                                            <li key={i} className="text-xs text-orange-300">• {iss}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Improvement Plan */}
                            {result.improvement_plan?.length > 0 && (
                                <div>
                                    <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">🚀 Plan de Mejora</h4>
                                    <ul className="space-y-2">
                                        {result.improvement_plan.map((step, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-green-300 bg-green-900/10 p-2 rounded-lg border border-green-900/30">
                                                <CheckCircle size={16} className="mt-0.5 min-w-[16px]" /> {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.score < 80 && (
                                <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex items-center justify-center gap-2 font-mono text-sm shadow-lg shadow-purple-900/50">
                                    <AlertTriangle size={18} /> PASAR A MÓDULO II: CORRECTOR IA
                                </button>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ATSScanner;
