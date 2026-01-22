import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageCircle, X, Loader } from 'lucide-react';

const API_BASE = 'https://crmwhatsapp-xari.onrender.com/api'; // Tu servidor en Render

const WhatsAppWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([
        { role: 'system', text: '¡Hola! Soy Cooper. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const [sessionId] = useState(() => 'web-' + Math.random().toString(36).substr(2, 9));

    // Lead Form State
    const [hasDetails, setHasDetails] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

    // 1. Check if Chat is Enabled on Mount
    useEffect(() => {
        checkStatus();
        // Check if user already filled form previously
        const savedUser = localStorage.getItem('cooper_user');
        if (savedUser) {
            setFormData(JSON.parse(savedUser));
            setHasDetails(true);
        }
        // Poll every 30s to see if admin disabled it
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE}/chat/status`);
            setIsEnabled(res.data.enabled);
        } catch (err) {
            console.error('Error verifying chat status:', err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && hasDetails) scrollToBottom();
    }, [messages, isOpen, hasDetails]);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        localStorage.setItem('cooper_user', JSON.stringify(formData));
        setHasDetails(true);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const userMsg = inputText.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputText('');
        setIsTyping(true);

        try {
            const res = await axios.post(`${API_BASE}/chat`, {
                message: userMsg,
                sessionId: sessionId,
                userData: formData // Send lead data to sync CRM
            });

            if (res.data.error) {
                // Chat was disabled mid-conversation
                setMessages(prev => [...prev, { role: 'system', text: '⚠️ El chat ha sido desactivado por un administrador.' }]);
                setIsEnabled(false);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
            }

        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, { role: 'system', text: 'Lo siento, hubo un error de conexión.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    // If disabled, don't render anything (or render hidden)
    if (!loading && !isEnabled) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col mb-4 overflow-hidden border border-gray-200 animate-in fade-in slide-in-from-bottom-10 duration-300">

                    {/* Header */}
                    <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-lg">
                                    C
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-bold">Cooper AI</h3>
                                <p className="text-xs text-slate-400">Career Mastery Engine</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {!hasDetails ? (
                        // LEAD CAPTURE FORM
                        <div className="p-6 bg-gray-50">
                            <h4 className="font-bold text-gray-800 mb-2">¡Hola! 👋</h4>
                            <p className="text-sm text-gray-600 mb-4">Para ayudarte mejor y guardarte en nuestro sistema, por favor dinos quién eres.</p>

                            <form onSubmit={handleFormSubmit} className="space-y-3">
                                <input
                                    required
                                    type="text"
                                    placeholder="Tu Nombre"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <input
                                    required
                                    type="email"
                                    placeholder="Tu Email"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <input
                                    required
                                    type="tel"
                                    placeholder="Tu Whatsapp (con código de país)"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white text-black"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition-colors">
                                    Iniciar Chat
                                </button>
                            </form>
                            <p className="text-xs text-gray-400 mt-4 text-center">Tus datos están seguros con nosotros.</p>
                        </div>
                    ) : (
                        // CHAT INTERFACE
                        <>
                            {/* Messages Area */}
                            <div className="h-80 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white self-end rounded-br-none'
                                            : 'bg-white border border-gray-200 text-gray-800 self-start rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="self-start bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                                        <Loader className="animate-spin text-slate-400" size={16} />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Escribe tu consulta..."
                                    className="flex-1 bg-gray-100 text-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || isTyping}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded-full transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}

                    <div className="bg-gray-50 p-2 text-center">
                        <p className="text-[10px] text-gray-400">Powered by OpenAI & WhatsApp Cloud API</p>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
            </button>
        </div>
    );
};

export default WhatsAppWidget;
