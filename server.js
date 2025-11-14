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
// Test route to check if server is working
app.get('/test', (_, res) => {
    res.send('Server is working! Bot status: ' + (bot ? 'initialized' : 'not initialized'));
});

// Main route - Dashboard as homepage (redirect to working static version)
app.get('/', (_, res) => {
    res.redirect('/static');
});

// Static HTML version for testing
app.get('/static', (_, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M-IA Khalifa V2 - Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }
        .status {
            font-size: 18px;
            margin: 10px 0;
        }
        .loading {
            text-align: center;
            padding: 40px;
        }
        .error {
            background: rgba(255, 0, 0, 0.2);
            border: 1px solid red;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 M-IA Khalifa V2 Dashboard</h1>
        
        <div id="loading" class="loading">
            <p>Cargando datos...</p>
        </div>
        
        <div id="error" class="error" style="display: none;"></div>
        
        <div id="content" style="display: none;">
            <div class="card">
                <h3>Estado del Bot</h3>
                <div class="status" id="bot-status">Verificando...</div>
                <div class="status" id="bot-uptime">Uptime: -</div>
                <div class="status" id="bot-channels">Canales: -</div>
            </div>
            
            <div class="card">
                <h3>Configuración</h3>
                <div class="status" id="config-model">Modelo: -</div>
                <div class="status" id="config-reasoning">Razonamiento: -</div>
                <div class="status" id="config-temp">Temperatura: -</div>
            </div>
            
            <div class="card">
                <h3>Sistema</h3>
                <div class="status" id="system-memory">Memoria: -</div>
                <div class="status" id="system-platform">Plataforma: -</div>
            </div>
        </div>
    </div>

    <script>
        async function loadData() {
            try {
                console.log('Cargando datos del dashboard...');
                
                const response = await fetch('/api/dashboard');
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                }
                
                const data = await response.json();
                console.log('Data received:', data);
                
                // Update UI
                document.getElementById('bot-status').textContent = 
                    \`Estado: \${data.bot.status === 'connected' ? '✅ Conectado' : '❌ Desconectado'}\`;
                
                document.getElementById('bot-uptime').textContent = 
                    \`Uptime: \${data.bot.uptime ? data.bot.uptime.formatted : 'N/A'}\`;
                
                document.getElementById('bot-channels').textContent = 
                    \`Canales: \${data.bot.channels ? data.bot.channels.join(', ') : 'Ninguno'}\`;
                
                document.getElementById('config-model').textContent = 
                    \`Modelo: \${data.config.model}\`;
                
                document.getElementById('config-reasoning').textContent = 
                    \`Razonamiento: \${data.bot.reasoning.enabled ? 'Activo (' + data.bot.reasoning.effort + ')' : 'Desactivado'}\`;
                
                document.getElementById('config-temp').textContent = 
                    \`Temperatura: \${data.config.temperature}\`;
                
                document.getElementById('system-memory').textContent = 
                    \`Memoria: \${data.system.memory.used}MB / \${data.system.memory.total}MB\`;
                
                document.getElementById('system-platform').textContent = 
                    \`Plataforma: \${data.system.platform}\`;
                
                // Show content, hide loading
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Error: ' + error.message;
            }
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', loadData);
        
        // Auto-refresh every 30 seconds
        setInterval(loadData, 30000);
    </script>
</body>
</html>
    `);
});

// Keep old index for reference (optional)
app.get('/old', (_, res) => {
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

// Dashboard data endpoint
app.get('/api/dashboard', (_, res) => {
    try {
        const botConnected = bot && bot.client && bot.client.readyState() === 'OPEN';
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        
        // Safe bot metrics
        let botMetrics = { processed: 0, errors: 0, cacheHitRate: '0%', cacheSize: 0, subscribers: 0, moderators: 0 };
        try {
            if (bot && typeof bot.getMetrics === 'function') {
                botMetrics = bot.getMetrics();
            }
        } catch (e) {
            console.warn('Error getting bot metrics:', e.message);
        }
        
        // Safe reasoning check
        let reasoningEnabled = false;
        try {
            if (bot && typeof bot.isUsingReasoning === 'function') {
                reasoningEnabled = bot.isUsingReasoning();
            }
        } catch (e) {
            console.warn('Error checking reasoning mode:', e.message);
        }
        
        res.json({
            bot: {
                status: botConnected ? 'connected' : 'disconnected',
                connectionState: bot && bot.client ? bot.client.readyState() : 'not_initialized',
                channels: bot && bot.client ? (bot.client.getChannels() || []) : [],
                uptime: {
                    seconds: Math.round(uptime),
                    formatted: formatUptime(uptime)
                },
                metrics: botMetrics,
                reasoning: {
                    enabled: reasoningEnabled,
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
                    bot: bot && bot.cache ? bot.cache.size : 0
                },
                nodeVersion: process.version,
                platform: process.platform
            }
        });
    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({ 
            error: 'Dashboard data error', 
            message: error.message,
            bot: { status: 'error' }
        });
    }
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
