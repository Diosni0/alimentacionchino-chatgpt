import express from 'express';
import { TwitchBot } from './bot.js';
import { job, healthCheckJob, setBotInstance } from './keep_alive.js';
import { validateConfig, OPENAI_CONFIG } from './config.js';

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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0a;
            color: #e4e4e7;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .background-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 50px 50px;
            z-index: -1;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            margin-bottom: 3rem;
            position: relative;
        }
        
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff, #a1a1aa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
        }
        
        .header .subtitle {
            color: #71717a;
            font-size: 1.1rem;
            font-weight: 400;
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        .status-connected { background: #10b981; }
        .status-disconnected { background: #ef4444; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: linear-gradient(145deg, #18181b, #27272a);
            border: 1px solid #3f3f46;
            border-radius: 16px;
            padding: 1.5rem;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        
        .card:hover {
            transform: translateY(-2px);
            border-color: #52525b;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        
        .card-icon {
            font-size: 1.5rem;
        }
        
        .card-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #f4f4f5;
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.25rem;
            font-variant-numeric: tabular-nums;
        }
        
        .metric-label {
            color: #a1a1aa;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .metric-change {
            font-size: 0.75rem;
            margin-top: 0.5rem;
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            font-weight: 500;
        }
        
        .metric-change.positive {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
        }
        
        .metric-change.neutral {
            background: rgba(161, 161, 170, 0.1);
            color: #a1a1aa;
        }
        
        .config-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        
        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #3f3f46;
        }
        
        .config-item:last-child {
            border-bottom: none;
        }
        
        .config-label {
            color: #d4d4d8;
            font-weight: 500;
        }
        
        .config-value {
            color: #ffffff;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            background: rgba(255, 255, 255, 0.05);
            padding: 0.25rem 0.5rem;
            border-radius: 6px;
            font-size: 0.875rem;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .badge.success {
            background: rgba(16, 185, 129, 0.15);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .badge.secondary {
            background: rgba(161, 161, 170, 0.15);
            color: #a1a1aa;
            border: 1px solid rgba(161, 161, 170, 0.3);
        }
        
        .channels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        
        .channel-tag {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            color: #a1a1aa;
        }
        
        .spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #3f3f46;
            border-top: 2px solid #ffffff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            background: linear-gradient(145deg, #7f1d1d, #991b1b);
            border: 1px solid #dc2626;
            color: #fecaca;
            padding: 1rem;
            border-radius: 12px;
            margin: 1rem 0;
            text-align: center;
        }
        
        .last-updated {
            text-align: center;
            color: #71717a;
            font-size: 0.875rem;
            margin-top: 2rem;
            padding: 1rem;
            border-top: 1px solid #3f3f46;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .config-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .realtime-indicator {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #10b981;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            z-index: 100;
        }
        

    </style>
</head>
<body>
    <div class="background-grid"></div>
    <div class="realtime-indicator" id="realtime-status">🔴 Desconectado</div>
    
    <div class="container">
        <div class="header">
            <h1>🤖 M-IA Khalifa V2</h1>
            <p class="subtitle">Dashboard de Monitoreo en Tiempo Real</p>
            <div class="status-indicator" id="main-status">
                <div class="status-dot status-disconnected" id="main-status-dot"></div>
                <span id="main-status-text">Verificando conexión...</span>
            </div>
        </div>
        
        <div id="loading" class="loading">
            <div class="spinner"></div>
            <p>Cargando datos del dashboard...</p>
        </div>
        
        <div id="error" class="error" style="display: none;"></div>
        
        <div id="content" style="display: none;">
            <!-- Metrics Grid -->
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">📊</div>
                        <div class="card-title">Mensajes Procesados</div>
                    </div>
                    <div class="metric-value" id="messages-processed">0</div>
                    <div class="metric-label">Total de interacciones</div>
                    <div class="metric-change neutral" id="messages-change">Sin cambios</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">⚡</div>
                        <div class="card-title">Cache Hit Rate</div>
                    </div>
                    <div class="metric-value" id="cache-hit-rate">0%</div>
                    <div class="metric-label">Eficiencia de cache</div>
                    <div class="metric-change neutral" id="cache-change">Optimizando</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">💾</div>
                        <div class="card-title">Memoria</div>
                    </div>
                    <div class="metric-value" id="memory-usage">0 MB</div>
                    <div class="metric-label">Uso actual</div>
                    <div class="metric-change neutral" id="memory-change">Estable</div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">⏱️</div>
                        <div class="card-title">Uptime</div>
                    </div>
                    <div class="metric-value" id="uptime-display">0s</div>
                    <div class="metric-label">Tiempo activo</div>
                    <div class="metric-change positive" id="uptime-change">En línea</div>
                </div>
            </div>
            
            <!-- Configuration and Status -->
            <div class="config-grid">
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🔗</div>
                        <div class="card-title">Estado de Conexión</div>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Estado</span>
                        <span id="connection-status" class="badge secondary">Verificando...</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Canales Activos</span>
                        <div id="channels-container" class="channels-container">
                            <span class="config-value">Cargando...</span>
                        </div>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Última Actualización</span>
                        <span class="config-value" id="last-update">-</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">🧠</div>
                        <div class="card-title">Configuración IA</div>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Modelo</span>
                        <span class="config-value" id="ai-model">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Razonamiento</span>
                        <span id="reasoning-status" class="badge secondary">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Temperatura</span>
                        <span class="config-value" id="temperature-value">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Max Tokens</span>
                        <span class="config-value" id="max-tokens-value">-</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">⚙️</div>
                        <div class="card-title">Configuración Bot</div>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Cooldown</span>
                        <span class="config-value" id="cooldown-value">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Solo Suscriptores</span>
                        <span class="config-value" id="subscribers-only-value">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Comandos</span>
                        <span class="config-value" id="commands-value">-</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon">💻</div>
                        <div class="card-title">Sistema</div>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Plataforma</span>
                        <span class="config-value" id="platform-value">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Node.js</span>
                        <span class="config-value" id="node-version">-</span>
                    </div>
                    <div class="config-item">
                        <span class="config-label">Memoria Total</span>
                        <span class="config-value" id="memory-total">-</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="last-updated">
            <span id="last-refresh">Última actualización: Nunca</span>
        </div>
    </div>

    <script>
        let previousData = null;
        
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
                
                // Update realtime indicator
                const realtimeStatus = document.getElementById('realtime-status');
                const mainStatusDot = document.getElementById('main-status-dot');
                const mainStatusText = document.getElementById('main-status-text');
                
                if (data.bot.status === 'connected') {
                    realtimeStatus.textContent = '🟢 En Línea';
                    realtimeStatus.style.background = 'rgba(16, 185, 129, 0.15)';
                    realtimeStatus.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    realtimeStatus.style.color = '#10b981';
                    
                    mainStatusDot.className = 'status-dot status-connected';
                    mainStatusText.textContent = 'Conectado y funcionando';
                } else {
                    realtimeStatus.textContent = '🔴 Desconectado';
                    realtimeStatus.style.background = 'rgba(239, 68, 68, 0.15)';
                    realtimeStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    realtimeStatus.style.color = '#ef4444';
                    
                    mainStatusDot.className = 'status-dot status-disconnected';
                    mainStatusText.textContent = 'Desconectado';
                }
                
                // Update metrics with animations
                updateMetricWithChange('messages-processed', data.bot.metrics.processed || 0, previousData?.bot?.metrics?.processed);
                updateMetricWithChange('cache-hit-rate', data.bot.metrics.cacheHitRate || '0%');
                updateMetricWithChange('memory-usage', data.system.memory.used + ' MB', previousData?.system?.memory?.used);
                updateMetricWithChange('uptime-display', data.bot.uptime ? data.bot.uptime.formatted : '0s');
                
                // Update connection status
                const connectionStatus = document.getElementById('connection-status');
                if (data.bot.status === 'connected') {
                    connectionStatus.className = 'badge success';
                    connectionStatus.textContent = '✅ Conectado';
                } else {
                    connectionStatus.className = 'badge secondary';
                    connectionStatus.textContent = '❌ Desconectado';
                }
                
                // Update channels
                const channelsContainer = document.getElementById('channels-container');
                channelsContainer.innerHTML = '';
                if (data.bot.channels && data.bot.channels.length > 0) {
                    data.bot.channels.forEach(channel => {
                        const tag = document.createElement('span');
                        tag.className = 'channel-tag';
                        tag.textContent = channel;
                        channelsContainer.appendChild(tag);
                    });
                } else {
                    channelsContainer.innerHTML = '<span class="config-value">Ninguno</span>';
                }
                
                // Update last update time
                const now = new Date();
                document.getElementById('last-update').textContent = now.toLocaleTimeString();
                
                // Update AI configuration
                document.getElementById('ai-model').textContent = data.config.model;
                
                const reasoningStatus = document.getElementById('reasoning-status');
                
                if (data.bot.reasoning.enabled) {
                    reasoningStatus.className = 'badge success';
                    reasoningStatus.textContent = \`🧠 \${data.bot.reasoning.effort.toUpperCase()}\`;
                } else {
                    reasoningStatus.className = 'badge secondary';
                    reasoningStatus.textContent = '❌ Desactivado';
                }
                
                document.getElementById('temperature-value').textContent = data.config.temperature;
                document.getElementById('max-tokens-value').textContent = data.config.maxTokens;
                
                // Update bot configuration
                document.getElementById('cooldown-value').textContent = data.config.cooldown + 's';
                document.getElementById('subscribers-only-value').textContent = data.config.subscribersOnly ? 'Sí' : 'No';
                document.getElementById('commands-value').textContent = data.config.commandNames.join(', ');
                
                // Update system info
                document.getElementById('platform-value').textContent = data.system.platform;
                document.getElementById('node-version').textContent = data.system.nodeVersion;
                document.getElementById('memory-total').textContent = data.system.memory.total + ' MB';
                
                // Update last refresh time
                document.getElementById('last-refresh').textContent = 
                    \`Última actualización: \${now.toLocaleTimeString()}\`;
                
                // Store current data for next comparison
                previousData = data;
                
                // Show content, hide loading
                document.getElementById('loading').style.display = 'none';
                document.getElementById('content').style.display = 'block';
                document.getElementById('error').style.display = 'none';
                
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Error: ' + error.message;
                
                // Update realtime indicator to show error
                const realtimeStatus = document.getElementById('realtime-status');
                realtimeStatus.textContent = '⚠️ Error';
                realtimeStatus.style.background = 'rgba(239, 68, 68, 0.15)';
                realtimeStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                realtimeStatus.style.color = '#ef4444';
            }
        }
        
        function updateMetricWithChange(elementId, newValue, previousValue) {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            // Add subtle animation when value changes
            if (previousValue !== undefined && previousValue !== newValue) {
                element.style.transform = 'scale(1.05)';
                element.style.transition = 'transform 0.2s ease';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
            
            element.textContent = newValue;
            
            // Update change indicators
            const changeElement = document.getElementById(elementId.replace('-', '-').replace('display', 'change'));
            if (changeElement) {
                if (elementId === 'messages-processed' && previousValue !== undefined) {
                    const diff = parseInt(newValue) - parseInt(previousValue);
                    if (diff > 0) {
                        changeElement.textContent = \`+\${diff} nuevos\`;
                        changeElement.className = 'metric-change positive';
                    } else {
                        changeElement.textContent = 'Sin cambios';
                        changeElement.className = 'metric-change neutral';
                    }
                }
            }
        }
        
        // Load data when page loads
        document.addEventListener('DOMContentLoaded', loadData);
        
        // Auto-refresh every 15 seconds for more real-time feel
        setInterval(loadData, 15000);
        
        // Add some visual feedback when refreshing
        let refreshCount = 0;
        setInterval(() => {
            refreshCount++;
            const indicator = document.getElementById('realtime-status');
            if (indicator && indicator.textContent.includes('En Línea')) {
                indicator.style.opacity = '0.7';
                setTimeout(() => {
                    indicator.style.opacity = '1';
                }, 100);
            }
        }, 15000);
        

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
