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
            connection: { reconnect: true, secure: true },
            identity: {
                username: TWITCH_CONFIG.USERNAME,
                password: TWITCH_CONFIG.OAUTH_TOKEN
            },
            channels: TWITCH_CONFIG.CHANNELS
        });

        this.setupEvents();
        await this.client.connect();
        this.startCleanup();
        
        console.log('🤖 Bot connected successfully!');
    }

    setupEvents() {
        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('subscription', (_, username) => this.subscribers.add(username));
        this.client.on('resub', (_, username) => this.subscribers.add(username));
        this.client.on('mod', (_, username) => this.moderators.add(username));
        this.client.on('unmod', (_, username) => this.moderators.delete(username));
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
            const response = await this.getResponse(text);
            
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

    async getResponse(text) {
        // Check cache first
        const cacheKey = text.toLowerCase().trim().substring(0, 50);
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        // Generate new response
        const response = await this.generateResponse(text);
        this.addToCache(cacheKey, response);
        this.updateHistory(text, response);
        
        return response;
    }

    // Calculate a safe max tokens budget based on configured char limit
    calculateMaxTokens() {
        const charLimit = BOT_CONFIG.MAX_MESSAGE_LENGTH || 450;
        // Approx conversion: ~4 chars per token for ES/EN average, add safety margin
        const estimatedTokens = Math.ceil(charLimit / 4) + 10; // +10 buffer
        const upperBound = OPENAI_CONFIG.MAX_TOKENS || 120;
        const lowerBound = 40; // ensure not too short
        return Math.max(lowerBound, Math.min(estimatedTokens, upperBound));
    }

    async generateResponse(text) {
        // Rate limiting
        if (!this.checkRateLimit()) {
            throw new Error('Rate limit exceeded');
        }

        const messages = [...this.chatHistory, { role: 'user', content: text }];
        const isReasoningModel = this.isReasoningModel(OPENAI_CONFIG.MODEL_NAME);
        const maxTokens = this.calculateMaxTokens();
        
        // Debug: Log what we're sending to OpenAI
        console.log('🔍 Sending to OpenAI:', {
            model: OPENAI_CONFIG.MODEL_NAME,
            systemMessage: messages[0].content.substring(0, 150) + '...',
            userMessage: text,
            historyLength: messages.length,
            maxTokens
        });
        
        const config = {
            model: OPENAI_CONFIG.MODEL_NAME,
            messages
        };

        // Add model-specific parameters
        if (isReasoningModel) {
            config.max_completion_tokens = maxTokens;
        } else {
            config.temperature = OPENAI_CONFIG.TEMPERATURE;
            config.max_tokens = maxTokens;
            config.top_p = OPENAI_CONFIG.TOP_P;
            config.frequency_penalty = OPENAI_CONFIG.FREQUENCY_PENALTY;
            config.presence_penalty = OPENAI_CONFIG.PRESENCE_PENALTY;
        }

        const response = await this.openai.chat.completions.create(config);
        
        // Debug: Log the full response structure
        console.log('🔍 OpenAI Response:', {
            model: response.model,
            choices: response.choices?.length,
            firstChoice: response.choices?.[0] ? {
                message: response.choices[0].message,
                finishReason: response.choices[0].finish_reason
            } : null
        });
        
        // Try different ways to extract content
        let content = null;
        
        if (response.choices?.[0]?.message?.content) {
            content = response.choices[0].message.content.trim();
        } else if (response.choices?.[0]?.text) {
            // Some models might use 'text' instead of 'message.content'
            content = response.choices[0].text.trim();
        } else if (response.choices?.[0]?.delta?.content) {
            // Streaming format
            content = response.choices[0].delta.content.trim();
        }
        
        if (!content) {
            console.error('❌ Empty response from OpenAI:', JSON.stringify(response, null, 2));
            return "Perdón cariño, me he quedado sin palabras. Inténtalo de nuevo.";
        }
        
        console.log('✅ Got response:', content.substring(0, 100) + '...');
        return this.truncateResponse(content);
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
        const modelLower = model.toLowerCase();
        
        // GPT-5 reasoning models and o1/o3 series
        const reasoningModels = [
            'gpt-5',
            'gpt-5-mini', 
            'gpt-5-nano',
            'o1',
            'o3',
            'o4'
        ];
        
        return reasoningModels.some(rm => modelLower.includes(rm)) && 
               !modelLower.includes('chat-latest'); // Exclude chat variants
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