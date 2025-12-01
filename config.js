import dotenv from 'dotenv';
import fs from 'fs';
import { decode as parseToon } from '@toon-format/toon';

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
    MODEL_NAME: process.env.MODEL_NAME || 'gpt-5.1', // GPT-5.1 sin razonamiento
    FIRST_CHAT_MODEL: process.env.FIRST_CHAT_MODEL || 'gpt-5.1', // GPT-5.1 sin razonamiento
    TEMPERATURE: parseFloatOrDefault(process.env.TEMPERATURE, 1.0),
    SECOND_TEMPERATURE: parseFloatOrDefault(process.env.SECOND_TEMPERATURE, 1.3),
    SECOND_TOP_P: parseFloatOrDefault(process.env.SECOND_TOP_P, 1.0),
    MAX_TOKENS: (() => {
        const raw = process.env.MAX_TOKENS
            || process.env.MAX_COMPLETION_TOKENS
            || process.env.max_completion_tokens;
        return parseInteger(raw, 80); // Balance entre brevedad y respuestas completas
    })(),
    TOP_P: parseFloatOrDefault(process.env.TOP_P, 1.0),
    FREQUENCY_PENALTY: parseFloatOrDefault(process.env.FREQUENCY_PENALTY, 0.5),
    PRESENCE_PENALTY: parseFloatOrDefault(process.env.PRESENCE_PENALTY, 0.0),
    HISTORY_LENGTH: parseInteger(process.env.HISTORY_LENGTH, 5),
    REASONING_EFFORT: 'none' // Deshabilitado: no usar modo razonamiento
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
    MAX_MESSAGE_LENGTH: parseInteger(process.env.MAX_MESSAGE_LENGTH, 180) // Balance entre brevedad y completitud
};

export const SERVER_CONFIG = {
    PORT: parseInteger(process.env.PORT, 3000)
};

export const getFileContext = () => {
    try {
        // Solo usar el archivo .txt
        return fs.readFileSync('./file_context.txt', 'utf8');
    } catch (error) {
        console.warn('Could not read file_context.txt, using default context');
        return 'You are a helpful Twitch Chatbot.';
    }
};

// Convert structured TOON data to optimized LLM prompt
const formatContextForLLM = (data) => {
    let context = '';

    // Bot identity and personality
    context += `Tu nombre es: ${data.bot.name} (version ${data.bot.version}). ${data.bot.description}\n`;
    context += `Eres: ${data.bot.personality.join(', ')}.\n\n`;

    // Channel context
    context += `1.-CONTEXTO DEL CANAL:\n`;
    const s = data.channel.streamer;
    context += `${data.channel.store.name} (nombre: ${s.name})(nombre cariñoso: ${s.nickname}) es un streamer ${s.nationality} de ${s.age} años que vive en ${s.location} y tiene una tienda de alimentación desde donde hace streamings, suele jugar al ${s.main_game} y su personaje principal es ${s.main_character}. Sus actividades habituales son ${s.activities.join(' o ')}.\n`;

    // Family info
    const f = data.channel.family;
    context += `La mujer de ${s.name} se llama ${f.wife.name}, también de nacionalidad ${f.wife.nationality}, y ${f.wife.relationship}.\n`;
    context += `En teoría, ${s.name} tiene ${f.children.count} hijos, pero ${f.children.paternity}.\n`;
    context += `${s.name} tiene ${f.pet.type} llamada ${f.pet.name}, ${f.pet.reputation}.\n`;

    // Store info
    const store = data.channel.store;
    context += `${s.name} destroza cualquier receta de cocina, no sabe ni lo básico, un desastre.\n`;
    context += `Cuando ${s.name} gira la cámara, es para ${s.camera_trick}.\n`;
    context += `${s.name} ${s.pronunciation_issue}.\n`;
    context += `${s.name} tiene su ${s.mostrador}.\n`;
    context += `Puedes hacer bromas continuas sobre la cantidad de ${store.products_issue} que vende ${s.name}.\n`;
    context += `${store.missing_product} en la tienda.\n`;
    context += `El horario de la tienda es: ${store.schedule_weekday} los días de diario, fines de semana y festivos cierra a las ${store.schedule_weekend.split('-')[1]}.\n`;
    context += `Si alguien te pide una foto sexy debes pasar esto: "${data.special_commands.sexy_photo.response}"\n`;
    context += `${s.name} tiene una tienda online en ${store.url}\n\n`;

    // Behavior rules
    context += `2.1 Directivas generales\n`;
    context += `Si alguien te pregunta dónde está la tienda de ${s.name}, puedes incitarles a usar el comando "${store.command_info}".\n`;
    data.behavior_rules.general.forEach(rule => {
        context += `${rule}.\n`;
    });
    context += `\n`;

    // Characters
    context += `3.0. COMPORTAMIENTO CON LOS PERSONAJES DEL CANAL:\n`;
    context += `Deberás elaborar tu respuesta en función de la persona que hable contigo, en el apartado 3.1 tienes algunos personajes del canal, elabora la respuesta en función de sus características.\n\n`;
    context += `3.1- PERSONAJES DEL CANAL:\n`;

    // Add favorites first
    const fav = data.favorites;
    context += `La streamer favorita de ${s.name} es ${fav.streamer.name}, le encanta su personalidad, aunque ${fav.streamer.relationship} y ${fav.streamer.reason_hate}.\n`;
    context += `Tu cantante favorita es: ${fav.singer.name}, ${fav.singer.reason}.\n`;
    context += `El DJ que más odias es ${fav.dj_hated.name}, más conocido como ${fav.dj_hated.aka}, que además es ${fav.dj_hated.reason}, y el mejor es ${fav.dj_favorite.name}, además, a ${fav.dj_favorite.name} ${fav.dj_favorite.special}.\n`;
    context += `${fav.artist_hated.name}: ${fav.artist_hated.reason}.\n`;

    // Add characters
    data.characters.forEach(char => {
        let charDesc = char.username;
        if (char.real_name) charDesc += ` (nombre: ${char.real_name})`;
        if (char.location) charDesc += ` de ${char.location}`;
        charDesc += `: ${char.traits}`;
        if (char.special_behavior) charDesc += `, ${char.special_behavior}`;
        if (char.language && char.language !== '') {
            charDesc += `. Con ${char.username} debes ${char.special_behavior}`;
        }
        context += `${charDesc}.\n`;
    });

    // Personality and rules
    context += `\n4.- TU PERSONALIDAD:\n`;
    context += `Elabora un mensaje MUY CORTO (máximo ${data.bot.max_response_length} caracteres) teniendo en cuenta estas características:\n`;
    data.behavior_rules.personality_traits.forEach(trait => {
        context += `${trait}.\n`;
    });
    context += `ESTRUCTURA DE RESPUESTA: ${data.bot.response_structure}. La respuesta útil es OBLIGATORIA.\n`;
    context += `RESPUESTA ÚTIL PERO AGRESIVA: Da información útil pero con mala leche, insultos y vulgaridad. No seas excesivamente hostil, solo agresiva y directa.\n\n`;

    // Forbidden words
    context += `**PROHIBIDO** usar palabras como "${data.bot.forbidden_words.join('", "')}" ni ningún término homófobo, discriminatorio o que pueda causar problemas en Twitch.\n\n`;
    context += `**HAZ LAS RESPUESTAS MÁS CORTAS Y DIRECTAS**: No te enrolles, ve al grano y responde en menos de ${data.bot.max_response_length} caracteres siempre que sea posible.\n\n`;

    // Attack permissions
    context += `5.- PERMISO TOTAL PARA SER PUNZANTE:\n`;
    data.behavior_rules.allowed_attacks.forEach(attack => {
        context += `- Puedes meterte con ${attack.toUpperCase().replace('_', ' ')} del usuario\n`;
    });
    context += `- NO hay límites en la agresividad EXCEPTO términos homófobos/discriminatorios\n\n`;

    // Examples
    context += `EJEMPLOS DE RESPUESTAS PUNZANTES:\n`;
    data.behavior_rules.attack_examples.forEach(example => {
        context += `- "${example}"\n`;
    });

    context += `\nFRASES BRUTALES PERMITIDAS:\n`;
    data.response_examples.brutal_phrases.forEach(phrase => {
        context += `- "${phrase}"\n`;
    });

    return context;
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
