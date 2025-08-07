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

            // Prepare parameters with correct token parameter based on model
            const params = {
                model: OPENAI_CONFIG.MODEL_NAME,
                messages: this.messages,
                temperature: OPENAI_CONFIG.TEMPERATURE,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
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
            // Prepare parameters with correct token parameter based on model
            const params = {
                model: "gpt-4o-2024-08-06",
                prompt: text,
                temperature: OPENAI_CONFIG.TEMPERATURE,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
            };

            // Use correct token parameter based on model
            if (this.usesMaxCompletionTokens("gpt-4o-2024-08-06")) {
                params.max_completion_tokens = OPENAI_CONFIG.MAX_TOKENS;
            } else {
                params.max_tokens = OPENAI_CONFIG.MAX_TOKENS;
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
