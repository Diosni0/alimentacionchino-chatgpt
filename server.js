import express from 'express';
import { TelegramAIBot } from './bot.js';
import { SERVER_CONFIG, validateConfig } from './config.js';

if (!validateConfig()) {
    process.exit(1);
}

const app = express();
app.use(express.json());

const bot = new TelegramAIBot();

async function start() {
    try {
        await bot.start();
        console.log('🚀 Telegram bot started and polling for updates');
    } catch (error) {
        console.error('Failed to start Telegram bot:', error);
        process.exit(1);
    }
}

app.get('/', (_, res) => {
    res.json({
        name: 'M-IA Khalifa V2',
        status: 'ok',
        description: 'Telegram bot with OpenAI backend and aggressive personality.',
        documentation: 'Set TELEGRAM_BOT_TOKEN, OPENAI_API_KEY and ADMIN_USERS environment variables.'
    });
});

app.get('/health', (_, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/metrics', (_, res) => {
    res.json(bot.getMetrics());
});

const server = app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`🌐 HTTP server listening on port ${SERVER_CONFIG.PORT}`);
});

const shutdown = async (signal) => {
    console.log(`⚠️  Received ${signal}, shutting down gracefully...`);

    try {
        await bot.stop();
        server.close(() => {
            console.log('✅ Shutdown complete');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
