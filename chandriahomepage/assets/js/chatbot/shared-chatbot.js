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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', addChatbotToPage);
