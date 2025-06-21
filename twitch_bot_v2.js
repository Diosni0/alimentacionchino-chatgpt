import { ApiClient } from '@twurple/api';
import { ChatClient } from '@twurple/tmi';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import { TWITCH_CONFIG, OPENAI_CONFIG } from './config.js';

export class TwitchBotV2 {
    constructor() {
        this.chatClient = null;
        this.apiClient = null;
        this.openai = new OpenAI({ apiKey: OPENAI_CONFIG.API_KEY });
        this.enable_tts = process.env.ENABLE_TTS === 'true';
        this.subscribers = new Set();
        this.moderators = new Set();
        this.lastResponseTime = 0;
    }

    async initialize() {
        try {
            // Create API client for subscription checking
            if (TWITCH_CONFIG.CLIENT_ID && TWITCH_CONFIG.CLIENT_SECRET) {
                this.apiClient = new ApiClient({
                    clientId: TWITCH_CONFIG.CLIENT_ID,
                    clientSecret: TWITCH_CONFIG.CLIENT_SECRET,
                });
            }

            // Create chat client
            this.chatClient = new ChatClient({
                authProvider: {
                    clientId: TWITCH_CONFIG.CLIENT_ID,
                    clientSecret: TWITCH_CONFIG.CLIENT_SECRET,
                    onRefresh: async (userId, newTokenData) => {
                        console.log('Token refreshed for user', userId);
                    },
                },
                channels: TWITCH_CONFIG.CHANNELS,
            });

            // Set up event handlers
            this.setupEventHandlers();

            // Connect to Twitch
            await this.chatClient.connect();
            console.log('Twurple Bot connected successfully!');

            // Join channels
            for (const channel of TWITCH_CONFIG.CHANNELS) {
                console.log(`Joined channel: ${channel}`);
            }

        } catch (error) {
            console.error('Error initializing Twurple bot:', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // Handle incoming messages
        this.chatClient.onMessage(async (channel, user, message, self) => {
            if (self) return;
            await this.handleMessage(channel, user, message);
        });

        // Handle subscription events
        this.chatClient.onSub((channel, user) => {
            const username = user;
            this.subscribers.add(username);
            console.log(`New subscriber detected: ${username}`);
        });

        // Handle subscription end events
        this.chatClient.onSubEnd((channel, user) => {
            const username = user;
            this.subscribers.delete(username);
            console.log(`Subscription ended for: ${username}`);
        });

        // Handle moderator events
        this.chatClient.onMod((channel, user) => {
            const username = user;
            this.moderators.add(username);
            console.log(`New moderator detected: ${username}`);
        });

        this.chatClient.onUnmod((channel, user) => {
            const username = user;
            this.moderators.delete(username);
            console.log(`Moderator removed: ${username}`);
        });

        // Handle connection events
        this.chatClient.onConnect(() => {
            console.log('Bot is ready!');
        });

        this.chatClient.onDisconnect((reason) => {
            console.log('Bot disconnected:', reason);
        });
    }

    async handleMessage(channel, user, message) {
        const username = user;
        const content = message;

        // Check if user has permission to use the bot
        if (TWITCH_CONFIG.SUBSCRIBERS_ONLY) {
            const isSubscriber = this.subscribers.has(username);
            const isModerator = this.moderators.has(username);
            const hasPermission = isSubscriber || (isModerator && TWITCH_CONFIG.MODERATORS_BYPASS);
            
            if (!hasPermission) {
                await this.sendMessage(channel, `@${username} Sorry, this bot is only available for subscribers!`);
                return;
            }
        }

        // Handle commands
        const command = this.getCommand(content);
        if (command) {
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
                    { role: "system", content: "You are a helpful Twitch Chatbot." },
                    { role: "user", content: text }
                ],
                temperature: OPENAI_CONFIG.TEMPERATURE,
                max_tokens: OPENAI_CONFIG.MAX_TOKENS,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    async sendMessage(channel, message) {
        try {
            await this.chatClient.say(channel, message);
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
        if (this.chatClient) {
            await this.chatClient.disconnect();
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