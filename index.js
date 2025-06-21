import express from 'express';
import fs from 'fs';
import ws from 'ws';
import expressWs from 'express-ws';
import {job} from './keep_alive.js';
import {OpenAIOperations} from './openai_operations.js';
import {TwitchBotV2} from './twitch_bot_v2.js';
import { 
    OPENAI_CONFIG, 
    TWITCH_CONFIG, 
    BOT_CONFIG, 
    SERVER_CONFIG, 
    getFileContext, 
    validateConfig 
} from './config.js';

// Validate configuration before starting
if (!validateConfig()) {
    console.error('Configuration validation failed. Please check your environment variables.');
    process.exit(1);
}

// Start keep alive cron job
job.start();
console.log('Environment configuration loaded:', {
    GPT_MODE: BOT_CONFIG.GPT_MODE,
    MODEL_NAME: OPENAI_CONFIG.MODEL_NAME,
    TEMPERATURE: OPENAI_CONFIG.TEMPERATURE,
    MAX_TOKENS: OPENAI_CONFIG.MAX_TOKENS,
    SUBSCRIBERS_ONLY: TWITCH_CONFIG.SUBSCRIBERS_ONLY
});

// Setup express app
const app = express();
const expressWsInstance = expressWs(app);

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Load context file
const fileContext = getFileContext();

// Setup OpenAI operations
const openaiOps = new OpenAIOperations(fileContext);

// Setup Twitch bot
console.log('Channels:', TWITCH_CONFIG.CHANNELS);
const bot = new TwitchBotV2();

// Initialize and connect bot
bot.initialize().then(() => {
    console.log('Twurple Bot initialized successfully!');
}).catch(error => {
    console.error('Failed to initialize Twurple bot:', error);
    process.exit(1);
});

// WebSocket setup for TTS notifications
app.ws('/check-for-updates', (ws, req) => {
    ws.on('message', message => {
        // Handle WebSocket messages (if needed)
    });
});

app.use(express.json({extended: true, limit: '1mb'}));
app.use('/public', express.static('public'));

app.all('/', (req, res) => {
    console.log('Received a request!');
    res.render('pages/index');
});

// API endpoint for external integrations (Streamelements, Nightbot)
app.get('/gpt/:text', async (req, res) => {
    const text = req.params.text;

    let answer = '';
    try {
        if (BOT_CONFIG.GPT_MODE === 'CHAT') {
            answer = await openaiOps.make_openai_call(text);
        } else if (BOT_CONFIG.GPT_MODE === 'PROMPT') {
            const prompt = `${fileContext}\n\nUser: ${text}\nAgent:`;
            answer = await openaiOps.make_openai_call_completion(prompt);
        } else {
            throw new Error('GPT_MODE is not set to CHAT or PROMPT. Please set it as an environment variable.');
        }

        res.send(answer);
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).send('An error occurred while generating the response.');
    }
});

// New API endpoint for subscriber verification
app.get('/subscriber/:username', async (req, res) => {
    const username = req.params.username;
    const isSubscriber = bot.isSubscriber(username);
    const isModerator = bot.isModerator(username);
    
    res.json({
        username: username,
        isSubscriber: isSubscriber,
        isModerator: isModerator,
        hasAccess: isSubscriber || (isModerator && TWITCH_CONFIG.MODERATORS_BYPASS)
    });
});

// New API endpoint for bot statistics
app.get('/stats', (req, res) => {
    res.json({
        subscriberCount: bot.getSubscriberCount(),
        moderatorCount: bot.getModeratorCount(),
        subscribersOnly: TWITCH_CONFIG.SUBSCRIBERS_ONLY,
        moderatorsBypass: TWITCH_CONFIG.MODERATORS_BYPASS
    });
});

// New API endpoint to reset conversation history
app.post('/reset-history', (req, res) => {
    openaiOps.resetHistory();
    res.json({ message: 'Conversation history reset successfully' });
});

const server = app.listen(SERVER_CONFIG.PORT, () => {
    console.log(`Server running on port ${SERVER_CONFIG.PORT}`);
});

const wss = expressWsInstance.getWss();
wss.on('connection', ws => {
    ws.on('message', message => {
        // Handle client messages (if needed)
    });
});

function notifyFileChange() {
    wss.clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ type: 'file-updated' }));
        }
    });
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await bot.disconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await bot.disconnect();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
