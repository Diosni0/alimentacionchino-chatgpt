import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';
import { BOT_CONFIG, OPENAI_CONFIG, TELEGRAM_CONFIG, loadBotContext } from './config.js';

const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class TelegramAIBot {
    constructor() {
        this.bot = null;
        this.botId = null;
        this.botUsername = null;
        this.botMention = null;

        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });
        this.context = loadBotContext();

        this.chatHistories = new Map();
        this.userCooldowns = new Map();
        this.responseCache = new Map();

        this.metrics = {
            processed: 0,
            errors: 0,
            cacheHits: 0,
            lastResponseAt: null
        };
    }

    async start() {
        this.bot = new TelegramBot(TELEGRAM_CONFIG.BOT_TOKEN, {
            polling: true,
            request: {
                agentOptions: {
                    keepAlive: true,
                    family: 4
                }
            }
        });

        const info = await this.bot.getMe();
        this.botId = info.id;
        this.botUsername = info.username ? info.username.toLowerCase() : null;
        this.botMention = this.botUsername ? `@${this.botUsername}` : null;

        console.log(`🤖 Bot ready as @${info.username} (${info.first_name})`);

        this.bot.on('message', (msg) => this.handleMessage(msg));
        this.bot.on('new_chat_members', (msg) => this.handleNewMembers(msg));
        this.bot.on('polling_error', (error) => console.error('[bot] Polling error:', error.message));
        this.bot.on('error', (error) => console.error('[bot] Client error:', error.message));

        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    async stop() {
        if (!this.bot) return;
        await this.bot.stopPolling();
        console.log('🛑 Bot polling stopped');
    }

    async handleNewMembers(msg) {
        if (!msg.new_chat_members || msg.new_chat_members.length === 0) return;
        const botEntry = msg.new_chat_members.find(member => member.id === this.botId);

        if (!botEntry) return;

        const inviterId = msg.from?.id ? msg.from.id.toString() : null;
        const allowed = TELEGRAM_CONFIG.ADMIN_USERS;

        if (!inviterId || !allowed.includes(inviterId)) {
            try {
                await this.bot.sendMessage(msg.chat.id, 'Solo mi creador puede meterme en grupos. Me piro. 🤬');
            } catch (error) {
                console.error('[bot] Failed to send unauthorized message:', error.message);
            }

            try {
                await this.bot.leaveChat(msg.chat.id);
            } catch (error) {
                console.error('[bot] Failed to leave chat:', error.message);
            }
            return;
        }

        const username = botEntry.username || this.botUsername || 'bot';
        const greeting = [
            '¡Hola putos! Soy M-IA Khalifa V2 🔥',
            `Para hablar conmigo, menciónenme con @${username}`,
            `Ejemplo: @${username} ¿cómo estás?`
        ].join('\n');

        try {
            await this.bot.sendMessage(msg.chat.id, greeting);
        } catch (error) {
            console.error('[bot] Failed to send greeting:', error.message);
        }
    }

    async handleMessage(msg) {
        if (!msg || msg.from?.is_bot) return;

        this.metrics.processed += 1;

        if (!this.shouldRespond(msg)) return;
        if (!this.isAllowedChat(msg.chat?.id)) return;

        const userId = msg.from.id.toString();
        if (!this.checkCooldown(userId)) return;

        const prepared = this.prepareUserText(msg);
        const cacheKey = `${msg.chat.id}:${prepared}`;

        try {
            const cached = this.getFromCache(cacheKey);
            let response;

            if (cached) {
                this.metrics.cacheHits += 1;
                response = cached;
            } else {
                response = await this.generateResponse(prepared, msg.chat.id);
                this.addToCache(cacheKey, response);
            }

            await this.bot.sendMessage(msg.chat.id, response, {
                reply_to_message_id: msg.message_id,
                parse_mode: 'HTML'
            });

            this.metrics.lastResponseAt = new Date().toISOString();
        } catch (error) {
            this.metrics.errors += 1;
            console.error('[bot] Failed to process message:', error);
            try {
                await this.bot.sendMessage(msg.chat.id, 'Joder, me petaste. Intenta otra vez más tarde.', {
                    reply_to_message_id: msg.message_id
                });
            } catch (sendError) {
                console.error('[bot] Failed to send error message:', sendError.message);
            }
        }
    }

    shouldRespond(msg) {
        if (!msg) return false;

        const chatType = msg.chat?.type;
        if (chatType === 'private') return true;

        if (!this.botMention) return false;

        if (msg.reply_to_message?.from?.id === this.botId) {
            return true;
        }

        const entities = msg.entities || msg.caption_entities || [];
        const text = (msg.text || msg.caption || '').toLowerCase();

        for (const entity of entities) {
            if (entity.type === 'mention') {
                const mention = text.substring(entity.offset, entity.offset + entity.length);
                if (mention === this.botMention) return true;
            }
            if (entity.type === 'text_mention' && entity.user?.id === this.botId) {
                return true;
            }
            if (entity.type === 'bot_command') {
                const command = text.substring(entity.offset, entity.offset + entity.length);
                if (command.includes(this.botMention)) return true;
            }
        }

        return text.includes(this.botMention);
    }

    isAllowedChat(chatId) {
        if (!chatId) return false;
        if (TELEGRAM_CONFIG.ALLOWED_GROUPS.length === 0) return true;
        return TELEGRAM_CONFIG.ALLOWED_GROUPS.includes(chatId.toString());
    }

    checkCooldown(userId) {
        const now = Date.now();
        const cooldownMs = TELEGRAM_CONFIG.COOLDOWN_SECONDS * 1000;
        const last = this.userCooldowns.get(userId) || 0;

        if (now - last < cooldownMs) {
            return false;
        }

        this.userCooldowns.set(userId, now);
        return true;
    }

    prepareUserText(msg) {
        const text = (msg.text || msg.caption || '').trim();
        let cleaned = text;

        if (this.botMention) {
            const mentionRegex = new RegExp(`^${this.botMention}\\s*`, 'i');
            cleaned = cleaned.replace(mentionRegex, '');
        }

        const username = msg.from?.username || msg.from?.first_name || 'anon';
        if (BOT_CONFIG.SEND_USERNAME) {
            return `Mensaje de ${username}: ${cleaned || 'Hola'}`;
        }

        return cleaned || 'Hola';
    }

    async generateResponse(userText, chatId) {
        const history = this.getChatHistory(chatId);
        const maxTokens = Math.min(
            Math.ceil(BOT_CONFIG.MAX_MESSAGE_LENGTH / 4) + 20,
            OPENAI_CONFIG.MAX_TOKENS
        );

        const messages = [
            { role: 'system', content: this.context },
            ...history,
            { role: 'user', content: userText }
        ];

        console.log('[bot] Sending prompt to OpenAI', {
            chatId,
            history: history.length,
            maxTokens
        });

        const response = await this.openai.chat.completions.create({
            model: OPENAI_CONFIG.MODEL,
            messages,
            temperature: OPENAI_CONFIG.TEMPERATURE,
            top_p: OPENAI_CONFIG.TOP_P,
            max_tokens: maxTokens,
            frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
            presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY
        });

        const choice = response.choices?.[0];
        const content = choice?.message?.content?.trim();

        if (!content) {
            throw new Error('OpenAI returned empty content');
        }

        const trimmed = this.truncateResponse(content);
        this.updateHistory(chatId, userText, trimmed);
        return trimmed;
    }

    getChatHistory(chatId) {
        if (!this.chatHistories.has(chatId)) {
            this.chatHistories.set(chatId, []);
        }
        return this.chatHistories.get(chatId);
    }

    updateHistory(chatId, userText, botReply) {
        const history = this.getChatHistory(chatId);
        history.push({ role: 'user', content: userText });
        history.push({ role: 'assistant', content: botReply });

        const maxHistoryEntries = BOT_CONFIG.HISTORY_LENGTH * 2;
        while (history.length > maxHistoryEntries) {
            history.shift();
        }
    }

    truncateResponse(text) {
        const limit = BOT_CONFIG.MAX_MESSAGE_LENGTH;
        if (text.length <= limit) return text;

        const truncated = text.slice(0, limit - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > limit * 0.8) {
            return `${truncated.slice(0, lastSpace)}...`;
        }
        return `${truncated}...`;
    }

    getFromCache(key) {
        const cached = this.responseCache.get(key);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > CACHE_TTL) {
            this.responseCache.delete(key);
            return null;
        }
        return cached.value;
    }

    addToCache(key, value) {
        if (this.responseCache.size >= MAX_CACHE_SIZE) {
            const firstKey = this.responseCache.keys().next().value;
            this.responseCache.delete(firstKey);
        }
        this.responseCache.set(key, { value, timestamp: Date.now() });
    }

    cleanup() {
        const now = Date.now();
        const cooldownMs = TELEGRAM_CONFIG.COOLDOWN_SECONDS * 1000;

        for (const [userId, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > cooldownMs) {
                this.userCooldowns.delete(userId);
            }
        }

        for (const [key, cached] of this.responseCache.entries()) {
            if (now - cached.timestamp > CACHE_TTL) {
                this.responseCache.delete(key);
            }
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            cachedResponses: this.responseCache.size,
            trackedChats: this.chatHistories.size,
            cooldownEntries: this.userCooldowns.size
        };
    }
}
