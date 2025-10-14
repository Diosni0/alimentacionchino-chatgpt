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
        console.log('📄 Context loaded:', fileContext.substring(0, 100) + '...');
        this.chatHistory = [{ role: 'system', content: fileContext }];
        this.MAX_HISTORY = OPENAI_CONFIG.HISTORY_LENGTH * 2 + 1;
        
        console.log('📊 History config:', {
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
        
        console.log('🤖 Bot connected successfully!');
    }

    startConnectionMonitor() {
        // Monitor connection every 2 minutes
        setInterval(() => {
            if (this.client) {
                const state = this.client.readyState();
                if (state !== 'OPEN') {
                    console.log(`⚠️ Bot connection state: ${state}, attempting reconnection...`);
                    this.client.connect().catch(err => {
                        console.error('❌ Auto-reconnection failed:', err.message);
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
                await this.sendMessage(channel, `@${userstate.username} Lo siento, cariño, si quieres usarme, tendrás que suscribirte.`);
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
            if (process.env.ENABLE_TTS === 'true') {
                this.generateTTS(response).catch(() => {});
            }
            
        } catch (error) {
            this.metrics.errors++;
            console.error('Message handling error:', error.message);
        }
    }

    async getResponse(text, username) {
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
        const charLimit = BOT_CONFIG.MAX_MESSAGE_LENGTH || 450;
        // Approx conversion: ~4 chars per token for ES/EN average, add safety margin
        const estimatedTokens = Math.ceil(charLimit / 4) + 10; // +10 buffer
        const upperBound = OPENAI_CONFIG.MAX_TOKENS || 200;
        const lowerBound = 60; // a little higher to help first answers
        return Math.max(lowerBound, Math.min(estimatedTokens, upperBound));
    }

    // Decide creativity per user: first time -> base params; subsequent -> higher temperature/top_p
    getSamplingParamsForUser(username) {
        const isFirst = !this.firstInteractionSeen.has(username);
        if (isFirst) return { temperature: OPENAI_CONFIG.TEMPERATURE, top_p: OPENAI_CONFIG.TOP_P };
        return { temperature: OPENAI_CONFIG.SECOND_TEMPERATURE, top_p: OPENAI_CONFIG.SECOND_TOP_P };
    }

    async generateResponse(text, username) {
        // Rate limiting
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }

        const messages = [...this.chatHistory, { role: 'user', content: text }];
        const maxTokens = this.calculateMaxTokens();
        const { temperature, top_p } = this.getSamplingParamsForUser(username);

        // Mark first interaction seen after we decide params
        this.firstInteractionSeen.add(username);
        
        // Debug: Log what we're sending to OpenAI
        console.log('🔍 Sending to OpenAI:', {
            model: OPENAI_CONFIG.MODEL_NAME,
            systemMessage: messages[0].content.substring(0, 150) + '...',
            userMessage: text,
            historyLength: messages.length,
            maxTokens,
            temperature,
            top_p
        });
        
        const config = {
            model: OPENAI_CONFIG.MODEL_NAME,
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p,
            frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
            presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY
        };

        let response = await this.openai.chat.completions.create(config);

        // Try to extract content
        let { content, finish_reason } = this.extractChoice(response);

        // If empty content due to length, retry with higher budget
        if ((!content || content.length === 0) && finish_reason === 'length') {
            console.log('⚠️ Empty response with finish_reason=length. Retrying with higher token budget...');
            const boostedTokens = Math.min((OPENAI_CONFIG.MAX_TOKENS || maxTokens) * 2, 500);
            const retryConfig = { ...config, max_tokens: boostedTokens };
            response = await this.openai.chat.completions.create(retryConfig);
            ({ content, finish_reason } = this.extractChoice(response));
        }

        // If still empty, fallback to a smaller temp/top_p to encourage concise output
        if (!content || content.length === 0) {
            console.log('⚠️ Still empty after retry. Trying conservative sampling.');
            const fallbackConfig = {
                ...config,
                temperature: Math.max(0.7, OPENAI_CONFIG.TEMPERATURE),
                top_p: Math.min(0.95, OPENAI_CONFIG.TOP_P),
                max_tokens: Math.min((OPENAI_CONFIG.MAX_TOKENS || maxTokens) * 2, 500)
            };
            response = await this.openai.chat.completions.create(fallbackConfig);
            ({ content } = this.extractChoice(response));
        }
        
        if (!content) {
            console.error('❌ Empty response from OpenAI:', JSON.stringify(response, null, 2));
            return "Perdón cariño, me he quedado sin palabras. Inténtalo de nuevo.";
        }
        
        console.log('✅ Got response:', content.substring(0, 100) + '...');
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
        const commands = process.env.COMMAND_NAME?.split(',') || ['!gpt'];
        const lower = message.toLowerCase();
        return commands.find(cmd => lower.startsWith(cmd.trim().toLowerCase()));
    }

    hasPermission(userstate) {
        if (!TWITCH_CONFIG.SUBSCRIBERS_ONLY) return true;
        
        return userstate.subscriber || 
               this.subscribers.has(userstate.username) ||
               (userstate.mod && TWITCH_CONFIG.MODERATORS_BYPASS) ||
               this.moderators.has(userstate.username);
    }

    checkCooldown(username) {
        const cooldown = parseInt(process.env.COOLDOWN_DURATION) || 10;
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
        if (process.env.SEND_USERNAME === 'true') {
            text = `Message from user ${username}: ${text}`;
        }
        return text;
    }

    isReasoningModel(model) {
        // No-op now; we keep for compatibility if needed later
        return false;
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

    truncateResponse(text, maxLength = 450) {
        if (text.length <= maxLength) return text;
        
        const truncated = text.substring(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        
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
            console.log('🤖 Bot disconnected');
        }
    }
}