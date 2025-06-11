// Firebase Configuration for Chandria's La Robe
// This file contains the Firebase project credentials and configuration

export const firebaseConfig = {
    apiKey: "AIzaSyBtfrDYSCxLwRTf8SbccI0taOpP1PZt4ok",
    authDomain: "chandria-s-la-robe.firebaseapp.com",
    projectId: "chandria-s-la-robe",
    storageBucket: "chandria-s-la-robe.firebasestorage.app",
    messagingSenderId: "34498186673",
    appId: "1:34498186673:web:b3a290af4e00e8e07cc190",
    measurementId: "G-XE9V7HM844"
};

// Collection names used throughout the application
export const COLLECTION_NAMES = {
    PRODUCTS: 'products',
    ADDITIONALS: 'additionals',
    USER_ACCOUNTS: 'userAccounts',
    ADMIN_ACCOUNTS: 'adminAccounts',
    TRANSACTIONS: 'transaction'
};

// Database field names for consistency
export const FIELD_NAMES = {
    PRODUCTS: {
        NAME: 'name',
        CODE: 'code',
        CATEGORY: 'category',
        COLOR: 'color',
        COLOR_HEX: 'colorHex',
        PRICE: 'price',
        RENTAL_PRICE: 'rentalPrice',
        SIZES: 'sizes',
        SLEEVES: 'sleeves',
        DESCRIPTION: 'description',
        FRONT_IMAGE_URL: 'frontImageUrl',
        BACK_IMAGE_URL: 'backImageUrl',
        FRONT_IMAGE_ID: 'frontImageId',
        BACK_IMAGE_ID: 'backImageId',
        STATUS: 'status',
        CREATED_AT: 'createdAt',
        UPDATED_AT: 'updatedAt'
    },
    ADDITIONALS: {
        NAME: 'name',
        CODE: 'code',
        TYPE: 'type',
        SIZE: 'size',
        COLOR: 'color',
        COLOR_HEX: 'colorHex',
        PRICE: 'price',
        RENTAL_PRICE: 'rentalPrice',
        DESCRIPTION: 'description',
        IMAGE_URL: 'imageUrl',
        IMAGE_ID: 'imageId',
        INCLUSIONS: 'inclusions',
        STATUS: 'status',
        CREATED_AT: 'createdAt',
        UPDATED_AT: 'updatedAt'
    }
};

// Status constants
export const STATUS = {
    AVAILABLE: 'available',
    RENTED: 'rented',
    MAINTENANCE: 'maintenance',
    UNAVAILABLE: 'unavailable'
};

// Category constants
export const CATEGORIES = {
    BALL_GOWN: 'ball-gown',
    LONG_GOWN: 'long-gown',
    FAIRY_GOWN: 'fairy-gown',
    WEDDING_GOWN: 'wedding-gown',
    SUIT: 'suit'
};

// Additional types constants
export const ADDITIONAL_TYPES = {
    JEWELRY: 'jewelry',
    SHOES: 'shoes',
    BAGS: 'bags',
    VEILS: 'veils',
    HEADPIECES: 'headpieces',
    OTHER: 'other'
};
