// Import modules
import OpenAI from "openai";
import { OPENAI_CONFIG } from './config.js';

export class OpenAIOperations {
    constructor(file_context) {
        this.messages = [{ role: "system", content: file_context }];
        this.openai = new OpenAI({
            apiKey: OPENAI_CONFIG.API_KEY,
        });
    }

    // Helper method to detect model type and configure parameters
    getModelConfig(model) {
        const modelLower = model.toLowerCase();
        
        // GPT-5 reasoning models (like o1)
        const reasoningModels = [
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano',
            'o1',
            'o1-mini',
            'o1-preview',
            'o3',
            'o3-mini'
        ];
        
        // GPT-5 chat models (non-reasoning)
        const chatModels = [
            'gpt-5-chat-latest',
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo'
        ];
        
        // Legacy models that use max_tokens
        const legacyModels = [
            'gpt-3.5-turbo',
            'gpt-4-0613',
            'gpt-4-0314',
            'gpt-4-32k',
            'text-davinci'
        ];
        
        // Check model type
        const isReasoning = reasoningModels.some(rm => modelLower.includes(rm));
        const isChat = chatModels.some(cm => modelLower.includes(cm));
        const isLegacy = legacyModels.some(lm => modelLower.includes(lm));
        
        return {
            isReasoning,
            isChat,
            isLegacy,
            useMaxCompletionTokens: isReasoning || isChat,
            supportsTemperature: !isReasoning,
            supportsAdvancedParams: !isReasoning
        };
    }

    check_history_length() {
        console.log(`Conversations in History: ${((this.messages.length / 2) - 1)}/${OPENAI_CONFIG.HISTORY_LENGTH}`);
        if (this.messages.length > ((OPENAI_CONFIG.HISTORY_LENGTH * 2) + 1)) {
            console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
            this.messages.splice(1, 2);
        }
    }

    async make_openai_call(text) {
        try {
            //Add user message to messages
            this.messages.push({ role: "user", content: text });

            //Check if message history is exceeded
            this.check_history_length();

            // Get model configuration
            const modelConfig = this.getModelConfig(OPENAI_CONFIG.MODEL_NAME);
            console.log(`Using model: ${OPENAI_CONFIG.MODEL_NAME}`);
            console.log(`Model type: ${modelConfig.isReasoning ? 'Reasoning' : modelConfig.isChat ? 'Chat' : 'Legacy'}`);

            // Base parameters
            const params = {
                model: OPENAI_CONFIG.MODEL_NAME,
                messages: this.messages
            };

            // Add token limit parameter
            if (modelConfig.useMaxCompletionTokens) {
                params.max_completion_tokens = 150;
                console.log('Using max_completion_tokens parameter');
            } else {
                params.max_tokens = 150;
                console.log('Using max_tokens parameter');
            }

            // Add advanced parameters only for non-reasoning models
            if (modelConfig.supportsAdvancedParams) {
                params.temperature = OPENAI_CONFIG.TEMPERATURE;
                params.top_p = OPENAI_CONFIG.TOP_P;
                params.frequency_penalty = OPENAI_CONFIG.FREQUENCY_PENALTY;
                params.presence_penalty = OPENAI_CONFIG.PRESENCE_PENALTY;
                console.log('Added advanced parameters (temperature, top_p, etc.)');
            } else {
                console.log('Skipped advanced parameters (reasoning model)');
            }

            // Use await to get the response from openai with updated parameters
            const response = await this.openai.chat.completions.create(params);

            // Check if response has choices
            if (response.choices && response.choices.length > 0) {
                let agent_response = response.choices[0].message.content;
                console.log(`Agent Response: ${agent_response}`);
                this.messages.push({ role: "assistant", content: agent_response });
                return agent_response;
            } else {
                // Handle the case when no choices are returned
                throw new Error("No choices returned from openai");
            }
        } catch (error) {
            // Handle any errors that may occur
            console.error('OpenAI API Error:', error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }

    async make_openai_call_completion(text) {
        try {
            // Get model configuration for the completion model
            const completionModel = "gpt-4o-2024-08-06";
            const modelConfig = this.getModelConfig(completionModel);
            console.log(`Using completion model: ${completionModel}`);
            console.log(`Model type: ${modelConfig.isReasoning ? 'Reasoning' : modelConfig.isChat ? 'Chat' : 'Legacy'}`);

            // Base parameters
            const params = {
                model: completionModel,
                prompt: text
            };

            // Add token limit parameter
            if (modelConfig.useMaxCompletionTokens) {
                params.max_completion_tokens = 150;
                console.log('Using max_completion_tokens parameter');
            } else {
                params.max_tokens = 150;
                console.log('Using max_tokens parameter');
            }

            // Add advanced parameters only for non-reasoning models
            if (modelConfig.supportsAdvancedParams) {
                params.temperature = OPENAI_CONFIG.TEMPERATURE;
                params.top_p = OPENAI_CONFIG.TOP_P;
                params.frequency_penalty = OPENAI_CONFIG.FREQUENCY_PENALTY;
                params.presence_penalty = OPENAI_CONFIG.PRESENCE_PENALTY;
                console.log('Added advanced parameters (temperature, top_p, etc.)');
            } else {
                console.log('Skipped advanced parameters (reasoning model)');
            }

            const response = await this.openai.completions.create(params);

            // Check if response has choices
            if (response.choices && response.choices.length > 0) {
                let agent_response = response.choices[0].text;
                console.log(`Agent Response: ${agent_response}`);
                return agent_response;
            } else {
                // Handle the case when no choices are returned
                throw new Error("No choices returned from openai");
            }
        } catch (error) {
            // Handle any errors that may occur
            console.error('OpenAI API Error:', error);
            return "Sorry, something went wrong. Please try again later.";
        }
    }

    // Method to reset conversation history
    resetHistory() {
        this.messages = [this.messages[0]]; // Keep only the system message
        console.log('Conversation history reset');
    }

    // Method to get current conversation length
    getHistoryLength() {
        return this.messages.length;
    }
}
