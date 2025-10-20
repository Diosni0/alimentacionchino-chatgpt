import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const parseInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatOrDefault = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = value.toString().trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
    return fallback;
};

const parseList = (value) => {
    if (!value) return [];
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
};

export const OPENAI_CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL: process.env.MODEL_NAME || 'gpt-4o-mini',
    TEMPERATURE: parseFloatOrDefault(process.env.TEMPERATURE, 1.0),
    TOP_P: parseFloatOrDefault(process.env.TOP_P, 1.0),
    MAX_TOKENS: parseInteger(process.env.MAX_TOKENS, 250),
    FREQUENCY_PENALTY: parseFloatOrDefault(process.env.FREQUENCY_PENALTY, 0.0),
    PRESENCE_PENALTY: parseFloatOrDefault(process.env.PRESENCE_PENALTY, 0.0)
};

export const TELEGRAM_CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    ADMIN_USERS: parseList(process.env.ADMIN_USERS),
    ALLOWED_GROUPS: parseList(process.env.ALLOWED_GROUPS),
    COOLDOWN_SECONDS: parseInteger(process.env.COOLDOWN_SECONDS, 10)
};

export const BOT_CONFIG = {
    MAX_MESSAGE_LENGTH: parseInteger(process.env.MAX_MESSAGE_LENGTH, 450),
    HISTORY_LENGTH: parseInteger(process.env.HISTORY_LENGTH, 5),
    SEND_USERNAME: parseBoolean(process.env.SEND_USERNAME, true)
};

export const SERVER_CONFIG = {
    PORT: parseInteger(process.env.PORT, 3000)
};

export const loadBotContext = () => {
    try {
        return fs.readFileSync('./bot_context.txt', 'utf8');
    } catch (error) {
        console.warn('Could not read bot_context.txt, using fallback personality');
        return 'You are an aggressive Telegram bot that replies with very short insults.';
    }
};

export const validateConfig = () => {
    const errors = [];

    if (!OPENAI_CONFIG.API_KEY) {
        errors.push('OPENAI_API_KEY is required');
    }

    if (!TELEGRAM_CONFIG.BOT_TOKEN) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }

    if (TELEGRAM_CONFIG.ADMIN_USERS.length === 0) {
        errors.push('ADMIN_USERS must include at least one Telegram user id');
    }

    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        return false;
    }

    return true;
};
