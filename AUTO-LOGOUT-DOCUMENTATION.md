# 🔐 Auto-Logout System Documentation

## Overview
The enhanced auto-logout system provides comprehensive session management for Chandria's La Robe website with consistent behavior across all pages.

## Features

### ✅ 30-Minute Inactivity Logout
- Automatically logs out users after 30 minutes of complete inactivity
- Tracks mouse movements, clicks, keypresses, scrolling, and touch events
- Timer resets on any user activity
- Shows alert notification before redirecting to login page

### ✅ Tab Hidden Logout
- Logs out users if tab stays hidden for 30 minutes
- Prevents accidental logout on quick tab switches
- Only triggers after sustained absence from the tab

### ✅ Browser/Tab Close Logout
- Immediately logs out users when browser or tab is closed
- Prevents logout during internal site navigation
- Clears all session data and localStorage

### ✅ Browser Restart Detection
- Detects if browser was closed for more than 30 minutes
- Automatically logs out user on page reload after extended closure
- Maintains session if browser was closed briefly

### ✅ Smart Navigation Detection
- Differentiates between internal site navigation and external navigation
- Prevents logout when users navigate between pages on the same site
- Only triggers logout on actual browser close or external navigation

## Implementation

### Files Updated
- ✅ `auto-logout.js` - Main auto-logout class with all features
- ✅ `index.html` - Updated to use centralized auto-logout
- ✅ `shop.html` - Updated to use centralized auto-logout  
- ✅ `accounts.html` - Added auto-logout import
- ✅ `user_authentication.html` - Fixed back button to go to index.html
- ✅ `test_Profile.js` - Added auto-logout import
- ✅ `cart.js` - Added auto-logout import
- ✅ `checkout.js` - Added auto-logout import

### Integration
All authenticated pages now automatically import and initialize the auto-logout system:

```javascript
import autoLogout from "./assets/js/auto-logout.js";
```

The system runs automatically - no additional setup required.

## User Experience

### What Users Will Experience:

1. **Normal Usage**: Users can browse normally without interruption
2. **Inactivity Warning**: After 30 minutes of inactivity, users see an alert and are redirected to login
3. **Tab Switching**: Quick tab switches won't log users out
4. **Extended Tab Hiding**: If tab is hidden for 30+ minutes, user is logged out
5. **Browser Close**: Closing browser/tab immediately logs out the user
6. **Session Recovery**: If browser was closed for 30+ minutes, user must log in again

### What Users Won't Experience:
- ❌ Logout during normal site navigation
- ❌ Logout when quickly switching tabs
- ❌ Logout when briefly closing/reopening browser
- ❌ Inconsistent behavior between pages

## Security Benefits

1. **Session Protection**: Prevents unauthorized access from unattended devices
2. **Data Security**: Clears sensitive data from localStorage on logout
3. **Consistent Behavior**: Same logout rules apply across entire website
4. **Graceful Handling**: Proper cleanup of Firebase authentication state

## Testing

A test page is available at `chandriahomepage/auto-logout-test.html` to demonstrate all features:
- Real-time inactivity timer
- Activity simulation
- Manual logout testing
- System logs display

## Configuration

The auto-logout timeout is set to 30 minutes (1,800,000 milliseconds) and can be adjusted in the `AutoLogout` constructor:

```javascript
this.inactivityTimeout = 30 * 60 * 1000; // 30 minutes
```

## Troubleshooting

### Common Issues:
1. **Module Import Errors**: Ensure all files that use authentication also import auto-logout
2. **Timer Not Resetting**: Check that activity events are properly registered
3. **Logout Not Working**: Verify Firebase SDK is properly initialized

### Debug Mode:
The system logs all actions to the browser console for debugging:
- Activity tracking
- Timer resets
- Logout triggers
- Session checks

## Maintenance

The auto-logout system is self-contained and requires minimal maintenance. Monitor console logs for any errors and ensure the Firebase SDK remains up to date.

---

**Status**: ✅ Fully Implemented and Tested
**Last Updated**: December 2024
**Version**: 2.0 (Enhanced with comprehensive timeout features)
