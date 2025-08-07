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
        // Historial de mensajes para el chat (usuario y bot)
        this.chatHistory = [{ role: 'system', content: this.fileContext }];
    }

    // Helper method to determine if model uses max_completion_tokens
    usesMaxCompletionTokens(model) {
        // Most newer models use max_completion_tokens, only older ones use max_tokens
        const modelLower = model.toLowerCase();
        
        // Models that still use max_tokens (older models)
        const oldModels = [
            'gpt-3.5-turbo',
            'gpt-4-turbo',
            'gpt-4-0613',
            'gpt-4-0314',
            'gpt-4-32k',
            'text-davinci-003',
            'text-davinci-002'
        ];
        
        // Check if it's an old model that uses max_tokens
        const isOldModel = oldModels.some(oldModel => modelLower.includes(oldModel));
        
        // If it's not an old model, assume it uses max_completion_tokens
        return !isOldModel;
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
                    await this.sendMessage(channel, `@${username} Lo siento cariño, si quieres que te dedique mi atención tendras que suscribirte.`);
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
            await this.sendMessage(channel, `@${username} no me des la brasa, que pareces Jose, espera ${remainingTime} segundo${remainingTime !== 1 ? 's' : ''}.`);
            return;
        }

        this.lastResponseTime = currentTime;

        // Extract the message content
        let text = content.slice(command.length).trim();
        if (process.env.SEND_USERNAME === 'true') {
            text = `Message from user ${username}: ${text}`;
        }

        // Añadir mensaje del usuario al historial
        this.chatHistory.push({ role: 'user', content: text });
        // Limitar historial según HISTORY_LENGTH (pares user/assistant)
        const maxHistory = OPENAI_CONFIG.HISTORY_LENGTH;
        // chatHistory: [system, user, assistant, user, assistant, ...]
        // Mantener solo los últimos N pares + system
        while (this.chatHistory.length > (maxHistory * 2 + 1)) {
            this.chatHistory.splice(1, 2); // Elimina el par más antiguo (user+assistant)
        }

        // Generar respuesta usando historial
        try {
            const response = await this.generateResponseWithHistory();
            // Añadir respuesta del bot al historial
            this.chatHistory.push({ role: 'assistant', content: response });
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

    async generateResponseWithHistory() {
        try {
            // Prepare parameters with correct token parameter based on model
            const params = {
                model: OPENAI_CONFIG.MODEL_NAME,
                messages: this.chatHistory,
                temperature: OPENAI_CONFIG.TEMPERATURE,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
                stop: ["\n\n", "User:", "Human:", "Assistant:"]
            };

            // Use correct token parameter based on model
            console.log(`Using model: ${OPENAI_CONFIG.MODEL_NAME}`);
            if (this.usesMaxCompletionTokens(OPENAI_CONFIG.MODEL_NAME)) {
                console.log('Using max_completion_tokens parameter');
                params.max_completion_tokens = OPENAI_CONFIG.MAX_TOKENS;
            } else {
                console.log('Using max_tokens parameter');
                params.max_tokens = OPENAI_CONFIG.MAX_TOKENS;
            }

            const response = await this.openai.chat.completions.create(params);

            let responseText = response.choices[0].message.content;
            // Limpiar espacios extra
            responseText = responseText.trim().replace(/\s+/g, ' ');
            // Cortar la respuesta si es demasiado larga para Twitch (límite 500 caracteres)
            const maxLength = 500;
            if (responseText.length > maxLength) {
                const truncated = responseText.substring(0, maxLength - 3);
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > maxLength * 0.8) {
                    responseText = truncated.substring(0, lastSpace) + '...';
                } else {
                    responseText = truncated + '...';
                }
            }
            return responseText;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }

    async sendMessage(channel, message) {
        try {
            // Validar que el mensaje no exceda el límite de Twitch (500 caracteres)
            const maxLength = 500;
            if (message.length > maxLength) {
                // Cortar el mensaje de forma inteligente
                const truncated = message.substring(0, maxLength - 3);
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > maxLength * 0.8) {
                    message = truncated.substring(0, lastSpace) + '...';
                } else {
                    message = truncated + '...';
                }
                console.log(`Message truncated to ${message.length} characters`);
            }
            
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
