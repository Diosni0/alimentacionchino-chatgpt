import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const parseInteger = (value, defaultValue) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const parseFloatOrDefault = (value, defaultValue) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
};

const parseBoolean = (value, defaultValue) => {
    if (value === undefined) return defaultValue;
    if (typeof value === 'boolean') return value;
    const normalized = value.toString().trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return defaultValue;
};

const parseStringList = (value, defaultValue) => {
    if (!value) return defaultValue;
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
};

export const OPENAI_CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL_NAME: process.env.MODEL_NAME || 'gpt-4o',
    FIRST_CHAT_MODEL: process.env.FIRST_CHAT_MODEL || 'gpt-4o',
    TEMPERATURE: parseFloatOrDefault(process.env.TEMPERATURE, 1.0),
    SECOND_TEMPERATURE: parseFloatOrDefault(process.env.SECOND_TEMPERATURE, 1.3),
    SECOND_TOP_P: parseFloatOrDefault(process.env.SECOND_TOP_P, 1.0),
    MAX_TOKENS: (() => {
        const raw = process.env.MAX_TOKENS
            || process.env.MAX_COMPLETION_TOKENS
            || process.env.max_completion_tokens;
        return parseInteger(raw, 200);
    })(),
    TOP_P: parseFloatOrDefault(process.env.TOP_P, 1.0),
    FREQUENCY_PENALTY: parseFloatOrDefault(process.env.FREQUENCY_PENALTY, 0.5),
    PRESENCE_PENALTY: parseFloatOrDefault(process.env.PRESENCE_PENALTY, 0.0),
    HISTORY_LENGTH: parseInteger(process.env.HISTORY_LENGTH, 5)
};

export const TWITCH_CONFIG = {
    USERNAME: process.env.TWITCH_USER || 'oSetinhasBot',
    OAUTH_TOKEN: process.env.TWITCH_AUTH || '',
    CLIENT_ID: process.env.TWITCH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || '',
    CHANNELS: parseStringList(process.env.CHANNELS, ['oSetinhas']),
    SUBSCRIBERS_ONLY: parseBoolean(process.env.SUBSCRIBERS_ONLY, false),
    MODERATORS_BYPASS: parseBoolean(process.env.MODERATORS_BYPASS, true)
};

export const BOT_CONFIG = {
    GPT_MODE: process.env.GPT_MODE || 'CHAT',
    COMMAND_NAME: parseStringList(process.env.COMMAND_NAME, ['!gpt']).map(cmd => cmd.toLowerCase()),
    SEND_USERNAME: parseBoolean(process.env.SEND_USERNAME, true),
    ENABLE_TTS: parseBoolean(process.env.ENABLE_TTS, false),
    ENABLE_CHANNEL_POINTS: parseBoolean(process.env.ENABLE_CHANNEL_POINTS, false),
    COOLDOWN_DURATION: parseInteger(process.env.COOLDOWN_DURATION, 10),
    MAX_MESSAGE_LENGTH: parseInteger(process.env.MAX_MESSAGE_LENGTH, 450)
};

export const SERVER_CONFIG = {
    PORT: parseInteger(process.env.PORT, 3000)
};

export const getFileContext = () => {
    try {
        return fs.readFileSync('./file_context.txt', 'utf8');
    } catch (error) {
        console.warn('Could not read file_context.txt, using default context');
        return 'You are a helpful Twitch Chatbot.';
    }
};

export const validateConfig = () => {
    const errors = [];

    if (!OPENAI_CONFIG.API_KEY) {
        errors.push('OPENAI_API_KEY is required');
    }

    if (!TWITCH_CONFIG.OAUTH_TOKEN) {
        errors.push('TWITCH_AUTH is required');
    }

    if (TWITCH_CONFIG.SUBSCRIBERS_ONLY && (!TWITCH_CONFIG.CLIENT_ID || !TWITCH_CONFIG.CLIENT_SECRET)) {
        errors.push('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required when SUBSCRIBERS_ONLY is enabled');
    }

    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        return false;
    }

    return true;
};
