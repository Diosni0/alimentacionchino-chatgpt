import express from 'express';
import { job } from './keep_alive.js';
import { UltraOptimizedTwitchBot } from './twitch_bot_ultra_optimized.js';
import { 
    OPENAI_CONFIG, 
    TWITCH_CONFIG, 
    SERVER_CONFIG, 
    validateConfig 
} from './config.js';

// Validate configuration
if (!validateConfig()) {
    console.error('Configuration validation failed');
    process.exit(1);
}

// Start keep alive job
job.start();

console.log('Starting ultra-optimized bot...');

// Minimal Express setup
const app = express();
app.set('view engine', 'ejs');
app.use(express.json({ limit: '500kb' })); // Reduced limit
app.use('/public', express.static('public', { maxAge: '1d' })); // Add caching

// Initialize bot
const bot = new UltraOptimizedTwitchBot();

// Simple response cache for API endpoints
const apiCache = new Map();
const API_CACHE_TTL = 180000; // 3 minutes

// Initialize bot
bot.initialize().then(() => {
    console.log('Ultra-optimized bot ready!');
}).catch(error => {
    console.error('Bot initialization failed:', error);
    process.exit(1);
});

// Minimal routes
app.get('/', (_, res) => {
    res.render('pages/index');
});

// Ultra-optimized API endpoint
app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;
    const cacheKey = text.toLowerCase().trim().substring(0, 100);
    
    // Check cache
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) {
        return res.send(cached.response);
    }
    
    try {
        const response = await bot.generateResponse(text);
        
        // Cache response
        if (apiCache.size >= 50) {
            const firstKey = apiCache.keys().next().value;
            apiCache.delete(firstKey);
        }
        
        apiCache.set(cacheKey, {
            response,
            timestamp: Date.now()
        });
        
        res.send(response);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Service temporarily unavailable');
    }
});

// Lightweight metrics endpoint
app.get('/metrics', (_, res) => {
    res.json({
        bot: bot.getMetrics(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            uptime: Math.round(process.uptime()) + 's'
        },
        cache: {
            api: apiCache.size,
            bot: bot.cache.responses.size
        }
    });
});

// Simple health check
app.get('/health', (_, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        bot: bot.client ? 'connected' : 'disconnected'
    });
});

// Cache management
app.post('/clear-cache', (_, res) => {
    apiCache.clear();
    bot.cache.responses.clear();
    res.json({ message: 'Cache cleared' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({ error: 'Internal error' });
});

// Start server
const server = app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`Ultra-optimized server running on port ${SERVER_CONFIG.PORT}`);
});

// Optimized graceful shutdown
const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down...`);
    
    server.close(async () => {
        try {
            await bot.disconnect();
            console.log('Shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('Shutdown error:', error);
            process.exit(1);
        }
    });
    
    // Force shutdown after 5 seconds
    setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Minimal error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});

export { bot };