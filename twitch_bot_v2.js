import tmi from 'tmi.js';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import { TWITCH_CONFIG, OPENAI_CONFIG, getFileContext } from './config.js';

export class TwitchBotV2 {
    constructor() {
        this.client = null;
        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });
        this.enable_tts = process.env.ENABLE_TTS === 'true';
        this.subscribers = new Set();
        this.moderators = new Set();
        this.lastResponseTime = 0;
        this.fileContext = getFileContext();
    }

    async initialize() {
        try {
            // Create TMI client
            this.client = new tmi.client({
                connection: {
                    reconnect: true,
                    secure: true
                },
                identity: {
                    username: TWITCH_CONFIG.USERNAME,
                    password: TWITCH_CONFIG.OAUTH_TOKEN
                },
                channels: TWITCH_CONFIG.CHANNELS
            });

            // Set up event handlers
            this.setupEventHandlers();

            // Connect to Twitch
            await this.client.connect();
            console.log('TMI Bot connected successfully!');

            // Join channels
            for (const channel of TWITCH_CONFIG.CHANNELS) {
                console.log(`Joined channel: ${channel}`);
            }

        } catch (error) {
            console.error('Error initializing TMI bot:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // Handle incoming messages
        this.client.on('message', async (channel, userstate, message, self) => {
            if (self) return;
            await this.handleMessage(channel, userstate, message);
        });

        // Handle subscription events
        this.client.on('subscription', (channel, username, method, message, userstate) => {
            this.subscribers.add(username);
            console.log(`New subscriber detected: ${username}`);
        });

        // Handle subscription end events
        this.client.on('resub', (channel, username, months, message, userstate, methods) => {
            this.subscribers.add(username);
            console.log(`Resub detected: ${username} for ${months} months`);
        });

        // Handle moderator events
        this.client.on('mod', (channel, username) => {
            this.moderators.add(username);
            console.log(`New moderator detected: ${username}`);
        });

        this.client.on('unmod', (channel, username) => {
            this.moderators.delete(username);
            console.log(`Moderator removed: ${username}`);
        });

        // Handle connection events
        this.client.on('connected', (addr, port) => {
            console.log('Bot is ready!');
        });

        this.client.on('disconnected', (reason) => {
            console.log('Bot disconnected:', reason);
        });
    }

    async handleMessage(channel, userstate, message) {
        const username = userstate.username;
        const content = message;

        // Handle commands
        const command = this.getCommand(content);
        if (command) {
            // Check if user has permission to use the bot ONLY when they use a command
            if (TWITCH_CONFIG.SUBSCRIBERS_ONLY) {
                const isSubscriber = userstate.subscriber || this.subscribers.has(username);
                const isModerator = userstate.mod || this.moderators.has(username);
                const hasPermission = isSubscriber || (isModerator && TWITCH_CONFIG.MODERATORS_BYPASS);
                
                if (!hasPermission) {
                    await this.sendMessage(channel, `@${username} Lo siento cariño, si quieres que te dedique mi atención tendras que suscribirte alimen1Xixilove1`);
                    return;
                }
            }
            
            await this.handleCommand(channel, username, content, command);
        }
    }

    getCommand(content) {
        const commands = process.env.COMMAND_NAME ? process.env.COMMAND_NAME.split(',').map(cmd => cmd.trim().toLowerCase()) : ['!gpt'];
        return commands.find(cmd => content.toLowerCase().startsWith(cmd));
    }

    async handleCommand(channel, username, content, command) {
        // Check cooldown
        const currentTime = Date.now();
        const cooldownDuration = parseInt(process.env.COOLDOWN_DURATION) || 10;
        const elapsedTime = (currentTime - this.lastResponseTime) / 1000;

        if (elapsedTime < cooldownDuration) {
            const remainingTime = Math.round(cooldownDuration - elapsedTime);
            await this.sendMessage(channel, `@${username} Please wait ${remainingTime} second${remainingTime !== 1 ? 's' : ''} before using the command again.`);
            return;
        }

        this.lastResponseTime = currentTime;

        // Extract the message content
        let text = content.slice(command.length).trim();
        if (process.env.SEND_USERNAME === 'true') {
            text = `Message from user ${username}: ${text}`;
        }

        // Generate response using OpenAI
        try {
            const response = await this.generateResponse(text);
            await this.sendMessage(channel, `@${username} ${response}`);

            // Handle TTS if enabled
            if (this.enable_tts) {
                await this.generateTTS(response);
            }
        } catch (error) {
            console.error('Error handling command:', error);
            await this.sendMessage(channel, `@${username} Sorry, something went wrong. Please try again later.`);
        }
    }

    async generateResponse(text) {
        try {
            const response = await this.openai.chat.completions.create({
                model: OPENAI_CONFIG.MODEL_NAME,
                messages: [
                    { role: "system", content: this.fileContext },
                    { role: "user", content: text }
                ],
                temperature: OPENAI_CONFIG.TEMPERATURE,
                max_tokens: OPENAI_CONFIG.MAX_TOKENS,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
                stop: ["\n\n", "User:", "Human:", "Assistant:"]
            });

            let responseText = response.choices[0].message.content;
            
            // Limpiar espacios extra
            responseText = responseText.trim().replace(/\s+/g, ' ');
            
            return responseText;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    async sendMessage(channel, message) {
        try {
            await this.client.say(channel, message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async generateTTS(text) {
        if (!this.enable_tts) {
            return;
        }

        try {
            const mp3 = await this.openai.audio.speech.create({
                model: 'tts-1',
                voice: 'alloy',
                input: text,
            });

            const buffer = Buffer.from(await mp3.arrayBuffer());
            const filePath = './public/file.mp3';
            await fsPromises.writeFile(filePath, buffer);

            return filePath;
        } catch (error) {
            console.error('Error in TTS generation:', error);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            console.log('Bot disconnected');
        }
    }

    // Utility methods
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