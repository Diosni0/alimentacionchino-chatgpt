import tmi from 'tmi.js';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import { TWITCH_CONFIG, OPENAI_CONFIG, getFileContext, BOT_CONFIG } from './config.js';

/**
 * Clean and elegant Twitch AI Bot
 * Combines all optimizations in a single, maintainable class
 */
export class TwitchBot {
    constructor() {
        this.client = null;
        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });

        // User management
        this.subscribers = new Set();
        this.moderators = new Set();
        this.userCooldowns = new Map();
        // Track first interaction per user
        this.firstInteractionSeen = new Set();

        // Intelligent caching
        this.cache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes
        this.MAX_CACHE_SIZE = 50;

        // Chat history with circular buffer
        const fileContext = getFileContext();
        console.log('­ƒôä Context loaded:', fileContext.substring(0, 100) + '...');
        this.chatHistory = [{ role: 'system', content: fileContext }];
        this.MAX_HISTORY = OPENAI_CONFIG.HISTORY_LENGTH * 2 + 1;

        console.log('­ƒôè History config:', {
            HISTORY_LENGTH: OPENAI_CONFIG.HISTORY_LENGTH,
            MAX_HISTORY: this.MAX_HISTORY,
            formula: 'HISTORY_LENGTH * 2 + 1 (system message)'
        });

        // Rate limiting
        this.apiCalls = 0;
        this.resetTime = Date.now() + 60000;

        // Simple metrics
        this.metrics = { processed: 0, errors: 0, cacheHits: 0 };
    }

    async initialize() {
        this.client = new tmi.client({
            connection: {
                reconnect: true,
                secure: true,
                timeout: 180000,
                reconnectDecay: 1.4,
                reconnectInterval: 2000,
                maxReconnectAttempts: Infinity,
                maxReconnectInARow: 10
            },
            identity: {
                username: TWITCH_CONFIG.USERNAME,
                password: TWITCH_CONFIG.OAUTH_TOKEN
            },
            channels: TWITCH_CONFIG.CHANNELS
        });

        this.setupEvents();
        await this.client.connect();
        this.startCleanup();
        this.startConnectionMonitor();

        console.log('­ƒñû Bot connected successfully!');
    }

    startConnectionMonitor() {
        // Monitor connection every 2 minutes
        setInterval(() => {
            if (this.client) {
                const state = this.client.readyState();
                if (state !== 'OPEN') {
                    console.log(`ÔÜá´©Å Bot connection state: ${state}, attempting reconnection...`);
                    this.client.connect().catch(err => {
                        console.error('ÔØî Auto-reconnection failed:', err.message);
                    });
                }
            }
        }, 120000); // 2 minutes
    }

    setupEvents() {
        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('subscription', (_, username) => this.subscribers.add(username));
        this.client.on('resub', (_, username) => this.subscribers.add(username));
        this.client.on('mod', (_, username) => this.moderators.add(username));
        this.client.on('unmod', (_, username) => this.moderators.delete(username));
        // Connection diagnostics
        this.client.on('connected', (addr, port) => console.log(`TMI connected: ${addr}:${port}`));
        this.client.on('disconnected', (reason) => console.log(`TMI disconnected: ${reason}`));
    }

    async handleMessage(channel, userstate, message, self) {
        if (self) return;

        this.metrics.processed++;
        const command = this.getCommand(message);
        if (!command) return;

        try {
            // Permission check
            if (!this.hasPermission(userstate)) {
                await this.sendMessage(channel, `@${userstate.username} Lo siento, cari├▒o, si quieres usarme, tendr├ís que suscribirte.`);
                return;
            }

            // Cooldown check
            if (!this.checkCooldown(userstate.username)) {
                return; // Fail silently for cooldown
            }

            const text = this.prepareText(message, command, userstate.username);
            const response = await this.getResponse(text, userstate.username);

            await this.sendMessage(channel, `@${userstate.username} ${response}`);

            // Generate TTS asynchronously if enabled
            if (BOT_CONFIG.ENABLE_TTS) {
                this.generateTTS(response).catch(() => { });
            }

        } catch (error) {
            this.metrics.errors++;
            console.error('Message handling error:', error.message);
        }
    }

    async getResponse(text, username = 'external') {
        // Check cache first
        const cacheKey = text.toLowerCase().trim().substring(0, 50);
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        // Generate new response
        const response = await this.generateResponse(text, username);
        this.addToCache(cacheKey, response);
        this.updateHistory(text, response);

        return response;
    }

    // Calculate a safe max tokens budget based on configured char limit
    calculateMaxTokens() {
        const charLimit = BOT_CONFIG.MAX_MESSAGE_LENGTH || 120;
        // Approx conversion: ~4 chars per token for ES/EN average, add safety margin
        let estimatedTokens = Math.ceil(charLimit / 4);
        
        // Si estamos usando modo razonamiento, ser MUY restrictivo
        if (this.isUsingReasoning()) {
            estimatedTokens = Math.ceil(estimatedTokens * 0.5); // 50% menos tokens para razonamiento
        }
        
        const upperBound = OPENAI_CONFIG.MAX_TOKENS || 40;
        const lowerBound = 20; // Muy bajo para forzar respuestas ultra cortas
        return Math.max(lowerBound, Math.min(estimatedTokens, upperBound));
    }

    getUserKey(username) {
        return (username || '__external__').toLowerCase();
    }

    getModelForInteraction(isFirstInteraction) {
        const primaryModel = OPENAI_CONFIG.MODEL_NAME || OPENAI_CONFIG.FIRST_CHAT_MODEL;
        const firstModel = OPENAI_CONFIG.FIRST_CHAT_MODEL || primaryModel;
        return isFirstInteraction ? firstModel : primaryModel;
    }

    // Check if we're using reasoning mode
    isUsingReasoning() {
        const reasoningEffort = OPENAI_CONFIG.REASONING_EFFORT || 'low';
        return reasoningEffort !== 'none';
    }

    // Decide creativity per user: first time -> base params; subsequent -> higher temperature/top_p
    getSamplingParamsForUser(username) {
        const key = this.getUserKey(username);
        const isFirst = !this.firstInteractionSeen.has(key);

        // If using reasoning, force temperature to 1 (only supported value)
        if (this.isUsingReasoning()) {
            return { key, isFirst, temperature: 1, top_p: 1 };
        }

        // Normal chat mode - use configured values
        const temperature = isFirst ? OPENAI_CONFIG.TEMPERATURE : OPENAI_CONFIG.SECOND_TEMPERATURE;
        const top_p = isFirst ? OPENAI_CONFIG.TOP_P : OPENAI_CONFIG.SECOND_TOP_P;
        return { key, isFirst, temperature, top_p };
    }

    async generateResponse(text, username) {
        // Rate limiting
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }

        const messages = [...this.chatHistory, { role: 'user', content: text }];
        const maxTokens = this.calculateMaxTokens();
        const sampling = this.getSamplingParamsForUser(username);
        this.firstInteractionSeen.add(sampling.key);
        const model = this.getModelForInteraction(sampling.isFirst);

        // Debug: Log what we're sending to OpenAI
        const isReasoning = this.isUsingReasoning();
        console.log('[bot] Sending to OpenAI:', {
            model,
            reasoningMode: isReasoning ? `YES (${OPENAI_CONFIG.REASONING_EFFORT})` : 'NO (chat mode)',
            systemMessage: messages[0].content.substring(0, 150) + '...',
            userMessage: text,
            historyLength: messages.length,
            maxTokens,
            temperature: sampling.temperature,
            top_p: sampling.top_p,
            reasoning_effort: OPENAI_CONFIG.REASONING_EFFORT
        });

        const config = {
            model,
            messages,
            temperature: sampling.temperature,
            max_completion_tokens: maxTokens,
            top_p: sampling.top_p,
            reasoning_effort: OPENAI_CONFIG.REASONING_EFFORT
        };

        let response = await this.openai.chat.completions.create(config);

        // Try to extract content
        let { content, finish_reason } = this.extractChoice(response);

        // If empty content due to length, retry with slightly higher budget (pero no mucho)
        if ((!content || content.length === 0) && finish_reason === 'length') {
            console.log('[bot] Empty response due to length. Retrying with higher token budget...');
            const boostedTokens = Math.min((OPENAI_CONFIG.MAX_TOKENS || maxTokens) * 1.5, 80);
            const retryConfig = {
                model,
                messages,
                temperature: sampling.temperature,
                max_completion_tokens: boostedTokens,
                top_p: sampling.top_p,
                reasoning_effort: OPENAI_CONFIG.REASONING_EFFORT
            };
            response = await this.openai.chat.completions.create(retryConfig);
            ({ content, finish_reason } = this.extractChoice(response));
        }

        // If still empty, fallback to a smaller temp/top_p to encourage concise output
        if (!content || content.length === 0) {
            console.log('[bot] Still empty after retry. Trying conservative sampling.');
            // For reasoning models, we can't change temperature, so use original values
            const fallbackTemp = this.isUsingReasoning() ? 1 : Math.max(0.7, sampling.temperature);
            const fallbackTopP = this.isUsingReasoning() ? 1 : Math.min(0.95, sampling.top_p);

            const fallbackConfig = {
                model,
                messages,
                temperature: fallbackTemp,
                max_completion_tokens: Math.min((OPENAI_CONFIG.MAX_TOKENS || maxTokens) * 1.5, 80),
                top_p: fallbackTopP,
                reasoning_effort: OPENAI_CONFIG.REASONING_EFFORT
            };
            response = await this.openai.chat.completions.create(fallbackConfig);
            ({ content } = this.extractChoice(response));
        }

        if (!content) {
            console.error('[bot] Empty response from OpenAI:', JSON.stringify(response, null, 2));
            return "Perd├│n cari├▒o, me he quedado sin palabras. Int├®ntalo de nuevo.";
        }

        console.log('[bot] Got response:', content.substring(0, 100) + '...');
        
        // Limpiar formato markdown si estamos usando modo razonamiento
        if (this.isUsingReasoning()) {
            content = this.cleanReasoningResponse(content);
        }
        
        return this.truncateResponse(content);
    }

    extractChoice(apiResponse) {
        const choice = apiResponse?.choices?.[0] || {};
        const finish_reason = choice.finish_reason || choice.finishReason;
        let content = null;
        if (choice?.message?.content) {
            content = choice.message.content.trim();
        } else if (choice?.text) {
            content = choice.text.trim();
        } else if (choice?.delta?.content) {
            content = choice.delta.content.trim();
        }
        return { content, finish_reason };
    }

    // Utility methods
    getCommand(message) {
        const lower = message.toLowerCase();
        return BOT_CONFIG.COMMAND_NAME.find(cmd => lower.startsWith(cmd));
    }

    hasPermission(userstate) {
        if (!TWITCH_CONFIG.SUBSCRIBERS_ONLY) return true;

        return userstate.subscriber ||
            this.subscribers.has(userstate.username) ||
            (userstate.mod && TWITCH_CONFIG.MODERATORS_BYPASS) ||
            this.moderators.has(userstate.username);
    }

    checkCooldown(username) {
        const cooldown = BOT_CONFIG.COOLDOWN_DURATION;
        const lastUse = this.userCooldowns.get(username) || 0;
        const now = Date.now();

        if (now - lastUse < cooldown * 1000) return false;

        this.userCooldowns.set(username, now);
        return true;
    }

    checkRateLimit() {
        const now = Date.now();
        if (now > this.resetTime) {
            this.apiCalls = 0;
            this.resetTime = now + 60000;
        }
        return this.apiCalls++ < 50;
    }

    prepareText(message, command, username) {
        let text = message.slice(command.length).trim();
        if (BOT_CONFIG.SEND_USERNAME && username) {
            text = `Message from user ${username}: ${text}`;
        }
        return text;
    }

    isReasoningModel(model) {
        // No-op now; we keep for compatibility if needed later
        return false;
    }

    // Limpiar formato markdown del modo razonamiento
    cleanReasoningResponse(text) {
        if (!text) return text;
        
        // Eliminar asteriscos usados como énfasis (*texto* o **texto**)
        text = text.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
        
        // Eliminar asteriscos sueltos al inicio o final
        text = text.replace(/^\*+|\*+$/g, '');
        
        // Eliminar asteriscos múltiples en el medio
        text = text.replace(/\*{2,}/g, '');
        
        // Eliminar guiones bajos usados como énfasis (_texto_)
        text = text.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');
        
        // Eliminar backticks de código (`texto`)
        text = text.replace(/`([^`]+)`/g, '$1');
        
        // Eliminar hashtags de headers (# texto)
        text = text.replace(/^#+\s*/gm, '');
        
        // Limpiar espacios múltiples
        text = text.replace(/\s+/g, ' ');
        
        // Limpiar espacios al inicio y final
        text = text.trim();
        
        console.log('[bot] Cleaned reasoning response from markdown formatting');
        return text;
    }

    // Cache management
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
            return entry.value;
        }
        if (entry) this.cache.delete(key);
        return null;
    }

    addToCache(key, value) {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    // History management
    updateHistory(userText, botResponse) {
        this.chatHistory.push(
            { role: 'user', content: userText },
            { role: 'assistant', content: botResponse }
        );

        while (this.chatHistory.length > this.MAX_HISTORY) {
            this.chatHistory.splice(1, 2);
        }
    }

    truncateResponse(text, maxLength = BOT_CONFIG.MAX_MESSAGE_LENGTH || 120) {
        if (text.length <= maxLength) return text;

        // Para modo razonamiento, ser ULTRA agresivo con el truncado
        if (this.isUsingReasoning()) {
            // Buscar la primera oración completa que quepa
            const firstSentence = text.match(/^[^.!?]*[.!?]/);
            if (firstSentence && firstSentence[0].length <= maxLength) {
                return firstSentence[0].trim();
            }
            
            // Si no hay oración completa, buscar primera coma
            const firstComma = text.indexOf(',');
            if (firstComma > 0 && firstComma <= maxLength) {
                return text.substring(0, firstComma).trim();
            }
            
            // Último recurso: cortar en espacio más cercano
            const truncated = text.substring(0, maxLength - 3);
            const lastSpace = truncated.lastIndexOf(' ');
            return lastSpace > maxLength * 0.6 ?
                truncated.substring(0, lastSpace) :
                truncated.substring(0, maxLength - 3);
        }

        // Para modo normal, truncado estándar
        const truncated = text.substring(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        const lastPunctuation = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf(','),
            truncated.lastIndexOf('!')
        );

        // Priorizar cortar en puntuación si está cerca del final
        if (lastPunctuation > maxLength * 0.7) {
            return truncated.substring(0, lastPunctuation + 1);
        }

        return lastSpace > maxLength * 0.8 ?
            truncated.substring(0, lastSpace) + '...' :
            truncated + '...';
    }

    async sendMessage(channel, message) {
        const truncated = this.truncateResponse(message, 500);
        await this.client.say(channel, truncated);
    }

    async generateTTS(text) {
        try {
            const mp3 = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text.substring(0, 200)
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            await fsPromises.writeFile('./public/file.mp3', buffer);
        } catch (error) {
            console.error('TTS error:', error.message);
        }
    }

    // Cleanup and maintenance
    startCleanup() {
        setInterval(() => {
            this.cleanupData();
        }, 300000); // Every 5 minutes
    }

    cleanupData() {
        const now = Date.now();

        // Clean cooldowns
        for (const [username, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > 300000) {
                this.userCooldowns.delete(username);
            }
        }

        // Clean cache
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL) {
                this.cache.delete(key);
            }
        }
    }

    // Public API
    getMetrics() {
        const total = this.metrics.cacheHits + (this.metrics.processed - this.metrics.cacheHits);
        const hitRate = total > 0 ? (this.metrics.cacheHits / total * 100).toFixed(1) : 0;

        return {
            processed: this.metrics.processed,
            errors: this.metrics.errors,
            cacheHitRate: `${hitRate}%`,
            cacheSize: this.cache.size,
            subscribers: this.subscribers.size,
            moderators: this.moderators.size
        };
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            console.log('­ƒñû Bot disconnected');
        }
    }
}
