// Simple add product functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple add product script loaded");
    
    // Wait for comprehensive loader to be ready
    setTimeout(() => {
        if (window.addProduct) {
            console.log("✅ addProduct function is available");
            
            // Find the add product button and attach a simple handler
            const addProductBtn = document.querySelector('.add-item-btn');
            if (addProductBtn) {
                console.log("✅ Add product button found");
                
                addProductBtn.addEventListener('click', async function() {
                    try {
                        console.log("🔄 Add product button clicked");
                        
                        // Get form data
                        const productName = document.getElementById('add-product-name')?.value || '';
                        const productCategory = document.getElementById('add-product-category')?.value || '';
                        const productPrice = parseFloat(document.getElementById('add-product-price')?.value) || 0;
                        const productDescription = document.getElementById('add-product-description')?.value || '';
                        
                        // Basic validation
                        if (!productName.trim()) {
                            alert('Product name is required.');
                            return;
                        }
                        
                        if (!productCategory) {
                            alert('Product category is required.');
                            return;
                        }
                        
                        if (productPrice <= 0) {
                            alert('Product price must be greater than 0.');
                            return;
                        }
                        
                        // Create simple product data
                        const productData = {
                            name: productName.trim(),
                            category: productCategory,
                            price: productPrice,
                            description: productDescription.trim(),
                            frontImageUrl: '',
                            backImageUrl: '',
                            sizes: ['M'],
                            color: '#000000',
                            sleeve: '',
                        };
                        
                        console.log("📦 Adding product:", productData);
                        
                        // Add product
                        const productId = await window.addProduct(productData);
                        
                        // Success
                        alert("Product added successfully!");
                        
                        // Reset form
                        document.getElementById('addProductForm')?.reset();
                        document.getElementById('addProductModal')?.classList.remove('show');
                        
                        console.log("✅ Product added with ID:", productId);
                        
                    } catch (error) {
                        console.error("❌ Error adding product:", error);
                        alert("Error adding product: " + error.message);
                    }
                });
            } else {
                console.log("❌ Add product button not found");
            }
        } else {
            console.log("❌ addProduct function not available");
        }
    }, 2000);
});
