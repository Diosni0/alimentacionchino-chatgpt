import express from 'express';
import { TwitchBot } from './bot.js';
import { job, healthCheckJob, setBotInstance } from './keep_alive.js';
import { validateConfig } from './config.js';

// Validate configuration
if (!validateConfig()) {
    console.error('ÔØî Configuration validation failed');
    process.exit(1);
}

console.log('­ƒÜÇ Starting Twitch AI Bot...');

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
    
    console.log('Ô£à Keep-alive monitoring started');
}).catch(error => {
    console.error('ÔØî Bot initialization failed:', error);
    process.exit(1);
});

// Routes
app.get('/', (_, res) => {
    res.render('pages/index');
});

// Dashboard route
app.get('/dashboard', (_, res) => {
    res.render('pages/dashboard');
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

// Dashboard data endpoint
app.get('/api/dashboard', (_, res) => {
    const botConnected = bot.client && bot.client.readyState() === 'OPEN';
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    res.json({
        bot: {
            status: botConnected ? 'connected' : 'disconnected',
            connectionState: bot.client ? bot.client.readyState() : 'not_initialized',
            channels: bot.client ? bot.client.getChannels() : [],
            uptime: {
                seconds: Math.round(uptime),
                formatted: formatUptime(uptime)
            },
            metrics: bot.getMetrics(),
            reasoning: {
                enabled: bot.isUsingReasoning(),
                effort: process.env.REASONING_EFFORT || 'low'
            }
        },
        config: {
            model: process.env.MODEL_NAME || 'gpt-4o',
            firstChatModel: process.env.FIRST_CHAT_MODEL || process.env.MODEL_NAME || 'gpt-4o',
            temperature: parseFloat(process.env.TEMPERATURE) || 1.0,
            maxTokens: parseInt(process.env.MAX_TOKENS) || 200,
            cooldown: parseInt(process.env.COOLDOWN_DURATION) || 10,
            subscribersOnly: process.env.SUBSCRIBERS_ONLY === 'true',
            commandNames: (process.env.COMMAND_NAME || '!gpt').split(',').map(cmd => cmd.trim())
        },
        system: {
            memory: {
                used: Math.round(memory.heapUsed / 1024 / 1024),
                total: Math.round(memory.heapTotal / 1024 / 1024),
                external: Math.round(memory.external / 1024 / 1024)
            },
            cache: {
                api: apiCache.size,
                bot: bot.cache ? bot.cache.size : 0
            },
            nodeVersion: process.version,
            platform: process.platform
        }
    });
});

// Helper function to format uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

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
    console.log(`­ƒîÉ Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`­ƒô┤ Received ${signal}, shutting down...`);
    
    server.close(async () => {
        try {
            await bot.disconnect();
            console.log('Ô£à Shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('ÔØî Shutdown error:', error);
            process.exit(1);
        }
    });
    
    setTimeout(() => process.exit(1), 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { bot };
