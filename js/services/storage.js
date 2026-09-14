// Storage Service - Local storage utilities

window.StorageService = {
    KEY_PREFIX: 'bsms_',

    // Save data to localStorage
    save: (key, data) => {
        try {
            localStorage.setItem(StorageService.KEY_PREFIX + key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage save error:', e);
            return false;
        }
    },

    // Load data from localStorage
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(StorageService.KEY_PREFIX + key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load error:', e);
            return defaultValue;
        }
    },

    // Remove data from localStorage
    remove: (key) => {
        try {
            localStorage.removeItem(StorageService.KEY_PREFIX + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    // Clear all app data
    clearAll: () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(StorageService.KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    },

    // Shop settings
    saveShopSettings: (settings) => StorageService.save('shop_settings', settings),
    getShopSettings: () => StorageService.load('shop_settings', {
        shopName: 'BookShop',
        shopLogo: null,
        logoScale: 1,
        logoX: 0,
        logoY: 0
    }),

    // User session
    saveUserSession: (user) => StorageService.save('user_session', user),
    getUserSession: () => StorageService.load('user_session', null),
    clearUserSession: () => StorageService.remove('user_session'),

    // Theme
    saveTheme: (isDark) => StorageService.save('theme_dark', isDark),
    getTheme: () => StorageService.load('theme_dark', false)
};

console.log('Storage Service loaded');
