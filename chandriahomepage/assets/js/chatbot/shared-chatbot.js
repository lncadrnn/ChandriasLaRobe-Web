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
    // Save chatbot position to localStorage
    savePosition(x, y) {
        try {
            const position = { x, y, timestamp: Date.now() };
            localStorage.setItem('chandria-chatbot-position', JSON.stringify(position));
        } catch (error) {
            console.log('Could not save chatbot position');
        }
    },

    // Load chatbot position from localStorage
    loadPosition() {
        try {
            const saved = localStorage.getItem('chandria-chatbot-position');
            if (saved) {
                const position = JSON.parse(saved);
                // Return position if it was saved within the last 24 hours
                if (Date.now() - position.timestamp < 24 * 60 * 60 * 1000) {
                    return { x: position.x, y: position.y };
                }
            }
        } catch (error) {
            console.log('Could not load chatbot position');
        }
        return null;
    },

    // Save chatbot state (open/closed)
    saveState(isMinimized) {
        try {
            const state = { isMinimized, timestamp: Date.now() };
            localStorage.setItem('chandria-chatbot-state', JSON.stringify(state));
        } catch (error) {
            console.log('Could not save chatbot state');
        }
    },

    // Load chatbot state - always return minimized for new page loads
    loadState() {
        // Always start minimized when navigating to a new page
        return { isMinimized: true };
    },

    // Apply saved position to chatbot bubble
    applyPosition() {
        const bubble = document.getElementById('chatbotBubble');
        if (!bubble) return;

        const savedPosition = this.loadPosition();
        if (savedPosition) {
            const bubbleSize = bubble.offsetWidth || 60;
            const margin = 20;
            
            // Ensure position is within current viewport bounds
            let x = Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, savedPosition.x));
            let y = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, savedPosition.y));
            
            bubble.style.position = 'fixed';
            bubble.style.left = x + 'px';
            bubble.style.top = y + 'px';
            bubble.style.right = 'auto';
            bubble.style.bottom = 'auto';
        }
    },    // Initialize persistence for a chatbot instance
    initializePersistence(chatbotInstance) {
        if (!chatbotInstance) return;

        // Apply saved position and ensure minimized state after a short delay
        setTimeout(() => {
            this.applyPosition();
            
            // Ensure chatbot starts minimized on every page load
            const chatbot = document.getElementById('chandriasChatbot');
            const bubble = document.getElementById('chatbotBubble');
            
            if (chatbot && bubble) {
                chatbot.classList.add('hidden');
                bubble.classList.remove('hidden');
                chatbotInstance.isMinimized = true;
            }
        }, 100);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', addChatbotToPage);

// Make ChatbotPersistence available globally for the main chatbot class
window.ChatbotPersistence = ChatbotPersistence;
