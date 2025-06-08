// Chatbot main module
class ChandriasChatbot {    constructor() {
        this.chatHistory = [];
        this.isMinimized = false;
        this.initialized = false;
        this.faqSuggestions = [
            "How do I rent a gown?",
            "What are your rental policies?",
            "How much is the rental fee?",
            "What are your store hours?",
            "Do you offer alterations?",
            "How do I book a fitting?",
            "What are your available categories?",
            "How does the payment work?"
        ];

        // Keywords and responses mapping
        this.keywordResponses = {
            'booking_process': {
                keywords: ['how', 'book', 'appointment', 'schedule', 'booking', 'fitting'],
                response: "To book a fitting appointment, you can:\n1. Browse our collection first\n2. Click 'Book Appointment' on any item\n3. Select your preferred date and time\n4. Fill out the booking form\n\nOr visit our physical store at B42 L13 Bilbao Street, Hacienda La Joya Subdivision, Imus, Cavite."
            },            'rental_info': {
                keywords: ['how', 'rent', 'rental', 'price', 'cost', 'fee', 'much'],
                response: "Our rental fees vary depending on the item and duration. Generally:\n- Gowns: ₱2,000 - ₱8,000\n- Suits: ₱1,500 - ₱5,000\n- Accessories: ₱500 - ₱2,000\n\nAll rentals include:\n- Free fitting sessions\n- Basic alterations\n- Professional cleaning\n- Garment bag\n\nTo rent an item:\n1. Browse our collection online or in-store\n2. Book a fitting appointment\n3. Choose your rental duration\n4. Pay the rental fee and security deposit"
            },
            'hours': {
                keywords: ['hours', 'time', 'schedule', 'open'],
                response: "We are open:\nMonday - Sunday: 8:00 AM - 9:00 PM\nFitting appointments are recommended to ensure the best service."
            },
            'location': {
                keywords: ['location', 'address', 'where', 'store'],
                response: "We are located at:\nB42 L13 Bilbao Street\nHacienda La Joya Subdivision\nImus, Cavite, Philippines"
            },            'fitting_info': {
                keywords: ['fitting', 'fit', 'measurement', 'try', 'alterations', 'adjust'],
                response: "Our Fitting Services:\n- FREE fitting for up to 3 items per appointment\n- Basic alterations included in rental\n- Professional measurement service\n- Style consultation available\n- Additional fittings: ₱100 per item\n\nOur experienced staff will help you find the perfect fit and style!"
            },
            'payment_info': {
                keywords: ['payment', 'pay', 'deposit', 'refund', 'how', 'money'],
                response: "Payment Information:\n\nPayment Methods:\n- Cash\n- Credit/Debit Cards\n- Bank Transfer\n- GCash\n\nRental Process:\n1. Pay the rental fee\n2. Security deposit required (refundable)\n3. Present valid ID\n4. Sign rental agreement\n\nRefund Policy:\n- Security deposit returned upon item return\n- Must be in original condition\n- Damage may result in deposit deduction"
            },
            'categories': {
                keywords: ['categories', 'collection', 'types', 'what', 'available', 'offer'],
                response: "Our Collections:\n\n1. Ball Gowns\n- Elegant evening wear\n- Perfect for formal events\n\n2. Long Gowns\n- Sophisticated styles\n- Various designs available\n\n3. Wedding Gowns\n- Bridal perfection\n- Classic & modern styles\n\n4. Fairy Gowns\n- Whimsical designs\n- Perfect for themed events\n\n5. Suits\n- Professional attire\n- Modern & classic cuts\n\n6. Accessories\n- Complete your look\n- Jewelry, veils, etc."
            },
            'policies': {
                keywords: ['policy', 'policies', 'rules', 'requirements', 'terms'],
                response: "Our Rental Policies:\n\n1. Rental Duration:\n- Standard: 24 hours\n- Extended rental available\n\n2. Requirements:\n- Valid ID\n- Security deposit\n- Signed rental agreement\n\n3. Care Instructions:\n- Handle with care\n- Do not wash items\n- Report any issues immediately\n\n4. Late Returns:\n- Additional fees apply\n- Contact us if delayed\n\n5. Damage Policy:\n- Inspect items before rental\n- Report pre-existing damage\n- Customer responsible for new damage"
            }
        };
    }    initialize() {
        if (this.initialized) return;
        
        this.createChatbotHTML();
        this.loadChatHistory();
        this.attachEventListeners();
        
        // Add drag functionality to the bubble
        setTimeout(() => {
            this.makeChatbotBubbleDraggable();
        }, 100); // Small delay to ensure DOM is ready
        
        this.initialized = true;
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chandrias-chatbot" id="chandriasChatbot">
                <div class="chatbot-header">                <div class="chatbot-header-info">
                        <img src="/chandriahomepage/assets/img/icon-chatbot-img.png" alt="Chatbot Avatar" class="chatbot-avatar">
                        <div class="chatbot-title">
                            <h3>Chandria's Chatbot</h3>
                            <p>typically replies within a minute</p>
                        </div>
                    </div>
                    <div class="chatbot-controls">
                        <button class="minimize-btn" id="minimizeChatbot">−</button>
                        <button class="close-btn" id="closeChatbot">×</button>
                    </div>
                </div>
                <div class="chatbot-body">
                    <div class="chatbot-messages" id="chatbotMessages">
                        <div class="message bot-message">
                            <p>👋 Hi! Welcome to Chandria's LaRobe. How can I help you today?</p>
                            <span class="timestamp">${this.getTimestamp()}</span>
                        </div>
                    </div>
                    <div class="faq-suggestions" id="faqSuggestions">
                        ${this.renderFAQSuggestions()}
                    </div>
                </div>                <div class="chatbot-input">
                    <input type="text" id="chatbotInput" placeholder="Type your message...">
                    <button id="sendMessage">
                        <img src="/chandriahomepage/assets/img/icon-chatsend.svg" alt="Send" class="send-icon">
                    </button>
                </div>            </div>
            <div class="chatbot-bubble hidden" id="chatbotBubble">
                <img src="/chandriahomepage/assets/img/icon-chatbot-img.png" alt="Chatbot">
            </div>
        `;

        const chatbotContainer = document.createElement('div');
        chatbotContainer.innerHTML = chatbotHTML;
        document.body.appendChild(chatbotContainer);
    }    attachEventListeners() {
        const chatbot = document.getElementById('chandriasChatbot');
        const chatbotBubble = document.getElementById('chatbotBubble');
        const input = document.getElementById('chatbotInput');
        const sendBtn = document.getElementById('sendMessage');
        const minimizeBtn = document.getElementById('minimizeChatbot');
        const closeBtn = document.getElementById('closeChatbot');

        sendBtn.addEventListener('click', () => this.handleSendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        minimizeBtn.addEventListener('click', () => this.minimizeChatbot());
        closeBtn.addEventListener('click', () => this.closeChatbot());
        
        // Store reference to the maximize function for the draggable functionality
        this.maximizeChatbotHandler = () => this.maximizeChatbot();
        chatbotBubble.addEventListener('click', this.maximizeChatbotHandler);

        // FAQ suggestion clicks
        document.getElementById('faqSuggestions').addEventListener('click', (e) => {
            if (e.target.classList.contains('faq-suggestion')) {
                const question = e.target.textContent;
                document.getElementById('chatbotInput').value = question;
                this.handleSendMessage();
            }
        });
    }

    handleSendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (message) {
            this.addMessage(message, 'user');
            input.value = '';
            this.processMessage(message);
        }
    }

    processMessage(message) {
        const response = this.generateResponse(message.toLowerCase());
        setTimeout(() => {
            this.addMessage(response, 'bot');
            this.updateFAQSuggestions();
        }, 500);
    }    generateResponse(message) {
        const messageLower = message.toLowerCase();
        const words = messageLower.split(/\s+/);
        
        // Score each response category based on keyword matches
        const scores = {};
        for (const category in this.keywordResponses) {
            const { keywords } = this.keywordResponses[category];
            scores[category] = keywords.reduce((score, keyword) => {
                // Check for exact word matches
                if (words.includes(keyword)) {
                    score += 2;
                }
                // Check for partial matches within the message
                else if (messageLower.includes(keyword)) {
                    score += 1;
                }
                return score;
            }, 0);
        }

        // Find the category with the highest score
        const bestMatch = Object.entries(scores)
            .reduce((best, [category, score]) => {
                return score > best.score ? { category, score } : best;
            }, { category: null, score: 0 });

        // If we have a good match (score > 1), return that response
        if (bestMatch.score > 1) {
            return this.keywordResponses[bestMatch.category].response;
        }
        
        // If we don't understand the question, provide a helpful response
        return "I'm not sure I understand your question completely. You can:\n\n" +
               "1. Try rephrasing your question\n" +
               "2. Use specific keywords like 'rent', 'book', 'price', etc.\n" +
               "3. Check our FAQ suggestions below\n\n" +
               "Or call us at +63 000 000 000 for direct assistance!";
    }

    addMessage(message, sender) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('p');
        messageContent.textContent = message;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = this.getTimestamp();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        messagesContainer.appendChild(messageDiv);
        
        // Save to chat history
        this.chatHistory.push({
            message,
            sender,
            timestamp: new Date().toISOString()
        });
        this.saveChatHistory();
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getTimestamp() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    renderFAQSuggestions() {
        return this.faqSuggestions
            .map(faq => `<button class="faq-suggestion">${faq}</button>`)
            .join('');
    }

    updateFAQSuggestions() {
        const faqContainer = document.getElementById('faqSuggestions');
        faqContainer.innerHTML = this.renderFAQSuggestions();
    }

    minimizeChatbot() {
        const chatbot = document.getElementById('chandriasChatbot');
        const bubble = document.getElementById('chatbotBubble');
        
        chatbot.classList.add('hidden');
        bubble.classList.remove('hidden');
        this.isMinimized = true;
    }

    maximizeChatbot() {
        const chatbot = document.getElementById('chandriasChatbot');
        const bubble = document.getElementById('chatbotBubble');
        
        chatbot.classList.remove('hidden');
        bubble.classList.add('hidden');
        this.isMinimized = false;
    }

    closeChatbot() {
        this.minimizeChatbot();
    }

    makeChatbotBubbleDraggable() {
        const bubble = document.getElementById('chatbotBubble');
        if (!bubble) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;
        let currentX = 0, currentY = 0;

        // Add draggable class
        bubble.classList.add('draggable');

        // Mouse events
        bubble.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Touch events for mobile
        bubble.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            e.preventDefault();
            
            // Get initial positions
            const event = e.type.includes('touch') ? e.touches[0] : e;
            startX = event.clientX;
            startY = event.clientY;

            // Get current bubble position
            const rect = bubble.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            isDragging = true;
            bubble.classList.add('dragging');
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            const event = e.type.includes('touch') ? e.touches[0] : e;
            currentX = event.clientX - startX;
            currentY = event.clientY - startY;

            // Calculate new position
            let newX = initialX + currentX;
            let newY = initialY + currentY;

            // Keep bubble within viewport bounds
            const bubbleSize = bubble.offsetWidth;
            const margin = 10; // Minimum distance from viewport edge

            newX = Math.max(margin, Math.min(window.innerWidth - bubbleSize - margin, newX));
            newY = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, newY));

            // Apply new position
            bubble.style.position = 'fixed';
            bubble.style.left = newX + 'px';
            bubble.style.top = newY + 'px';
            bubble.style.right = 'auto';
            bubble.style.bottom = 'auto';
        }

        function dragEnd(e) {
            if (!isDragging) return;
            
            isDragging = false;
            bubble.classList.remove('dragging');

            // Optional: Snap to edges for better UX
            snapToEdges();
        }

        function snapToEdges() {
            const rect = bubble.getBoundingClientRect();
            const bubbleSize = bubble.offsetWidth;
            const margin = 20;
            
            let newX = rect.left;
            let newY = rect.top;

            // Snap to nearest vertical edge if close enough
            if (rect.left < window.innerWidth / 2) {
                // Snap to left edge
                if (rect.left < 100) {
                    newX = margin;
                }
            } else {
                // Snap to right edge
                if (rect.right > window.innerWidth - 100) {
                    newX = window.innerWidth - bubbleSize - margin;
                }
            }

            // Ensure it stays within vertical bounds
            newY = Math.max(margin, Math.min(window.innerHeight - bubbleSize - margin, newY));

            // Animate to final position
            bubble.style.transition = 'all 0.3s ease';
            bubble.style.left = newX + 'px';
            bubble.style.top = newY + 'px';

            // Remove transition after animation completes
            setTimeout(() => {
                bubble.style.transition = '';
            }, 300);
        }        // Replace the existing click handler with one that handles dragging
        bubble.removeEventListener('click', this.maximizeChatbotHandler);
        bubble.addEventListener('click', (e) => {
            // If the user dragged more than 5px, don't trigger chat opening
            if (Math.abs(currentX) > 5 || Math.abs(currentY) > 5) {
                e.preventDefault();
                e.stopPropagation();
                currentX = 0;
                currentY = 0;
                return;
            }
            // Otherwise, trigger the maximize function
            this.maximizeChatbot();
        });}

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('chandria-chatbot-history');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.log('No previous chat history found');
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('chandria-chatbot-history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.log('Could not save chat history');
        }
    }

    // ...existing code...
}

// Export the chatbot class
export default ChandriasChatbot;
