// Mobile-specific fixes for chatbot functionality - No dragging, fixed position

// Simple mobile touch event handling - only for tap detection
function enhancedMobileTouchHandling() {
    const bubble = document.getElementById('chatbotBubble');
    if (!bubble) return;

    let touchStartTime = 0;
    let touchTimeout = null;

    // Get chatbot instance
    const chatbotInstance = window.chatbotInstance || getChatbotInstance?.();

    // Remove existing event listeners to avoid conflicts
    bubble.removeEventListener('touchstart', bubble._originalTouchStart);
    bubble.removeEventListener('click', bubble._originalClick);

    // Simple touch start handler - no dragging
    function handleTouchStart(e) {
        e.preventDefault();
        
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }

        touchStartTime = Date.now();
    }

    // Simple touch end handler - only handle taps
    function handleTouchEnd(e) {
        e.preventDefault();
        
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }

        const touchDuration = Date.now() - touchStartTime;
        
        // Only trigger if it's a quick tap (less than 500ms)
        if (touchDuration < 500) {
            // Trigger chatbot open
            if (chatbotInstance && typeof chatbotInstance.maximizeChatbot === 'function') {
                setTimeout(() => {
                    chatbotInstance.maximizeChatbot();
                }, 50); // Small delay to ensure touch events are processed
            }
        }
    }

    // Add simple touch event listeners - no move handler since no dragging
    bubble.addEventListener('touchstart', handleTouchStart, { passive: false });
    bubble.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Store references for potential cleanup
    bubble._enhancedTouchStart = handleTouchStart;
    bubble._enhancedTouchEnd = handleTouchEnd;

    console.log('Enhanced mobile touch handling initialized (fixed position)');
}

// Initialize mobile enhancements when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(enhancedMobileTouchHandling, 500);
    });
} else {
    setTimeout(enhancedMobileTouchHandling, 500);
}

// Export for manual initialization if needed
window.enhancedMobileTouchHandling = enhancedMobileTouchHandling;
