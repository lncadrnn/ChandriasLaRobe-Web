// Function to add chatbot to pages
export function addChatbotToPage() {
    // Check if chatbot is already added
    if (document.querySelector('.chandrias-chatbot')) return;
    
    // Add CSS link if not present
    if (!document.querySelector('link[href*="chatbot.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/chandriahomepage/assets/css/chatbot.css';
        document.head.appendChild(cssLink);
    }
}

// Chatbot persistence management
export const ChatbotPersistence = {
    // Save chatbot position - disabled for fixed position
    savePosition(x, y) {
        // Position saving disabled - chatbot is fixed in lower right corner
        return;
    },

    // Load chatbot position - disabled for fixed position
    loadPosition() {
        // Position loading disabled - chatbot is fixed in lower right corner
        return null;
    },    // Save chatbot state (open/closed)
    saveState(isMinimized) {
        try {
            const state = { isMinimized, timestamp: Date.now() };
            localStorage.setItem('chandria-chatbot-state', JSON.stringify(state));
        } catch (error) {
            console.log('Could not save chatbot state');
        }
    },

    // Load chatbot state - maintain state across pages
    loadState() {
        try {
            const saved = localStorage.getItem('chandria-chatbot-state');
            if (saved) {
                const state = JSON.parse(saved);
                // Return state if it was saved within the last hour (active session)
                if (Date.now() - state.timestamp < 60 * 60 * 1000) {
                    return { isMinimized: state.isMinimized };
                }
            }
        } catch (error) {
            console.log('Could not load chatbot state');
        }
        // Default to minimized if no recent state found
        return { isMinimized: true };
    },    // Clear any saved position data to ensure fixed position
    clearSavedPosition() {
        try {
            localStorage.removeItem('chandria-chatbot-position');
        } catch (error) {
            console.log('Could not clear saved position');
        }
    },

    // Apply fixed position to chatbot bubble - always lower right corner
    applyPosition() {
        const bubble = document.getElementById('chatbotBubble');
        if (!bubble) return;

        // Always position in lower right corner
        const bubbleSize = bubble.offsetWidth || 60;
        const margin = 20;
        
        bubble.style.position = 'fixed';
        bubble.style.right = margin + 'px';
        bubble.style.bottom = margin + 'px';
        bubble.style.left = 'auto';
        bubble.style.top = 'auto';
    },    // Initialize persistence for a chatbot instance
    initializePersistence(chatbotInstance) {
        if (!chatbotInstance) return;

        // Clear any saved position data to ensure fixed position
        this.clearSavedPosition();

        // Apply fixed position and restore state after a short delay
        setTimeout(() => {
            this.applyPosition();
              // Load and apply saved state
            const savedState = this.loadState();
            const chatbot = document.getElementById('chandriasChatbot');
            const bubble = document.getElementById('chatbotBubble');
            
            if (chatbot && bubble) {
                if (savedState.isMinimized) {
                    chatbot.classList.add('hidden');
                    bubble.classList.remove('hidden');
                } else {
                    chatbot.classList.remove('hidden');
                    bubble.classList.add('hidden');
                }
                chatbotInstance.isMinimized = savedState.isMinimized;
            }
        }, 100);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', addChatbotToPage);

// Make ChatbotPersistence available globally for the main chatbot class
window.ChatbotPersistence = ChatbotPersistence;
