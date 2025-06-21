// Import modules
import OpenAI from "openai";
import { OPENAI_CONFIG } from './config.js';

export class OpenAIOperations {
    constructor(file_context) {
        this.messages = [{role: "system", content: file_context}];
        this.openai = new OpenAI({
            apiKey: OPENAI_CONFIG.API_KEY,
        });
    }

    check_history_length() {
        console.log(`Conversations in History: ${((this.messages.length / 2) -1)}/${OPENAI_CONFIG.HISTORY_LENGTH}`);
        if(this.messages.length > ((OPENAI_CONFIG.HISTORY_LENGTH * 2) + 1)) {
            console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
            this.messages.splice(1,2);
        }
    }

    async make_openai_call(text) {
        try {
            //Add user message to messages
            this.messages.push({role: "user", content: text});

            //Check if message history is exceeded
            this.check_history_length();

            // Use await to get the response from openai with updated parameters
            const response = await this.openai.chat.completions.create({
                model: OPENAI_CONFIG.MODEL_NAME,
                messages: this.messages,
                temperature: OPENAI_CONFIG.TEMPERATURE,
                max_tokens: OPENAI_CONFIG.MAX_TOKENS,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
            });

            // Check if response has choices
            if (response.choices && response.choices.length > 0) {
                let agent_response = response.choices[0].message.content;
                console.log(`Agent Response: ${agent_response}`);
                this.messages.push({role: "assistant", content: agent_response});
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
            const response = await this.openai.completions.create({
                model: "gpt-4o-2024-08-06",
                prompt: text,
                temperature: OPENAI_CONFIG.TEMPERATURE,
                max_tokens: OPENAI_CONFIG.MAX_TOKENS,
                top_p: OPENAI_CONFIG.TOP_P,
                frequency_penalty: OPENAI_CONFIG.FREQUENCY_PENALTY,
                presence_penalty: OPENAI_CONFIG.PRESENCE_PENALTY,
            });

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
