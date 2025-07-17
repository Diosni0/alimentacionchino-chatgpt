import tmi from 'tmi.js';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import { TWITCH_CONFIG, OPENAI_CONFIG, getFileContext } from './config.js';

export class OptimizedTwitchBot {
    constructor() {
        this.client = null;
        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });
        this.enable_tts = process.env.ENABLE_TTS === 'true';

        // Optimized data structures with size limits
        this.subscribers = new Map(); // username -> timestamp
        this.moderators = new Map(); // username -> timestamp
        this.MAX_USERS_CACHE = 1000;

        // Rate limiting and cooldowns
        this.lastResponseTime = 0;
        this.userCooldowns = new Map(); // username -> timestamp
        this.apiCallCount = 0;
        this.apiResetTime = Date.now() + 60000; // Reset every minute

        // Response cache for common queries
        this.responseCache = new Map();
        this.CACHE_TTL = 300000; // 5 minutes
        this.MAX_CACHE_SIZE = 100;

        // Chat history with memory management
        this.fileContext = getFileContext();
        this.chatHistory = [{ role: 'system', content: this.fileContext }];
        this.MAX_HISTORY_SIZE = OPENAI_CONFIG.HISTORY_LENGTH * 2 + 1;

        // Performance metrics
        this.metrics = {
            messagesProcessed: 0,
            apiCalls: 0,
            cacheHits: 0,
            errors: 0
        };
    }

    async initialize() {
        try {
            this.client = new tmi.client({
                connection: {
                    reconnect: true,
                    secure: true,
                    timeout: 180000,
                    reconnectDecay: 1.5,
                    reconnectInterval: 1000,
                    maxReconnectAttempts: Infinity,
                    maxReconnectInARow: 5
                },
                identity: {
                    username: TWITCH_CONFIG.USERNAME,
                    password: TWITCH_CONFIG.OAUTH_TOKEN
                },
                channels: TWITCH_CONFIG.CHANNELS
            });

            this.setupEventHandlers();
            await this.client.connect();

            // Start cleanup intervals
            this.startCleanupIntervals();

            console.log('Optimized TMI Bot connected successfully!');
            return true;
        } catch (error) {
            console.error('Error initializing bot:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('subscription', this.handleSubscription.bind(this));
        this.client.on('resub', this.handleResub.bind(this));
        this.client.on('mod', this.handleMod.bind(this));
        this.client.on('unmod', this.handleUnmod.bind(this));
        this.client.on('connected', () => console.log('Bot connected'));
        this.client.on('disconnected', (reason) => console.log('Bot disconnected:', reason));
    }

    async handleMessage(channel, userstate, message, self) {
        if (self) return;

        this.metrics.messagesProcessed++;

        try {
            const command = this.getCommand(message);
            if (!command) return;

            // Check permissions
            if (!await this.checkPermissions(userstate)) {
                await this.sendMessage(channel, `@${userstate.username} Lo siento cariño, necesitas suscribirte para usar el bot.`);
                return;
            }

            // Check cooldowns
            if (!this.checkCooldown(userstate.username)) {
                const remainingTime = this.getRemainingCooldown(userstate.username);
                await this.sendMessage(channel, `@${userstate.username} espera ${remainingTime}s más.`);
                return;
            }

            await this.processCommand(channel, userstate, message, command);
        } catch (error) {
            this.metrics.errors++;
            console.error('Error handling message:', error);
        }
    }

    async processCommand(channel, userstate, message, command) {
        const username = userstate.username;
        let text = message.slice(command.length).trim();

        if (process.env.SEND_USERNAME === 'true') {
            text = `Message from user ${username}: ${text}`;
        }

        // Check cache first
        const cacheKey = this.generateCacheKey(text);
        const cachedResponse = this.getFromCache(cacheKey);

        if (cachedResponse) {
            this.metrics.cacheHits++;
            await this.sendMessage(channel, `@${username} ${cachedResponse}`);
            return;
        }

        try {
            const response = await this.generateResponseWithRetry(text);

            // Cache the response
            this.addToCache(cacheKey, response);

            // Update chat history efficiently
            this.updateChatHistory(text, response);

            await this.sendMessage(channel, `@${username} ${response}`);

            // Generate TTS asynchronously if enabled
            if (this.enable_tts) {
                this.generateTTS(response).catch(err =>
                    console.error('TTS generation failed:', err)
                );
            }

        } catch (error) {
            this.metrics.errors++;
            console.error('Error processing command:', error);
            await this.sendMessage(channel, `@${username} Error temporal, intenta de nuevo.`);
        }
    }

    async generateResponseWithRetry(text, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Rate limiting check
                if (!this.checkRateLimit()) {
                    throw new Error('Rate limit exceeded');
                }

                this.metrics.apiCalls++;
                this.apiCallCount++;

                const response = await this.openai.chat.completions.create({
                    model: OPENAI_CONFIG.MODEL_NAME,
                    messages: [...this.chatHistory, { role: 'user', content: text }],
                    temperature: OPENAI_CONFIG.TEMPERATURE,
                    max_tokens: OPENAI_CONFIG.MAX_TOKENS,
                    top_p: OPENAI_CONFIG.TOP_P,
                    frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                    presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
                    stop: ["\n\n", "User:", "Human:", "Assistant:"]
                });

                let responseText = response.choices[0].message.content.trim();
                return this.truncateResponse(responseText);

            } catch (error) {
                console.error(`API call attempt ${attempt} failed:`, error);

                if (attempt === maxRetries) {
                    throw error;
                }

                // Exponential backoff
                await this.sleep(Math.pow(2, attempt) * 1000);
            }
        }
    }

    // Utility methods for optimization
    checkPermissions(userstate) {
        if (!TWITCH_CONFIG.SUBSCRIBERS_ONLY) return true;

        const isSubscriber = userstate.subscriber || this.subscribers.has(userstate.username);
        const isModerator = userstate.mod || this.moderators.has(userstate.username);

        return isSubscriber || (isModerator && TWITCH_CONFIG.MODERATORS_BYPASS);
    }

    checkCooldown(username) {
        const cooldownDuration = parseInt(process.env.COOLDOWN_DURATION) || 10;
        const lastUse = this.userCooldowns.get(username) || 0;
        const now = Date.now();

        if (now - lastUse < cooldownDuration * 1000) {
            return false;
        }

        this.userCooldowns.set(username, now);
        return true;
    }

    getRemainingCooldown(username) {
        const cooldownDuration = parseInt(process.env.COOLDOWN_DURATION) || 10;
        const lastUse = this.userCooldowns.get(username) || 0;
        const elapsed = (Date.now() - lastUse) / 1000;
        return Math.max(0, Math.round(cooldownDuration - elapsed));
    }

    checkRateLimit() {
        const now = Date.now();
        if (now > this.apiResetTime) {
            this.apiCallCount = 0;
            this.apiResetTime = now + 60000;
        }
        return this.apiCallCount < 60; // 60 calls per minute limit
    }

    generateCacheKey(text) {
        return text.toLowerCase().trim().substring(0, 100);
    }

    getFromCache(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.response;
        }
        if (cached) {
            this.responseCache.delete(key);
        }
        return null;
    }

    addToCache(key, response) {
        if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.responseCache.keys().next().value;
            this.responseCache.delete(firstKey);
        }

        this.responseCache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    updateChatHistory(userText, botResponse) {
        this.chatHistory.push(
            { role: 'user', content: userText },
            { role: 'assistant', content: botResponse }
        );

        // Keep history within limits
        while (this.chatHistory.length > this.MAX_HISTORY_SIZE) {
            this.chatHistory.splice(1, 2); // Remove oldest user/assistant pair
        }
    }

    truncateResponse(text, maxLength = 450) {
        if (text.length <= maxLength) return text;

        const truncated = text.substring(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');

        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }

    startCleanupIntervals() {
        // Clean up old user data every 10 minutes
        setInterval(() => {
            this.cleanupUserData();
        }, 600000);

        // Clean up cache every 5 minutes
        setInterval(() => {
            this.cleanupCache();
        }, 300000);
    }

    cleanupUserData() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        // Clean subscribers
        for (const [username, timestamp] of this.subscribers.entries()) {
            if (now - timestamp > maxAge) {
                this.subscribers.delete(username);
            }
        }

        // Clean moderators
        for (const [username, timestamp] of this.moderators.entries()) {
            if (now - timestamp > maxAge) {
                this.moderators.delete(username);
            }
        }

        // Clean cooldowns
        const cooldownAge = 60000; // 1 minute
        for (const [username, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > cooldownAge) {
                this.userCooldowns.delete(username);
            }
        }
    }

    cleanupCache() {
        const now = Date.now();
        for (const [key, data] of this.responseCache.entries()) {
            if (now - data.timestamp > this.CACHE_TTL) {
                this.responseCache.delete(key);
            }
        }
    }

    // Event handlers
    handleSubscription(_, username) {
        this.subscribers.set(username, Date.now());
        console.log(`New subscriber: ${username}`);
    }

    handleResub(_, username, months) {
        this.subscribers.set(username, Date.now());
        console.log(`Resub: ${username} for ${months} months`);
    }

    handleMod(_, username) {
        this.moderators.set(username, Date.now());
        console.log(`New moderator: ${username}`);
    }

    handleUnmod(_, username) {
        this.moderators.delete(username);
        console.log(`Moderator removed: ${username}`);
    }

    // Existing methods (optimized)
    getCommand(content) {
        const commands = process.env.COMMAND_NAME ?
            process.env.COMMAND_NAME.split(',').map(cmd => cmd.trim().toLowerCase()) :
            ['!gpt'];
        return commands.find(cmd => content.toLowerCase().startsWith(cmd));
    }

    async sendMessage(channel, message) {
        try {
            const truncated = this.truncateResponse(message, 500);
            await this.client.say(channel, truncated);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async generateTTS(text) {
        if (!this.enable_tts) return;

        try {
            const mp3 = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            await fsPromises.writeFile('./public/file.mp3', buffer);
        } catch (error) {
            console.error('TTS generation error:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            console.log('Bot disconnected');
        }
    }

    // Utility methods
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getMetrics() {
        return {
            ...this.metrics,
            subscriberCount: this.subscribers.size,
            moderatorCount: this.moderators.size,
            cacheSize: this.responseCache.size,
            historyLength: this.chatHistory.length,
            apiCallsThisMinute: this.apiCallCount
        };
    }

    // Legacy compatibility methods
    isSubscriber(username) {
        return this.subscribers.has(username);
    }

    isModerator(username) {
        return this.moderators.has(username);
    }

    getSubscriberCount() {
        return this.subscribers.size;
    }

    getModeratorCount() {
        return this.moderators.size;
    }
}