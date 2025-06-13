// Manual test to add product and reload
async function manualTestAddProduct() {
    try {
        console.log("🧪 Manual test: Adding a product...");
        
        // Wait for addProduct function to be available
        if (!window.addProduct) {
            console.log("⏳ Waiting for addProduct function...");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!window.addProduct) {
            console.error("❌ addProduct function still not available");
            return;
        }
        
        const testProduct = {
            name: "Manual Test Product",
            category: "Ball Gown",
            price: 100,
            description: "This is a manually added test product",
            frontImageUrl: "",
            backImageUrl: "",
            sizes: ["S", "M", "L"],
            color: "#ff0000",
            sleeve: "sleeveless"
        };
        
        console.log("📦 Adding product:", testProduct);
        const productId = await window.addProduct(testProduct);
        console.log("✅ Product added with ID:", productId);
        
        // Try to reload the view
        if (window.loadAllItems) {
            console.log("🔄 Reloading all items...");
            await window.loadAllItems();
        }
        
        return productId;
        
    } catch (error) {
        console.error("❌ Manual test failed:", error);
    }
}

// Make available globally for console testing
window.manualTestAddProduct = manualTestAddProduct;

// Auto-run the test after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(manualTestAddProduct, 5000); // Wait 5 seconds then add test product
});
