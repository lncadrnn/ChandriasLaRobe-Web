// Chatbot main module
class ChandriasChatbot {    constructor() {
        this.chatHistory = [];
        this.isMinimized = false;
        this.initialized = false;        this.faqSuggestions = [
            "What are your store hours?",
            "How much does it cost to rent a gown?",
            "How do I book a fitting appointment?",
            "Where is your store located?",
            "What types of gowns do you offer?",
            "What payment methods do you accept?",
            "Do you offer alterations?",
            "What's your contact number?"
        ];// Enhanced keywords and responses mapping with better specificity
        this.keywordResponses = {            'booking_process': {
                keywords: ['book', 'appointment', 'schedule', 'reserve', 'fitting', 'book appointment', 'schedule fitting', 'make appointment'],
                phrases: ['how to book', 'how do i book', 'book a fitting', 'schedule an appointment', 'make a reservation'],
                priority: ['book appointment', 'schedule fitting', 'book fitting'],
                response: "📅 How to Book a Fitting Appointment:\n\n1️⃣ Browse our collection first\n2️⃣ Click 'Book Appointment' on any item\n3️⃣ Select your preferred date and time\n4️⃣ Fill out the booking form\n\n🏪 Or visit our store directly:\nB42 L13 Bilbao Street\nHacienda La Joya Subdivision\nImus, Cavite\n\n⏰ Store Hours: Mon-Sun, 8:00 AM - 9:00 PM"
            },'rental_info': {
                keywords: ['rent', 'rental', 'price', 'cost', 'fee', 'expensive', 'cheap', 'rate', 'pricing'],
                phrases: ['how much', 'rental fee', 'rental cost', 'rental price', 'how to rent', 'rent a gown', 'how do i rent'],
                priority: ['how to rent', 'rental fee', 'rental cost', 'rental price', 'how much'],
                response: "Here's how to rent from us:\n\n🔍 Step 1: Browse our collection online or visit our store\n📅 Step 2: Book a fitting appointment\n✨ Step 3: Try on items during your fitting\n💰 Step 4: Pay rental fee + security deposit\n📋 Step 5: Sign rental agreement\n🎉 Step 6: Take your items!\n\n💵 Rental Fees:\n• Gowns: ₱2,000 - ₱8,000\n• Suits: ₱1,500 - ₱5,000\n• Accessories: ₱500 - ₱2,000\n\n✅ Included: Free fitting for up to 3 products"
            },
            'hours': {
                keywords: ['hours', 'time', 'open', 'close', 'operating', 'business hours', 'schedule'],
                phrases: ['what time', 'store hours', 'opening hours', 'business hours', 'when open', 'when close'],
                priority: ['store hours', 'opening hours', 'business hours', 'what time'],
                excludeWords: ['book', 'appointment', 'fitting'],
                response: "We are open:\nMonday - Sunday: 8:00 AM - 9:00 PM\nFitting appointments are recommended to ensure the best service."
            },
            'location': {
                keywords: ['location', 'address', 'where', 'store', 'shop', 'find', 'directions'],
                phrases: ['where located', 'store location', 'your address', 'find store', 'where are you'],
                priority: ['store location', 'your address', 'where located'],
                response: "We are located at:\nB42 L13 Bilbao Street\nHacienda La Joya Subdivision\nImus, Cavite, Philippines"
            },
            'fitting_info': {
                keywords: ['fitting', 'fit', 'measurement', 'try', 'alterations', 'adjust', 'size', 'tailor'],
                phrases: ['fitting service', 'how does fitting work', 'fitting appointment', 'try on'],
                priority: ['fitting service', 'fitting appointment'],
                response: "Our Fitting Services:\n- FREE fitting for up to 3 items per appointment\n- Basic alterations included in rental\n- Professional measurement service\n- Style consultation available\n- Additional fittings: ₱100 per item\n\nOur experienced staff will help you find the perfect fit and style!"
            },
            'payment_info': {
                keywords: ['payment', 'pay', 'deposit', 'refund', 'money', 'cash', 'card', 'gcash', 'bank'],
                phrases: ['how to pay', 'payment method', 'payment options', 'how does payment work'],
                priority: ['payment method', 'payment options', 'how to pay'],
                response: "Payment Information:\n\nPayment Methods:\n- Cash\n- Credit/Debit Cards\n- Bank Transfer\n- GCash\n\nRental Process:\n1. Pay the rental fee\n2. Security deposit required (refundable)\n3. Present valid ID\n4. Sign rental agreement\n\nRefund Policy:\n- Security deposit returned upon item return\n- Must be in original condition\n- Damage may result in deposit deduction"
            },
            'categories': {
                keywords: ['categories', 'collection', 'types', 'what', 'available', 'offer', 'gown', 'dress', 'suit'],
                phrases: ['what do you offer', 'available categories', 'types of gowns', 'what collections'],
                priority: ['available categories', 'what do you offer', 'types of gowns'],
                response: "Our Collections:\n\n1. Ball Gowns\n- Elegant evening wear\n- Perfect for formal events\n\n2. Long Gowns\n- Sophisticated styles\n- Various designs available\n\n3. Wedding Gowns\n- Bridal perfection\n- Classic & modern styles\n\n4. Fairy Gowns\n- Whimsical designs\n- Perfect for themed events\n\n5. Suits\n- Professional attire\n- Modern & classic cuts\n\n6. Accessories\n- Complete your look\n- Jewelry, veils, etc."
            },
            'policies': {
                keywords: ['policy', 'policies', 'rules', 'requirements', 'terms', 'conditions'],
                phrases: ['rental policy', 'rental rules', 'terms and conditions', 'rental requirements'],
                priority: ['rental policy', 'rental rules', 'terms and conditions'],
                response: "Our Rental Policies:\n\n1. Rental Duration:\n- Standard: 24 hours\n- Extended rental available\n\n2. Requirements:\n- Valid ID\n- Security deposit\n- Signed rental agreement\n\n3. Care Instructions:\n- Handle with care\n- Do not wash items\n- Report any issues immediately\n\n4. Late Returns:\n- Additional fees apply\n- Contact us if delayed\n\n5. Damage Policy:\n- Inspect items before rental\n- Report pre-existing damage\n- Customer responsible for new damage"
            },
            'contact_info': {
                keywords: ['contact', 'phone', 'call', 'number', 'reach', 'email'],
                phrases: ['contact number', 'phone number', 'how to contact', 'reach you'],
                priority: ['contact number', 'phone number', 'how to contact'],
                response: "You can contact us:\n\n📞 Phone: +63 000 000 000\n📧 Email: info@chandriaslarobe.com\n📍 Address: B42 L13 Bilbao Street, Hacienda La Joya Subdivision, Imus, Cavite\n\n🕐 Business Hours: Monday - Sunday, 8:00 AM - 9:00 PM\n\nFeel free to call, email, or visit us in person!"
            }
        };
    }    initialize() {
        if (this.initialized) return;
        
        console.log('Initializing chatbot...');
        
        this.createChatbotHTML();
        this.loadChatHistory();
        this.restoreMessagesToUI();
        this.attachEventListeners();
        
        // Chatbot is fixed in lower right corner - no dragging functionality needed
        
        this.initialized = true;
        console.log('Chatbot initialization complete');
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chandrias-chatbot" id="chandriasChatbot">
                <div class="chatbot-header">                <div class="chatbot-header-info">
                        <img src="/chandriahomepage/assets/img/icon-chatbot-img.png" alt="Chatbot Avatar" class="chatbot-avatar">
                        <div class="chatbot-title">
                            <h3>Chandria's Chatbot</h3>
                        </div>
                    </div>
                    <div class="chatbot-controls">
                        <button class="minimize-btn" id="minimizeChatbot">−</button>
                        <button class="close-btn" id="closeChatbot">×</button>
                    </div>
                </div>
                <div class="chatbot-body">                <div class="chatbot-messages" id="chatbotMessages">
                        <div class="message bot-message">
                            <p>Hello! I am Chandria's Personal Chatbot, feel free to ask if you have questions!</p>
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
        const closeBtn = document.getElementById('closeChatbot');
        const minimizeBtn = document.getElementById('minimizeChatbot');

        sendBtn.addEventListener('click', () => this.handleSendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        closeBtn.addEventListener('click', () => this.closeChatbot());
        minimizeBtn.addEventListener('click', () => this.minimizeChatbot());
        
        // Store reference to the maximize function
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
        
        // Enhanced scoring system with phrase matching and context understanding
        const scores = {};
        const questionType = this.detectQuestionType(messageLower);
        
        // Initialize scores for all categories
        for (const category in this.keywordResponses) {
            scores[category] = 0;
        }
        
        // Score each response category
        for (const category in this.keywordResponses) {
            const { keywords, phrases, priority, excludeWords } = this.keywordResponses[category];
            
            // Check for exclusion words first
            if (excludeWords && excludeWords.some(word => messageLower.includes(word))) {
                scores[category] -= 2; // Penalize if exclusion words are found
            }
            
            // High priority phrase matching (most important)
            if (phrases) {
                phrases.forEach(phrase => {
                    if (messageLower.includes(phrase)) {
                        scores[category] += 5; // High score for phrase matches
                        if (priority && priority.includes(phrase)) {
                            scores[category] += 3; // Extra bonus for priority phrases
                        }
                    }
                });
            }
            
            // Priority keyword matching
            if (priority) {
                priority.forEach(priorityWord => {
                    if (messageLower.includes(priorityWord)) {
                        scores[category] += 4; // High score for priority keywords
                    }
                });
            }
            
            // Regular keyword matching
            keywords.forEach(keyword => {
                // Exact word boundary matches (higher score)
                const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (wordBoundaryRegex.test(messageLower)) {
                    scores[category] += 3;
                }
                // Partial matches (lower score)
                else if (messageLower.includes(keyword)) {
                    scores[category] += 1;
                }
            });
            
            // Question type bonus - give extra points for relevant question types
            scores[category] += this.getQuestionTypeBonus(category, questionType);
        }
        
        // Find the category with the highest score
        const bestMatch = Object.entries(scores)
            .reduce((best, [category, score]) => {
                return score > best.score ? { category, score } : best;
            }, { category: null, score: 0 });
          console.log('Question analysis:', { message: messageLower, questionType, scores, bestMatch });
        
        // Return response based on confidence level
        if (bestMatch.score >= 4) {
            console.log('High confidence response for:', bestMatch.category);
            return this.keywordResponses[bestMatch.category].response;
        } else if (bestMatch.score >= 2) {
            // Medium confidence - provide the answer but acknowledge uncertainty
            console.log('Medium confidence response for:', bestMatch.category);
            return `I think you're asking about ${bestMatch.category.replace('_', ' ')}. Here's what I can tell you:\n\n${this.keywordResponses[bestMatch.category].response}\n\nIf this isn't what you were looking for, please try rephrasing your question or contact us directly!`;
        }
        
        // Low confidence - provide helpful fallback
        console.log('Low confidence, using fallback response');
        return this.getSmartFallbackResponse(messageLower, questionType);
    }
      detectQuestionType(message) {
        if (message.includes('what time') || message.includes('when') || message.includes('hours')) {
            return 'time';
        }
        if (message.includes('where') || message.includes('location') || message.includes('address')) {
            return 'location';
        }
        if (message.includes('how much') || message.includes('price') || message.includes('cost') || message.includes('fee')) {
            return 'price';
        }
        if (message.includes('how to rent') || message.includes('how do i rent')) {
            return 'rental_process';
        }
        if (message.includes('how') && (message.includes('book') || message.includes('schedule') || message.includes('appointment'))) {
            return 'booking_process';
        }
        if (message.includes('what') && (message.includes('offer') || message.includes('have') || message.includes('available'))) {
            return 'catalog';
        }
        if (message.includes('contact') || message.includes('phone') || message.includes('call')) {
            return 'contact';
        }
        return 'general';
    }
      getQuestionTypeBonus(category, questionType) {
        const bonuses = {
            'hours': { 'time': 3 },
            'location': { 'location': 3 },
            'rental_info': { 'price': 3, 'rental_process': 4 },
            'booking_process': { 'booking_process': 3 },
            'categories': { 'catalog': 3 },
            'contact_info': { 'contact': 3 },
            'payment_info': { 'price': 1 },
            'fitting_info': { 'booking_process': 1 }
        };
        
        return bonuses[category] && bonuses[category][questionType] || 0;
    }
      getSmartFallbackResponse(message, questionType) {
        // Provide contextual help based on question type
        let suggestion = "";
        
        switch (questionType) {
            case 'time':
                suggestion = "It seems you're asking about our hours. Try asking 'What are your store hours?' or 'When are you open?'";
                break;
            case 'location':
                suggestion = "It looks like you want to know our location. Try asking 'Where is your store?' or 'What's your address?'";
                break;
            case 'price':
                suggestion = "You seem to be asking about pricing. Try 'How much does it cost to rent?' or 'What are your rental fees?'";
                break;
            case 'rental_process':
                suggestion = "You want to know how to rent. Try asking 'How do I rent a gown?' or 'What's the rental process?'";
                break;
            case 'booking_process':
                suggestion = "You might be asking about booking. Try 'How do I book an appointment?' or 'How do I schedule a fitting?'";
                break;
            case 'catalog':
                suggestion = "You seem interested in our collection. Try asking 'What types of gowns do you have?' or 'What are your available categories?'";
                break;
            case 'contact':
                suggestion = "You want to contact us. Try asking 'What's your phone number?' or 'How can I contact you?'";
                break;
            default:
                suggestion = "Try using specific keywords like 'hours', 'location', 'price', 'how to rent', or 'contact'";
        }
        
        return `I'm not sure I understand your question completely. ${suggestion}\n\nYou can also:\n• Browse our FAQ suggestions below\n• Call us at +63 000 000 000 for direct assistance\n• Visit us at B42 L13 Bilbao Street, Imus, Cavite`;
    }    addMessage(message, sender, skipSave = false) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('p');
        // Handle line breaks properly
        messageContent.innerHTML = message.replace(/\n/g, '<br>');
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = this.getTimestamp();
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(timestamp);
        messagesContainer.appendChild(messageDiv);
        
        // Save to chat history only if not restoring from saved data
        if (!skipSave) {
            this.chatHistory.push({
                message,
                sender,
                timestamp: new Date().toISOString()
            });
            this.saveChatHistory();
        }
        
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
    }    minimizeChatbot() {
        const chatbot = document.getElementById('chandriasChatbot');
        const bubble = document.getElementById('chatbotBubble');
        const speechBubble = document.getElementById('chatbotSpeechBubble');
        
        chatbot.classList.add('hidden');
        bubble.classList.remove('hidden');
        this.isMinimized = true;
        
        // Show speech bubble after a delay when minimizing
        setTimeout(() => {
            this.showSpeechBubble();
        }, 500);
        
        // Save state for persistence across pages
        if (window.ChatbotPersistence) {
            window.ChatbotPersistence.saveState(true);
        }
    }    maximizeChatbot() {
        console.log('Maximizing chatbot...');
        const chatbot = document.getElementById('chandriasChatbot');
        const bubble = document.getElementById('chatbotBubble');
        
        if (!chatbot || !bubble) {
            console.error('Chatbot elements not found');
            return;
        }
        
        chatbot.classList.remove('hidden');
        bubble.classList.add('hidden');
        this.isMinimized = false;
        
        console.log('Chatbot maximized successfully');
        
        // Save state for persistence across pages
        if (window.ChatbotPersistence) {
            window.ChatbotPersistence.saveState(false);
        }
    }

    closeChatbot() {
        // Clear all conversation data
        this.clearAllData();
        
        // Hide the chatbot and show the bubble
        const chatbot = document.getElementById('chandriasChatbot');
        const bubble = document.getElementById('chatbotBubble');
        
        chatbot.classList.add('hidden');
        bubble.classList.remove('hidden');
        this.isMinimized = true;
        
        // Save minimized state for persistence across pages
        if (window.ChatbotPersistence) {
            window.ChatbotPersistence.saveState(true);
        }
    }

    clearAllData() {
        // Clear chat history
        this.chatHistory = [];
        
        // Remove from localStorage
        try {
            localStorage.removeItem('chandria-chatbot-history');
            console.log('Chat history cleared');
        } catch (error) {
            console.log('Could not clear chat history from localStorage');
        }
        
        // Reset the chat messages to initial state
        const messagesContainer = document.getElementById('chatbotMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="message bot-message">
                    <p>Hello! I am Chandria's Personal Chatbot, feel free to ask if you have questions!</p>
                    <span class="timestamp">${this.getTimestamp()}</span>
                </div>
            `;
        }
        
        // Reset FAQ suggestions and make them visible again
        this.updateFAQSuggestions();
        const faqContainer = document.getElementById('faqSuggestions');
        if (faqContainer) {
            faqContainer.style.display = 'flex';
        }
        
        // Clear input field
        const input = document.getElementById('chatbotInput');
        if (input) {
            input.value = '';
        }
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('chandria-chatbot-history');
            if (saved) {
                const parsedHistory = JSON.parse(saved);
                // Validate that it's an array
                if (Array.isArray(parsedHistory)) {
                    this.chatHistory = parsedHistory;
                    console.log(`Loaded ${this.chatHistory.length} chat messages from localStorage`);
                } else {
                    console.log('Invalid chat history format, starting fresh');
                    this.chatHistory = [];
                }
            } else {
                console.log('No previous chat history found');
                this.chatHistory = [];
            }
        } catch (error) {
            console.log('Error loading chat history, starting fresh:', error);
            this.chatHistory = [];
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('chandria-chatbot-history', JSON.stringify(this.chatHistory));
            console.log(`Saved ${this.chatHistory.length} chat messages to localStorage`);
        } catch (error) {
            console.log('Could not save chat history:', error);
        }
    }

    restoreMessagesToUI() {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (!messagesContainer) return;

        // Clear existing messages first
        messagesContainer.innerHTML = '';

        // If no chat history, show the default welcome message
        if (this.chatHistory.length === 0) {
            messagesContainer.innerHTML = `
                <div class="message bot-message">
                    <p>Hello! I am Chandria's Personal Chatbot, feel free to ask if you have questions!</p>
                    <span class="timestamp">${this.getTimestamp()}</span>
                </div>
            `;
        } else {
            // Restore all messages from chat history
            this.chatHistory.forEach(entry => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${entry.sender}-message`;
                
                const messageContent = document.createElement('p');
                // Handle line breaks properly
                messageContent.innerHTML = entry.message.replace(/\n/g, '<br>');
                
                const timestamp = document.createElement('span');
                timestamp.className = 'timestamp';
                // Use saved timestamp or create new one
                const savedTime = entry.timestamp ? new Date(entry.timestamp) : new Date();
                timestamp.textContent = savedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                messageDiv.appendChild(messageContent);
                messageDiv.appendChild(timestamp);
                messagesContainer.appendChild(messageDiv);
            });
        }

        // Update FAQ suggestions based on current state
        this.updateFAQSuggestions();
        
        // If there's conversation history, hide FAQ suggestions
        if (this.chatHistory.length > 0) {
            const faqContainer = document.getElementById('faqSuggestions');
            if (faqContainer) {
                faqContainer.style.display = 'none';
            }
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Export the chatbot class
export default ChandriasChatbot;
