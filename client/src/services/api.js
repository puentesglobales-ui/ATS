import axios from 'axios';

const getBaseUrl = () => {
    // If we are NOT on localhost, we should use the cloud backend anyway
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (import.meta.env.PROD || !isLocal) {
        // Fallback al servidor real confirmado por el usuario
        return import.meta.env.VITE_API_URL || 'https://ats-backend-l95k.onrender.com/api';
    }

    // Localhost fallback solo si estamos físicamente en la máquina local
    return 'http://localhost:3000/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    timeout: 60000, // 60 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Get available scenarios
export const getScenarios = async () => {
    const response = await api.get('/scenarios');
    return response.data;
};

export const sendMessage = async (messages, scenarioId, userId) => {
    const response = await api.post('/chat', { messages, scenarioId, userId });
    return response.data;
};

export const sendAudio = async (audioBlob, scenarioId, userId) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'input.webm');
    if (scenarioId) {
        formData.append('scenarioId', scenarioId);
    }
    if (userId) {
        formData.append('userId', userId);
    }

    // Let Axios/Browser set the correct multipart content-type with boundary
    const response = await api.post('/speak', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export default api;
