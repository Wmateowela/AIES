// Auth Service - Authentication management

window.AuthService = {
    currentUser: null,
    authListener: null,

    // Initialize auth listener
    init: (onAuthChange) => {
        if (!window.fb) {
            console.error('Firebase not initialized');
            return;
        }

        AuthService.authListener = window.fb.onAuthStateChanged(window.fb.auth, (user) => {
            AuthService.currentUser = user;
            if (onAuthChange) onAuthChange(user);
        });
    },

    // Sign in
    signIn: async (username, password) => {
        try {
            const result = await window.fb.signInWithEmailAndPassword(window.fb.auth, username, password);
            AuthService.currentUser = result.user;
            StorageService.saveUserSession({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName || username
            });
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    },

    // Sign out
    signOut: async () => {
        try {
            await window.fb.signOut(window.fb.auth);
            AuthService.currentUser = null;
            StorageService.clearUserSession();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    },

    // Check if user is logged in
    isLoggedIn: () => {
        return AuthService.currentUser !== null;
    },

    // Get current user
    getCurrentUser: () => {
        return AuthService.currentUser;
    },

    // Cleanup
    destroy: () => {
        if (AuthService.authListener) {
            AuthService.authListener();
            AuthService.authListener = null;
        }
    }
};

console.log('Auth Service loaded');
