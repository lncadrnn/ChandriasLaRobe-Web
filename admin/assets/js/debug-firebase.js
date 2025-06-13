// Debug script to check Firebase data
import { chandriaDB, collection, getDocs, addDoc } from "./sdk/chandrias-sdk.js";

async function debugFirebaseData() {
    try {
        console.log("🔍 Debugging Firebase data...");
        
        // Check products collection
        const productsSnapshot = await getDocs(collection(chandriaDB, "products"));
        console.log("📦 Products collection:", productsSnapshot.size, "items");
        
        if (productsSnapshot.size > 0) {
            console.log("📋 Products data:");
            productsSnapshot.forEach(doc => {
                console.log("- Product ID:", doc.id, "Data:", doc.data());
            });
        } else {
            console.log("⚠️ No products found in database");
        }
        
        // Check additionals collection
        const additionalsSnapshot = await getDocs(collection(chandriaDB, "additionals"));
        console.log("🎁 Additionals collection:", additionalsSnapshot.size, "items");
        
        if (additionalsSnapshot.size > 0) {
            console.log("📋 Additionals data:");
            additionalsSnapshot.forEach(doc => {
                console.log("- Additional ID:", doc.id, "Data:", doc.data());
            });
        } else {
            console.log("⚠️ No additionals found in database");
        }
        
        // Check if containers exist
        const productsContainer = document.getElementById('products-container');
        const additionalsContainer = document.getElementById('additional-container');
        
        console.log("🎯 Container check:");
        console.log("- products-container exists:", !!productsContainer);
        console.log("- additional-container exists:", !!additionalsContainer);
        
        if (productsContainer) {
            console.log("- products-container innerHTML length:", productsContainer.innerHTML.length);
        }
        if (additionalsContainer) {
            console.log("- additional-container innerHTML length:", additionalsContainer.innerHTML.length);
        }
        
    } catch (error) {
        console.error("❌ Debug error:", error);
    }
}

// Function to add test data for debugging
async function addTestData() {
    try {
        console.log("🧪 Adding test data...");
        
        // Test products with clothing categories
        const clothingItems = [
            {
                name: "Elegant Ball Gown",
                category: "Ball Gown", 
                price: 250,
                description: "Beautiful elegant ball gown for special occasions",
                frontImageUrl: "",
                backImageUrl: "",
                sizes: ["S", "M", "L"],
                color: "#ff69b4",
                sleeve: "sleeveless",
                createdAt: new Date()
            },
            {
                name: "Romantic Long Gown",
                category: "Long Gown", 
                price: 200,
                description: "Romantic long gown perfect for evening events",
                frontImageUrl: "",
                backImageUrl: "",
                sizes: ["S", "M", "L"],
                color: "#8a2be2",
                sleeve: "long sleeve",
                createdAt: new Date()
            },
            {
                name: "Classic Wedding Gown",
                category: "Wedding Gown", 
                price: 500,
                description: "Classic white wedding gown for your special day",
                frontImageUrl: "",
                backImageUrl: "",
                sizes: ["S", "M", "L", "XL"],
                color: "#ffffff",
                sleeve: "sleeveless",
                createdAt: new Date()
            },
            {
                name: "Whimsical Fairy Gown",
                category: "Fairy Gown", 
                price: 180,
                description: "Whimsical fairy gown with magical details",
                frontImageUrl: "",
                backImageUrl: "",
                sizes: ["XS", "S", "M"],
                color: "#98fb98",
                sleeve: "cap sleeve",
                createdAt: new Date()
            },
            {
                name: "Formal Business Suit",
                category: "Suits", 
                price: 300,
                description: "Professional business suit for formal occasions",
                frontImageUrl: "",
                backImageUrl: "",
                sizes: ["S", "M", "L", "XL"],
                color: "#2f4f4f",
                sleeve: "long sleeve",
                createdAt: new Date()
            }
        ];
        
        // Test accessories
        const accessories = [
            {
                name: "Bridal Tiara Set",
                category: "accessory",
                price: 75,
                description: "Beautiful tiara and jewelry set for brides",
                inclusions: ["tiara", "necklace", "earrings"],
                createdAt: new Date()
            },
            {
                name: "Pearl Necklace",
                category: "accessory",
                price: 45,
                description: "Elegant pearl necklace for formal events",
                inclusions: ["necklace"],
                createdAt: new Date()
            }
        ];
        
        // Test additional accessories (in additionals collection)
        const additionalAccessories = [
            {
                name: "Wedding Veil Set",
                category: "veil",
                price: 120,
                description: "Complete wedding veil set with cathedral length",
                inclusions: ["cathedral veil", "blusher veil", "comb"],
                createdAt: new Date()
            },
            {
                name: "Formal Gloves Collection",
                category: "gloves",
                price: 35,
                description: "Collection of formal gloves in various lengths",
                inclusions: ["short gloves", "opera gloves", "lace gloves"],
                createdAt: new Date()
            }
        ];
        
        console.log("Adding clothing items to products collection...");
        for (const item of clothingItems) {
            const docRef = await addDoc(collection(chandriaDB, "products"), item);
            console.log(`✅ Added clothing item: ${item.name} (ID: ${docRef.id})`);
        }
        
        console.log("Adding accessory items to products collection...");
        for (const item of accessories) {
            const docRef = await addDoc(collection(chandriaDB, "products"), item);
            console.log(`✅ Added accessory: ${item.name} (ID: ${docRef.id})`);
        }
        
        console.log("Adding items to additionals collection...");
        for (const item of additionalAccessories) {
            const docRef = await addDoc(collection(chandriaDB, "additionals"), item);
            console.log(`✅ Added additional: ${item.name} (ID: ${docRef.id})`);
        }
        
        console.log("🎉 All test data added successfully!");
        
        // Reload the current view
        if (window.loadAllItems) {
            console.log("🔄 Reloading inventory display...");
            await window.loadAllItems();
        }
        
        return true;
    } catch (error) {
        console.error("❌ Error adding test data:", error);
        return false;
    }
}

// Run debug after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(debugFirebaseData, 3000); // Wait 3 seconds for other scripts to load
});

// Also make it available globally for manual testing
window.debugFirebaseData = debugFirebaseData;
window.addTestData = addTestData;
