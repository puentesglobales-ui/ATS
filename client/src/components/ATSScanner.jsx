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
        if (inputMode === 'pdf' && !file) {
            setError('Please upload a CV PDF.');
            return;
        }
        if (inputMode === 'text' && !cvText.trim()) {
            setError('Por favor pega el texto de tu CV.');
            return;
        }
        if (!jobDescription.trim()) {
            setError('Please provide a Job Description.');
            return;
        }

        setAnalyzing(true);
        setError('');
        setResult(null);

        try {
            // SIMULATION MODE (Text Input)
            if (inputMode === 'text') {
                // Simulate delay to feel like "AI processing"
                await new Promise(r => setTimeout(r, 1500));

                // Safe execution wrapper
                try {
                    const simResult = analyzeATS(cvText, jobDescription);
                    setResult(simResult);
                } catch (logicError) {
                    console.error("Logic Error:", logicError);
                    setError("Error interno en el motor de análisis. Intenta con otro texto.");
                }
            }
            // REAL API MODE (File Upload)
            else {
                const formData = new FormData();
                formData.append('cv', file);
                formData.append('jobDescription', jobDescription);
                if (session && session.user) {
                    formData.append('userId', session.user.id);
                }

                const response = await api.post('/analyze-cv', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setResult(response.data);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to analyze CV. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
            >
                AI Career Mastery Engine
            </motion.h1>
            <p className="text-slate-400 mb-8">Paso 1: Auditoría ATS & Filtro de Calidad</p>

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
                            Pegar Texto (Simulador)
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
                        {analyzing ? 'Procesando Lógica ATS...' : 'EJECUTAR SIMULACIÓN ATS'}
                    </button>
                    {error && <p className="text-red-400 text-center">{error}</p>}
                </div>

                {/* RESULTS SECTION */}
                <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl relative overflow-hidden">
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
                            {/* Score Circle */}
                            <div className="flex justify-center mb-4">
                                <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center shadow-xl ${result.score >= 80 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-500'}`}>
                                    <div className="text-center">
                                        <span className="block text-4xl font-extrabold">{result.score}</span>
                                        <span className="text-xs font-bold uppercase">ATS Score</span>
                                    </div>
                                </div>
                            </div>

                            {/* Gate Message */}
                            <div className={`p-4 rounded-xl text-center font-bold ${result.score >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {result.score >= 80
                                    ? '✅ APROBADO: Acceso a Entrevista y Certificación.'
                                    : '⛔ BLOQUEADO: Tu CV necesita optimización urgente.'}
                            </div>

                            {/* Missing Keywords */}
                            <div>
                                <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">Palabras Clave Faltantes</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.missing_keywords?.map((kw, i) => (
                                        <span key={i} className="px-3 py-1 bg-slate-700 rounded-full text-xs text-slate-300 border border-slate-600">
                                            {kw}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Critical Errors */}
                            <div>
                                <h4 className="text-slate-400 text-sm uppercase font-bold mb-2">Errores Críticos</h4>
                                <ul className="space-y-2">
                                    {result.critical_errors?.map((err, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-red-300 bg-red-900/10 p-2 rounded-lg">
                                            <XCircle size={16} className="mt-0.5 min-w-[16px]" /> {err}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-900 p-4 rounded-xl text-sm text-slate-300 leading-relaxed border border-slate-700">
                                <span className="text-blue-400 font-bold">Feedback IA:</span> {result.feedback_summary}
                            </div>

                            {result.score < 80 && (
                                <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex items-center justify-center gap-2">
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
