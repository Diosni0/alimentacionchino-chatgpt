import tmi from 'tmi.js';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import { TWITCH_CONFIG, OPENAI_CONFIG, getFileContext } from './config.js';

export class UltraOptimizedTwitchBot {
    constructor() {
        this.client = null;
        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });
        this.enable_tts = process.env.ENABLE_TTS === 'true';
        
        // Ultra-optimized data structures
        this.subscribers = new Set(); // More memory efficient than Map for simple existence checks
        this.moderators = new Set();
        this.userCooldowns = new Map();
        
        // Advanced rate limiting with adaptive throttling
        this.rateLimiter = {
            apiCalls: 0,
            resetTime: Date.now() + 60000,
            adaptiveDelay: 0,
            consecutiveErrors: 0
        };
        
        // Intelligent caching system
        this.cache = {
            responses: new Map(),
            ttl: 300000, // 5 minutes
            maxSize: 50, // Reduced for better memory usage
            hits: 0,
            misses: 0
        };
        
        // Optimized chat history with circular buffer
        this.chatHistory = this.createCircularBuffer(OPENAI_CONFIG.HISTORY_LENGTH * 2 + 1);
        this.chatHistory.push({ role: 'system', content: getFileContext() });
        
        // Message queue for handling bursts
        this.messageQueue = [];
        this.isProcessingQueue = false;
        
        // Performance metrics (lightweight)
        this.metrics = {
            processed: 0,
            errors: 0,
            cacheHitRate: 0
        };
        
        // Circuit breaker for API calls
        this.circuitBreaker = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failures: 0,
            threshold: 5,
            timeout: 30000,
            nextAttempt: 0
        };
    }

    createCircularBuffer(size) {
        const buffer = [];
        buffer.maxSize = size;
        buffer.push = function(item) {
            if (this.length >= this.maxSize) {
                this.shift();
            }
            Array.prototype.push.call(this, item);
        };
        return buffer;
    }

    async initialize() {
        try {
            this.client = new tmi.client({
                connection: {
                    reconnect: true,
                    secure: true,
                    timeout: 180000,
                    reconnectDecay: 1.4, // Slightly faster reconnection
                    reconnectInterval: 800,
                    maxReconnectAttempts: Infinity,
                    maxReconnectInARow: 3 // Reduced to prevent spam
                },
                identity: {
                    username: TWITCH_CONFIG.USERNAME,
                    password: TWITCH_CONFIG.OAUTH_TOKEN
                },
                channels: TWITCH_CONFIG.CHANNELS
            });

            this.setupEventHandlers();
            await this.client.connect();
            
            // Start optimized cleanup and processing
            this.startOptimizedIntervals();
            
            console.log('Ultra-optimized bot connected!');
            return true;
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // Use arrow functions to avoid binding overhead
        this.client.on('message', (channel, userstate, message, self) => {
            if (self) return;
            this.queueMessage(channel, userstate, message);
        });
        
        this.client.on('subscription', (_, username) => {
            this.subscribers.add(username);
        });
        
        this.client.on('resub', (_, username) => {
            this.subscribers.add(username);
        });
        
        this.client.on('mod', (_, username) => {
            this.moderators.add(username);
        });
        
        this.client.on('unmod', (_, username) => {
            this.moderators.delete(username);
        });
    }

    queueMessage(channel, userstate, message) {
        this.messageQueue.push({ channel, userstate, message, timestamp: Date.now() });
        
        // Process queue if not already processing
        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    }

    async processMessageQueue() {
        this.isProcessingQueue = true;
        
        while (this.messageQueue.length > 0) {
            const { channel, userstate, message } = this.messageQueue.shift();
            
            try {
                await this.handleMessage(channel, userstate, message);
                
                // Small delay to prevent overwhelming the API
                if (this.rateLimiter.adaptiveDelay > 0) {
                    await this.sleep(this.rateLimiter.adaptiveDelay);
                }
            } catch (error) {
                this.metrics.errors++;
                console.error('Queue processing error:', error);
            }
        }
        
        this.isProcessingQueue = false;
    }

    async handleMessage(channel, userstate, message) {
        this.metrics.processed++;
        
        const command = this.getCommand(message);
        if (!command) return;

        // Fast permission and cooldown checks
        if (!this.checkPermissions(userstate) || !this.checkCooldown(userstate.username)) {
            return; // Fail silently for better performance
        }

        const text = this.prepareText(message, command, userstate.username);
        const cacheKey = this.generateCacheKey(text);
        
        // Check cache first
        const cachedResponse = this.getFromCache(cacheKey);
        if (cachedResponse) {
            await this.sendMessage(channel, `@${userstate.username} ${cachedResponse}`);
            return;
        }

        try {
            const response = await this.generateResponse(text);
            this.addToCache(cacheKey, response);
            this.updateChatHistory(text, response);
            
            await this.sendMessage(channel, `@${userstate.username} ${response}`);
            
            // Generate TTS asynchronously without blocking
            if (this.enable_tts) {
                setImmediate(() => this.generateTTS(response));
            }
            
        } catch (error) {
            this.metrics.errors++;
            console.error('Message handling error:', error);
        }
    }

    async generateResponse(text) {
        // Circuit breaker check
        if (this.circuitBreaker.state === 'OPEN') {
            if (Date.now() < this.circuitBreaker.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.circuitBreaker.state = 'HALF_OPEN';
        }

        // Advanced rate limiting
        if (!this.checkAdvancedRateLimit()) {
            throw new Error('Rate limit exceeded');
        }

        try {
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

            // Circuit breaker success
            this.circuitBreaker.failures = 0;
            this.circuitBreaker.state = 'CLOSED';
            this.rateLimiter.adaptiveDelay = Math.max(0, this.rateLimiter.adaptiveDelay - 100);

            return this.truncateResponse(response.choices[0].message.content.trim());
            
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }

    handleApiError(error) {
        this.circuitBreaker.failures++;
        this.rateLimiter.consecutiveErrors++;
        
        // Adaptive delay based on error type
        if (error.status === 429) { // Rate limit
            this.rateLimiter.adaptiveDelay = Math.min(5000, this.rateLimiter.adaptiveDelay + 1000);
        }
        
        // Circuit breaker logic
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.state = 'OPEN';
            this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;
        }
    }

    checkAdvancedRateLimit() {
        const now = Date.now();
        
        // Reset counter if needed
        if (now > this.rateLimiter.resetTime) {
            this.rateLimiter.apiCalls = 0;
            this.rateLimiter.resetTime = now + 60000;
            this.rateLimiter.consecutiveErrors = 0;
        }
        
        // Dynamic limit based on error rate
        const maxCalls = this.rateLimiter.consecutiveErrors > 3 ? 30 : 50;
        
        if (this.rateLimiter.apiCalls >= maxCalls) {
            return false;
        }
        
        this.rateLimiter.apiCalls++;
        return true;
    }

    // Optimized utility methods
    checkPermissions(userstate) {
        if (!TWITCH_CONFIG.SUBSCRIBERS_ONLY) return true;
        
        return userstate.subscriber || 
               this.subscribers.has(userstate.username) ||
               (userstate.mod && TWITCH_CONFIG.MODERATORS_BYPASS) ||
               this.moderators.has(userstate.username);
    }

    checkCooldown(username) {
        const cooldownDuration = parseInt(process.env.COOLDOWN_DURATION) || 10;
        const lastUse = this.userCooldowns.get(username);
        const now = Date.now();
        
        if (lastUse && (now - lastUse) < cooldownDuration * 1000) {
            return false;
        }
        
        this.userCooldowns.set(username, now);
        return true;
    }

    prepareText(message, command, username) {
        let text = message.slice(command.length).trim();
        
        if (process.env.SEND_USERNAME === 'true') {
            text = `Message from user ${username}: ${text}`;
        }
        
        return text;
    }

    generateCacheKey(text) {
        // Use a simple hash for better performance
        return text.toLowerCase().trim().substring(0, 50);
    }

    getFromCache(key) {
        const cached = this.cache.responses.get(key);
        if (cached && Date.now() - cached.timestamp < this.cache.ttl) {
            this.cache.hits++;
            return cached.response;
        }
        
        if (cached) {
            this.cache.responses.delete(key);
        }
        
        this.cache.misses++;
        return null;
    }

    addToCache(key, response) {
        // LRU eviction when cache is full
        if (this.cache.responses.size >= this.cache.maxSize) {
            const firstKey = this.cache.responses.keys().next().value;
            this.cache.responses.delete(firstKey);
        }
        
        this.cache.responses.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    updateChatHistory(userText, botResponse) {
        this.chatHistory.push({ role: 'user', content: userText });
        this.chatHistory.push({ role: 'assistant', content: botResponse });
    }

    truncateResponse(text, maxLength = 450) {
        if (text.length <= maxLength) return text;
        
        const truncated = text.substring(0, maxLength - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        
        return lastSpace > maxLength * 0.8 ? 
            truncated.substring(0, lastSpace) + '...' : 
            truncated + '...';
    }

    startOptimizedIntervals() {
        // Aggressive cleanup every 5 minutes
        setInterval(() => {
            this.performCleanup();
        }, 300000);
        
        // Update cache hit rate every minute
        setInterval(() => {
            this.updateMetrics();
        }, 60000);
    }

    performCleanup() {
        const now = Date.now();
        
        // Clean cooldowns (keep only recent ones)
        for (const [username, timestamp] of this.userCooldowns.entries()) {
            if (now - timestamp > 300000) { // 5 minutes
                this.userCooldowns.delete(username);
            }
        }
        
        // Clean expired cache entries
        for (const [key, data] of this.cache.responses.entries()) {
            if (now - data.timestamp > this.cache.ttl) {
                this.cache.responses.delete(key);
            }
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    updateMetrics() {
        const total = this.cache.hits + this.cache.misses;
        this.metrics.cacheHitRate = total > 0 ? (this.cache.hits / total * 100).toFixed(1) : 0;
    }

    // Optimized existing methods
    getCommand(content) {
        const commands = process.env.COMMAND_NAME ? 
            process.env.COMMAND_NAME.split(',') : ['!gpt'];
        
        const lowerContent = content.toLowerCase();
        return commands.find(cmd => lowerContent.startsWith(cmd.trim().toLowerCase()));
    }

    async sendMessage(channel, message) {
        try {
            const truncated = this.truncateResponse(message, 500);
            await this.client.say(channel, truncated);
        } catch (error) {
            console.error('Send message error:', error);
        }
    }

    async generateTTS(text) {
        if (!this.enable_tts) return;
        
        try {
            const mp3 = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text.substring(0, 200), // Limit TTS text length
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            await fsPromises.writeFile('./public/file.mp3', buffer);
        } catch (error) {
            console.error('TTS error:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Lightweight metrics
    getMetrics() {
        return {
            processed: this.metrics.processed,
            errors: this.metrics.errors,
            cacheHitRate: this.metrics.cacheHitRate + '%',
            queueLength: this.messageQueue.length,
            circuitBreakerState: this.circuitBreaker.state,
            adaptiveDelay: this.rateLimiter.adaptiveDelay + 'ms'
        };
    }
}