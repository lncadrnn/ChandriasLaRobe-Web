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
        
        // Make instance globally available for mobile fixes
        window.chatbotInstance = chatbotInstance;
        
        // Load mobile fix for touch handling
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            import('./chatbot-mobile-fix.js').catch(err => {
                console.log('Mobile fix not available:', err.message);
            });
        }
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
