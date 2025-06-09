// Mobile-specific fixes for chatbot functionality

// Enhanced mobile touch event handling
function enhancedMobileTouchHandling() {
    const bubble = document.getElementById('chatbotBubble');
    if (!bubble) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;
    let currentX = 0, currentY = 0;
    let dragThreshold = 10; // Minimum movement to consider as drag
    let touchStartTime = 0;
    let touchTimeout = null;
    let hasMoved = false;

    // Get chatbot instance
    const chatbotInstance = window.chatbotInstance || getChatbotInstance?.();

    // Remove existing event listeners to avoid conflicts
    bubble.removeEventListener('touchstart', bubble._originalTouchStart);
    bubble.removeEventListener('click', bubble._originalClick);

    // Enhanced touch start handler
    function handleTouchStart(e) {
        e.preventDefault();
        
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }

        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        touchStartTime = Date.now();
        
        const rect = bubble.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        currentX = 0;
        currentY = 0;
        hasMoved = false;
        
        // Set a timeout to determine if this is a drag or tap
        touchTimeout = setTimeout(() => {
            if (!hasMoved) {
                // If no movement after 200ms, consider it a potential tap
                isDragging = false;
            }
        }, 200);
    }

    // Enhanced touch move handler
    function handleTouchMove(e) {
        if (e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        currentX = touch.clientX - startX;
        currentY = touch.clientY - startY;
        
        const distance = Math.sqrt(currentX * currentX + currentY * currentY);
        
        if (distance > dragThreshold && !isDragging) {
            // Movement exceeds threshold, start dragging
            isDragging = true;
            hasMoved = true;
            bubble.classList.add('dragging');
            
            if (touchTimeout) {
                clearTimeout(touchTimeout);
                touchTimeout = null;
            }
        }

        if (isDragging) {
            // Calculate new position
            let newX = initialX + currentX;
            let newY = initialY + currentY;

            const bubbleSize = bubble.offsetWidth;
            const margin = 10;

            // Constrain to viewport bounds
            newX = Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, newX));
            newY = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, newY));

            // Apply new position
            bubble.style.position = 'fixed';
            bubble.style.left = newX + 'px';
            bubble.style.top = newY + 'px';
            bubble.style.right = 'auto';
            bubble.style.bottom = 'auto';
            
            // Update speech bubble position
            if (chatbotInstance && chatbotInstance.updateSpeechBubblePosition) {
                chatbotInstance.updateSpeechBubblePosition();
            }
        }
    }

    // Enhanced touch end handler
    function handleTouchEnd(e) {
        e.preventDefault();
        
        if (touchTimeout) {
            clearTimeout(touchTimeout);
            touchTimeout = null;
        }

        const touchDuration = Date.now() - touchStartTime;
        const distance = Math.sqrt(currentX * currentX + currentY * currentY);

        if (isDragging) {
            // End dragging
            isDragging = false;
            bubble.classList.remove('dragging');

            // Save position
            const rect = bubble.getBoundingClientRect();
            if (window.ChatbotPersistence) {
                window.ChatbotPersistence.savePosition(rect.left, rect.top);
            }

            // Snap to edges
            snapToEdges();
        } else if (!hasMoved && distance < dragThreshold && touchDuration < 500) {
            // This was a tap - open chatbot
            if (chatbotInstance && chatbotInstance.maximizeChatbot) {
                setTimeout(() => {
                    chatbotInstance.maximizeChatbot();
                }, 50); // Small delay to ensure touch events are processed
            }
        }

        // Reset tracking variables
        currentX = 0;
        currentY = 0;
        hasMoved = false;
    }

    // Snap to edges function
    function snapToEdges() {
        const rect = bubble.getBoundingClientRect();
        const bubbleSize = bubble.offsetWidth;
        const margin = 20;
        
        let newX = rect.left;
        let newY = rect.top;

        // Calculate distances to each edge
        const distanceToLeft = rect.left;
        const distanceToRight = window.innerWidth - rect.right;
        const distanceToTop = rect.top;
        const distanceToBottom = window.innerHeight - rect.bottom;

        // Find the closest edge
        const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

        // Snap to the closest edge
        if (minDistance === distanceToLeft) {
            newX = margin;
        } else if (minDistance === distanceToRight) {
            newX = window.innerWidth - bubbleSize - margin;
        } else if (minDistance === distanceToTop) {
            newY = margin;
        } else {
            newY = window.innerHeight - bubbleSize - margin;
        }

        // Ensure bounds
        newX = Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, newX));
        newY = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, newY));

        // Animate to final position
        bubble.style.transition = 'all 0.3s ease';
        bubble.style.left = newX + 'px';
        bubble.style.top = newY + 'px';

        // Save final position and update speech bubble
        setTimeout(() => {
            if (window.ChatbotPersistence) {
                window.ChatbotPersistence.savePosition(newX, newY);
            }
            if (chatbotInstance && chatbotInstance.updateSpeechBubblePosition) {
                chatbotInstance.updateSpeechBubblePosition();
            }
        }, 300);

        // Remove transition
        setTimeout(() => {
            bubble.style.transition = '';
        }, 300);
    }

    // Add enhanced event listeners
    bubble.addEventListener('touchstart', handleTouchStart, { passive: false });
    bubble.addEventListener('touchmove', handleTouchMove, { passive: false });
    bubble.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Store references for potential cleanup
    bubble._enhancedTouchStart = handleTouchStart;
    bubble._enhancedTouchMove = handleTouchMove;
    bubble._enhancedTouchEnd = handleTouchEnd;

    console.log('Enhanced mobile touch handling initialized');
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
