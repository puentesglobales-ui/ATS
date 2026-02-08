import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ArrowRight, CheckCircle, BarChart2, Brain, Activity, User, Briefcase, Play, Loader } from 'lucide-react';
import { PSYCHOMETRIC_QUESTIONS } from '../data/psychometricQuestions';
import { Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const STAGES = {
    INPUT: 'INPUT',
    TEST_DASS: 'TEST_DASS',
    TEST_FLOW: 'TEST_FLOW',
    TEST_BIG5: 'TEST_BIG5',
    LOADING: 'LOADING',
    RESULTS: 'RESULTS'
};

// --- SUB-COMPONENT FOR QUESTIONS (Fixes Conditional Hook Error) ---
const QuestionBlock = ({ questions, prefix, onAnswer, onComplete, instruction }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleLocalAnswer = (val) => {
        // Save answer to parent state
        onAnswer(prefix, questions[currentIndex].id, val);

        // Move to next or finish
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    if (!questions || questions.length === 0) return <div>Error: No questions loaded.</div>;

    const q = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="w-full bg-slate-800 h-2 rounded-full mb-8">
                <motion.div
                    className="h-full bg-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-slate-800 p-8 rounded-2xl shadow-xl text-center"
                >
                    {instruction && (
                        <p className="text-cyan-400 font-bold mb-4 uppercase tracking-widest text-sm">
                            {instruction}
                        </p>
                    )}
                    <h2 className="text-2xl font-bold mb-8 text-white">{q.text}</h2>
                    <div className="flex justify-center gap-4 flex-wrap">
                        {q.scale === 3 ? (
                            // DASS-21 (0-3)
                            [0, 1, 2, 3].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleLocalAnswer(val)}
                                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-cyan-600 text-white font-bold transition-all"
                                >
                                    {val}
                                </button>
                            ))
                        ) : (
                            // Flow/Big5 (1-5)
                            [1, 2, 3, 4, 5].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleLocalAnswer(val)}
                                    className="w-12 h-12 rounded-full bg-slate-700 hover:bg-cyan-600 text-white font-bold flex items-center justify-center transition-all"
                                >
                                    {val}
                                </button>
                            ))
                        )}
                    </div>
                    <p className="mt-4 text-slate-400 text-sm">
                        {q.scale === 3 ? "0 (No me pasó) - 3 (Me pasó mucho)" : "1 (Desacuerdo) - 5 (Acuerdo Total)"}
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const PsychometricTest = () => {
    const [stage, setStage] = useState(STAGES.INPUT);
    const [userData, setUserData] = useState({ cvText: '', jobDescription: '' });
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);

    // --- INPUT HANDLERS ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Mock PDF text extraction for MVP
        setUserData(prev => ({ ...prev, cvText: `[Simulated CV Content from ${file.name}]` }));
    };

    const handleAnswerUpdate = (prefix, id, val) => {
        setAnswers(prev => ({ ...prev, [`${prefix}_${id}`]: val }));
    };


    // --- SUBMIT ---
    const submitTest = async () => {
        setStage(STAGES.LOADING);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_URL}/api/psychometric/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, userData })
            });
            const data = await response.json();
            setResults(data);
            setStage(STAGES.RESULTS);
        } catch (error) {
            console.error(error);
            alert("Error submitting test");
            setStage(STAGES.INPUT);
        }
    };

    // Trigger submit when reaching LOADING stage (via effect or direct call)
    React.useEffect(() => {
        if (stage === STAGES.LOADING && !results) {
            submitTest();
        }
    }, [stage]);


    // --- RENDERING ---
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
            {/* STAGE: INPUT */}
            {stage === STAGES.INPUT && (
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Latam Coaching Optimization
                    </h1>
                    <p className="text-center text-slate-400 mb-12">
                        Sistema Inteligente de Alineación Laboral (Psychometrics + AI)
                    </p>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* CV UPLOAD */}
                        <div
                            className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-cyan-500 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.txt" />
                            <Upload className="w-12 h-12 text-cyan-400 mb-4" />
                            <h3 className="font-bold text-lg mb-2">Sube tu CV</h3>
                            <p className="text-sm text-slate-400">
                                {userData.cvText ? "CV Cargado Correctamente ✅" : "Arrastra o haz clic para subir PDF"}
                            </p>
                        </div>

                        {/* JOB DESCRIPTION */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <label className="flex items-center gap-2 font-bold mb-4 text-cyan-400">
                                <Briefcase size={20} /> Descripción del Puesto
                            </label>
                            <textarea
                                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                                placeholder="Pega aquí la descripción del trabajo..."
                                value={userData.jobDescription}
                                onChange={(e) => setUserData(prev => ({ ...prev, jobDescription: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <button
                            disabled={!userData.cvText || !userData.jobDescription}
                            onClick={() => setStage(STAGES.TEST_DASS)}
                            className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full text-lg shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 mx-auto"
                        >
                            Iniciar Evaluación <Play fill="currentColor" size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE: TESTS */}
            {stage === STAGES.TEST_DASS && (
                <QuestionBlock
                    questions={PSYCHOMETRIC_QUESTIONS.dass21}
                    prefix="dass"
                    instruction="Durante la última semana:"
                    onAnswer={handleAnswerUpdate}
                    onComplete={() => setStage(STAGES.TEST_FLOW)}
                />
            )}

            {stage === STAGES.TEST_FLOW && (
                <QuestionBlock
                    questions={PSYCHOMETRIC_QUESTIONS.flow}
                    prefix="flow"
                    instruction="En tu trabajo o proyecto más reciente:"
                    onAnswer={handleAnswerUpdate}
                    onComplete={() => setStage(STAGES.TEST_BIG5)}
                />
            )}

            {stage === STAGES.TEST_BIG5 && (
                <QuestionBlock
                    questions={PSYCHOMETRIC_QUESTIONS.big5}
                    prefix="big5"
                    instruction="Descríbete a ti mismo honestamente:"
                    onAnswer={handleAnswerUpdate}
                    onComplete={() => setStage(STAGES.LOADING)}
                />
            )}

            {/* STAGE: LOADING */}
            {stage === STAGES.LOADING && (
                <div className="h-screen flex flex-col items-center justify-center">
                    <Loader className="w-16 h-16 text-cyan-500 animate-spin mb-6" />
                    <h2 className="text-2xl font-bold">Analizando Compatibilidad...</h2>
                    <p className="text-slate-400">Procesando 107 puntos de data + CV + Job Description</p>
                </div>
            )}

            {/* STAGE: RESULTS DASHBOARD */}
            {stage === STAGES.RESULTS && results && (
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Reporte de Compatibilidad</h1>
                            <p className="text-slate-400">Análisis 360° completado</p>
                        </div>
                        <div className="bg-slate-800 px-6 py-3 rounded-xl border border-slate-700 text-center">
                            <span className="block text-xs text-slate-400 uppercase tracking-widest">Match Score</span>
                            <span className="text-3xl font-bold text-cyan-400">{results.ai_report.porcentaje_match}%</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: CHARTS */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* DASS CHART */}
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-red-400" /> Salud Mental (DASS-21)</h3>
                                <div className="h-48">
                                    <Bar
                                        data={{
                                            labels: ['Stress', 'Anxiety', 'Depression'],
                                            datasets: [{
                                                label: 'Nivel',
                                                data: [results.scores.dass.stress, results.scores.dass.anxiety, results.scores.dass.depression],
                                                backgroundColor: ['#f87171', '#fbbf24', '#60a5fa']
                                            }]
                                        }}
                                        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 42 } } }}
                                    />
                                </div>
                            </div>

                            {/* FLOW CHART */}
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={18} className="text-purple-400" /> Flow State</h3>
                                <div className="text-center mb-4">
                                    <span className="text-4xl font-bold text-purple-400">{results.scores.flow.average}</span>
                                    <span className="text-sm text-slate-400"> / 5.0</span>
                                </div>
                                {/* Could add radar for flow dimensions if detail needed */}
                            </div>
                        </div>

                        {/* MIDDLE COLUMN: RADAR */}
                        <div className="lg:col-span-1 bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col">
                            <h3 className="font-bold mb-6 text-center text-lg">Perfil de Personalidad (Big 5)</h3>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-full max-w-sm">
                                    <Radar
                                        data={{
                                            labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
                                            datasets: [{
                                                label: 'Candidato',
                                                data: [
                                                    results.scores.big5.openness,
                                                    results.scores.big5.conscientiousness,
                                                    results.scores.big5.extraversion,
                                                    results.scores.big5.agreeableness,
                                                    results.scores.big5.neuroticism
                                                ],
                                                backgroundColor: 'rgba(34, 211, 238, 0.2)',
                                                borderColor: '#22d3ee',
                                                pointBackgroundColor: '#22d3ee',
                                            }]
                                        }}
                                        options={{
                                            scales: { r: { min: 0, max: 5, ticks: { display: false } } }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: AI ANALYSIS */}
                        <div className="lg:col-span-1 bg-gradient-to-b from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 space-y-6">
                            <h3 className="font-bold mb-2 flex items-center gap-2 text-cyan-400"><Brain size={20} /> Veredicto de Inteligencia Artificial</h3>

                            <div className="bg-black/20 p-4 rounded-xl">
                                <h4 className="text-sm font-bold text-slate-300 mb-2 uppercase">Análisis de Brechas</h4>
                                <ul className="list-disc pl-4 text-sm text-slate-400 space-y-1">
                                    {results.ai_report.analisis_brechas.map((gap, i) => (
                                        <li key={i}>{gap}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-black/20 p-4 rounded-xl">
                                <h4 className="text-sm font-bold text-slate-300 mb-2 uppercase">Ajuste Cultural</h4>
                                <p className="text-sm text-slate-400 italic">"{results.ai_report.ajuste_cultural}"</p>
                            </div>

                            <div className="bg-cyan-900/20 p-4 rounded-xl border border-cyan-800/50">
                                <h4 className="text-sm font-bold text-cyan-300 mb-2 uppercase">Guía de Entrevista Sugerida</h4>
                                <ul className="space-y-2">
                                    {results.ai_report.guia_entrevista.map((q, i) => (
                                        <li key={i} className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded">
                                            ❓ {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PsychometricTest;
