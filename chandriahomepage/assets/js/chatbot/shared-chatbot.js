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
    },    // Apply saved position to chatbot bubble - restrict to edges only
    applyPosition() {
        const bubble = document.getElementById('chatbotBubble');
        if (!bubble) return;

        const savedPosition = this.loadPosition();
        if (savedPosition) {
            const bubbleSize = bubble.offsetWidth || 60;
            const margin = 20;
            
            let x = savedPosition.x;
            let y = savedPosition.y;
            
            // Ensure position is within current viewport bounds
            x = Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, x));
            y = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, y));
            
            // Determine which edge this position is closest to and snap to it
            const distanceToLeft = x;
            const distanceToRight = window.innerWidth - x - bubbleSize;
            const distanceToTop = y;
            const distanceToBottom = window.innerHeight - y - bubbleSize;
            
            const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
            
            // Snap to the closest edge
            if (minDistance === distanceToLeft) {
                x = margin; // Left edge
            } else if (minDistance === distanceToRight) {
                x = window.innerWidth - bubbleSize - margin; // Right edge
            } else if (minDistance === distanceToTop) {
                y = margin; // Top edge
            } else {
                y = window.innerHeight - bubbleSize - margin; // Bottom edge
            }
            
            bubble.style.position = 'fixed';
            bubble.style.left = x + 'px';
            bubble.style.top = y + 'px';
            bubble.style.right = 'auto';
            bubble.style.bottom = 'auto';
        } else {
            // Default position: right edge, middle of screen
            const bubbleSize = bubble.offsetWidth || 60;
            const margin = 20;
            bubble.style.position = 'fixed';
            bubble.style.left = (window.innerWidth - bubbleSize - margin) + 'px';
            bubble.style.top = (window.innerHeight / 2 - bubbleSize / 2) + 'px';
            bubble.style.right = 'auto';
            bubble.style.bottom = 'auto';
        }
    },// Initialize persistence for a chatbot instance
    initializePersistence(chatbotInstance) {
        if (!chatbotInstance) return;

        // Apply saved position and restore state after a short delay
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
