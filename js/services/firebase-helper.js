// Firebase Helper - Common utilities for Firebase operations

window.FirebaseHelper = {
    // Format timestamp to readable date
    formatDate: (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Get today's date string in YYYY-MM-DD format
    getTodayString: () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    // Get current timestamp
    getCurrentTimestamp: () => {
        return Date.now();
    },

    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

console.log('Firebase Helper loaded');
