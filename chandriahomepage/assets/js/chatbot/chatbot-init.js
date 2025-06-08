// Initialize the chatbot
import ChandriasChatbot from './chatbot.js';
import { ChatbotPersistence } from './shared-chatbot.js';

// Create singleton instance
let chatbotInstance = null;

export function initializeChatbot() {
    if (!chatbotInstance) {
        chatbotInstance = new ChandriasChatbot();
        chatbotInstance.initialize();
        
        // Initialize persistence functionality
        ChatbotPersistence.initializePersistence(chatbotInstance);
    }
    return chatbotInstance;
}

export function getChatbotInstance() {
    return chatbotInstance;
}

// Auto-initialize when this module is imported
document.addEventListener('DOMContentLoaded', () => {
    initializeChatbot();
});
