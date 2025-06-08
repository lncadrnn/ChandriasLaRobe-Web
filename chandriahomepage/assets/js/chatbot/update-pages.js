// Chatbot injection script for all pages

// List of pages that need the chatbot
const pagesToUpdate = [
    '/chandriahomepage/about-policy.html',
    '/chandriahomepage/accounts.html',
    '/chandriahomepage/business-policy.html',
    '/chandriahomepage/cart.html',
    '/chandriahomepage/checkout.html',
    '/chandriahomepage/details.html',
    '/chandriahomepage/shop.html',
    '/chandriahomepage/wishlist.html'
];

// Content to add to each page's head section
const headContent = `
    <link rel="stylesheet" href="/chandriahomepage/assets/css/chatbot.css" />
`;

// Content to add before closing body tag
const bodyContent = `
    <script type="module" src="/chandriahomepage/assets/js/chatbot/chatbot-init.js"></script>
`;

// Function to update each page
async function updatePages() {
    for (const page of pagesToUpdate) {
        // Read the current page content
        const pageContent = await fs.readFile(page, 'utf8');
        
        // Add head content if not present
        if (!pageContent.includes('chatbot.css')) {
            pageContent = pageContent.replace('</head>', `${headContent}\n</head>`);
        }
        
        // Add body content if not present
        if (!pageContent.includes('chatbot-init.js')) {
            pageContent = pageContent.replace('</body>', `${bodyContent}\n</body>`);
        }
        
        // Write the updated content back
        await fs.writeFile(page, pageContent);
    }
}

updatePages().catch(console.error);
