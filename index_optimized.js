import express from 'express';
import expressWs from 'express-ws';
import { job } from './keep_alive.js';
import { OptimizedTwitchBot } from './twitch_bot_optimized.js';
import { PerformanceMonitor } from './performance_monitor.js';
import { 
    OPENAI_CONFIG, 
    TWITCH_CONFIG, 
    BOT_CONFIG, 
    SERVER_CONFIG, 
    validateConfig 
} from './config.js';

// Validate configuration
if (!validateConfig()) {
    console.error('Configuration validation failed');
    process.exit(1);
}

// Initialize performance monitoring
const monitor = new PerformanceMonitor();

// Start keep alive job
job.start();

console.log('Starting optimized bot with config:', {
    MODEL: OPENAI_CONFIG.MODEL_NAME,
    CHANNELS: TWITCH_CONFIG.CHANNELS.length,
    SUBSCRIBERS_ONLY: TWITCH_CONFIG.SUBSCRIBERS_ONLY
});

// Setup Express app
const app = express();
const expressWsInstance = expressWs(app);

app.set('view engine', 'ejs');
app.use(express.json({ limit: '1mb' }));
app.use('/public', express.static('public'));

// Initialize bot
const bot = new OptimizedTwitchBot();

// Add performance monitoring to bot
const originalHandleMessage = bot.handleMessage.bind(bot);
bot.handleMessage = async function(channel, userstate, message, self) {
    const startTime = Date.now();
    monitor.recordMessage(userstate.username);
    
    try {
        await originalHandleMessage(channel, userstate, message, self);
        monitor.recordRequest(true);
    } catch (error) {
        monitor.recordRequest(false);
        throw error;
    }
};

// Initialize bot
bot.initialize().then(() => {
    console.log('Optimized bot initialized successfully!');
}).catch(error => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
});

// Routes
app.get('/', (req, res) => {
    res.render('pages/index');
});

// Optimized API endpoint with caching
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;
    const cacheKey = text.toLowerCase().trim();
    
    // Check cache first
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        monitor.recordRequest(true, true);
        return res.send(cached.response);
    }
    
    const startTime = Date.now();
    
    try {
        // Use bot's optimized response generation
        const response = await bot.generateResponseWithRetry(text);
        
        // Cache the response
        responseCache.set(cacheKey, {
            response,
            timestamp: Date.now()
        });
        
        // Clean cache if too large
        if (responseCache.size > 100) {
            const firstKey = responseCache.keys().next().value;
            responseCache.delete(firstKey);
        }
        
        const latency = Date.now() - startTime;
        monitor.recordApiCall(latency, true);
        monitor.recordRequest(true);
        
        res.send(response);
    } catch (error) {
        const latency = Date.now() - startTime;
        monitor.recordApiCall(latency, false);
        monitor.recordRequest(false);
        
        console.error('API endpoint error:', error);
        res.status(500).send('Error generating response');
    }
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
    const botMetrics = bot.getMetrics();
    const systemMetrics = monitor.getStats();
    
    res.json({
        bot: botMetrics,
        system: systemMetrics,
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        bot: {
            connected: bot.client && bot.client.readyState() === 'OPEN',
            channels: TWITCH_CONFIG.CHANNELS.length
        }
    };
    
    res.json(health);
});

// User info endpoints (optimized)
app.get('/subscriber/:username', (req, res) => {
    const username = req.params.username;
    const isSubscriber = bot.isSubscriber(username);
    const isModerator = bot.isModerator(username);
    
    res.json({
        username,
        isSubscriber,
        isModerator,
        hasAccess: isSubscriber || (isModerator && TWITCH_CONFIG.MODERATORS_BYPASS)
    });
});

app.get('/stats', (req, res) => {
    res.json({
        subscriberCount: bot.getSubscriberCount(),
        moderatorCount: bot.getModeratorCount(),
        subscribersOnly: TWITCH_CONFIG.SUBSCRIBERS_ONLY,
        moderatorsBypass: TWITCH_CONFIG.MODERATORS_BYPASS,
        performance: monitor.getStats()
    });
});

// Reset endpoints
app.post('/reset-cache', (req, res) => {
    responseCache.clear();
    bot.responseCache.clear();
    res.json({ message: 'Cache cleared successfully' });
});

app.post('/reset-metrics', (req, res) => {
    monitor.reset();
    res.json({ message: 'Metrics reset successfully' });
});

// WebSocket for real-time updates
app.ws('/updates', (ws, req) => {
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                type: 'metrics',
                data: {
                    bot: bot.getMetrics(),
                    system: monitor.getStats()
                }
            }));
        }
    }, 5000);
    
    ws.on('close', () => {
        clearInterval(interval);
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    monitor.recordRequest(false);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`Optimized server running on port ${SERVER_CONFIG.PORT}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    // Stop accepting new connections
    server.close(async () => {
        try {
            // Disconnect bot
            await bot.disconnect();
            
            // Log final metrics
            monitor.logPerformanceSummary();
            
            console.log('Shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log('Force shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    monitor.recordRequest(false);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    monitor.recordRequest(false);
});

export { bot, monitor };