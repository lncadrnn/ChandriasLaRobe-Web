# Cloudinary Setup Guide for Inventory System

## Overview
This guide will help you fix the "Upload failed: Unauthorized" error by properly configuring Cloudinary for the inventory system.

## The Problem
The "Unauthorized" error occurs because the upload preset is not properly configured in your Cloudinary dashboard. Cloudinary requires an "unsigned" upload preset for client-side uploads without authentication.

## Step-by-Step Solution

### 1. Access Your Cloudinary Dashboard
- Go to [https://cloudinary.com](https://cloudinary.com)
- Log in to your account
- Navigate to your dashboard

### 2. Create an Unsigned Upload Preset
1. In the dashboard, go to **Settings** → **Upload**
2. Scroll down to **Upload presets**
3. Click **"Add upload preset"**
4. Configure the preset:
   - **Preset name**: `inventory_preset` (must match config)
   - **Signing mode**: **Unsigned** (this is crucial!)
   - **Folder**: `inventory/products` (optional, for organization)
   - **Format**: JPG
   - **Quality**: Auto
   - **Max file size**: 10MB (recommended)
   - **Max image width/height**: 2000px (recommended)

### 3. Update Configuration File
Edit `assets/js/config/cloudinary-config.js`:

```javascript
const CLOUDINARY_CONFIG = {
    cloudName: 'YOUR_CLOUD_NAME',           // Replace with your cloud name
    uploadPreset: 'inventory_preset',       // Must match the preset created above
    apiKey: 'YOUR_API_KEY',                // Your API key (for reference)
    folder: 'inventory/products'
};
```

### 4. Find Your Cloudinary Credentials
In your Cloudinary dashboard:
- **Cloud name**: Found in the dashboard URL or under "Account Details"
- **API Key**: Found under **Settings** → **Security** → **Access Keys**

### 5. Common Issues and Solutions

#### Issue: "Upload failed: Unauthorized"
**Solution**: Ensure your upload preset is set to **"Unsigned"**

#### Issue: "Invalid upload preset"
**Solution**: Double-check the preset name matches exactly (`inventory_preset`)

#### Issue: "Resource not found"
**Solution**: Verify your cloud name is correct

### 6. Testing the Configuration
1. Open the inventory page
2. Check the browser console for any configuration errors
3. Try uploading an image to test the setup

### 7. Security Best Practices
- Use unsigned presets only for public uploads
- Set appropriate file size and format restrictions
- Consider adding transformation presets for automatic image optimization
- Monitor your Cloudinary usage to avoid unexpected charges

### 8. Optional Enhancements
You can enhance your upload preset with:
- **Auto-optimization**: Automatically compress images
- **Format conversion**: Convert all uploads to WebP or AVIF for better performance
- **Responsive breakpoints**: Generate multiple sizes automatically
- **Content analysis**: AI-powered tagging and moderation

## Support
If you continue experiencing issues:
1. Check the browser console for detailed error messages
2. Verify all configuration values are correct
3. Test with the Cloudinary upload widget demo
4. Contact Cloudinary support if needed

## Configuration File Location
- Main config: `assets/js/config/cloudinary-config.js`
- Upload service: `assets/js/js firebase/inventory-cloud.js`
- HTML reference: `inventory.html` (lines 516-520)
