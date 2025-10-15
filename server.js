import express from 'express';
import { TwitchBot } from './bot.js';
import { job, healthCheckJob, setBotInstance } from './keep_alive.js';
import { validateConfig } from './config.js';

// Validate configuration
if (!validateConfig()) {
    console.error('❌ Configuration validation failed');
    process.exit(1);
}

console.log('🚀 Starting Twitch AI Bot...');

// Initialize Express app
const app = express();
app.set('view engine', 'ejs');
app.use(express.json({ limit: '500kb' }));
app.use('/public', express.static('public', { maxAge: '1d' }));

// Initialize bot
const bot = new TwitchBot();

// Simple response cache for API
const apiCache = new Map();
const API_CACHE_TTL = 180000; // 3 minutes

// Initialize bot and start keep-alive monitoring
bot.initialize().then(() => {
    // Register bot instance for keep-alive monitoring
    setBotInstance(bot);
    
    // Start keep alive jobs
    job.start();
    healthCheckJob.start();
    
    console.log('✅ Keep-alive monitoring started');
}).catch(error => {
    console.error('❌ Bot initialization failed:', error);
    process.exit(1);
});

// Routes
app.get('/', (_, res) => {
    res.render('pages/index');
});

// API endpoint with caching
app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;
    const cacheKey = text.toLowerCase().trim().substring(0, 100);
    
    // Check cache
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) {
        return res.send(cached.response);
    }
    
    try {
        const response = await bot.getResponse(text, 'api-client');
        
        // Cache response
        if (apiCache.size >= 50) {
            const firstKey = apiCache.keys().next().value;
            apiCache.delete(firstKey);
        }
        
        apiCache.set(cacheKey, { response, timestamp: Date.now() });
        res.send(response);
        
    } catch (error) {
        console.error('API error:', error);
        res.status(500).send('Service temporarily unavailable');
    }
});

// Metrics endpoint
app.get('/metrics', (_, res) => {
    res.json({
        bot: bot.getMetrics(),
        server: {
            uptime: Math.round(process.uptime()),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        },
        cache: {
            api: apiCache.size,
            bot: bot.cache.size
        }
    });
});

// Health check
app.get('/health', (_, res) => {
    const botStatus = bot.client ? bot.client.readyState() : 'not_initialized';
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        bot: {
            status: botStatus,
            connected: botStatus === 'OPEN',
            channels: bot.client ? bot.client.getChannels() : []
        },
        timestamp: new Date().toISOString()
    });
});

// Bot status endpoint
app.get('/bot-status', (_, res) => {
    if (!bot.client) {
        return res.json({ status: 'not_initialized' });
    }
    
    const state = bot.client.readyState();
    res.json({
        connectionState: state,
        connected: state === 'OPEN',
        channels: bot.client.getChannels(),
        uptime: process.uptime(),
        metrics: bot.getMetrics()
    });
});

// Cache management
app.post('/clear-cache', (_, res) => {
    apiCache.clear();
    bot.cache.clear();
    res.json({ message: 'Cache cleared' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    res.status(500).json({ error: 'Internal error' });
});

// Start server
const PORT = parseInt(process.env.PORT) || 3000;
const server = app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`📴 Received ${signal}, shutting down...`);
    
    server.close(async () => {
        try {
            await bot.disconnect();
            console.log('✅ Shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ Shutdown error:', error);
            process.exit(1);
        }
    });
    
    setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { bot };
