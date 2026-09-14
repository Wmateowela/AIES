// Inventory Service - Manages products, stock, and bundle logic

window.InventoryService = {
    products: [],
    isInitialized: false,
    listeners: [],

    // Initialize inventory from Google Sheets with fallback to LocalStorage
    init: async (onDataUpdate) => {
        try {
            console.log("Fetching Inventory directly from Google Sheets...");
            
            // Check if we have a valid URL
            if (typeof window.GAS_WEB_APP_URL === 'undefined' || !window.GAS_WEB_APP_URL || window.GAS_WEB_APP_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') {
                throw new Error('Google Apps Script URL not configured. Please update js/config/google-sheet-config.js');
            }
            
            const response = await fetch(window.GAS_WEB_APP_URL);
            if (!response.ok) throw new Error('Failed to fetch from Google Sheets');

            const productsData = await response.json();

            // Transform data
            InventoryService.products = productsData.map(p => ({
                ...p,
                id: p.id.toString(),
                qty: parseInt(p.qty) || 0,
                salePrice: parseFloat(p.salePrice) || 0,
                purchasePrice: parseFloat(p.purchasePrice) || 0
            }));

            console.log(`Inventory loaded: ${InventoryService.products.length} items from Google Sheets`);
            InventoryService.isInitialized = true;
            
            // Notify all listeners
            InventoryService.notifyListeners();
            if (onDataUpdate) onDataUpdate(InventoryService.products);

            if (typeof renderInventoryTable === 'function') renderInventoryTable();
        } catch (e) {
            console.error("Error loading inventory from Sheets:", e);
            
            // Fallback to LocalStorage
            console.log("Falling back to LocalStorage...");
            const localData = localStorage.getItem('inventory_products');
            if (localData) {
                try {
                    InventoryService.products = JSON.parse(localData);
                    InventoryService.isInitialized = true;
                    console.log(`Inventory loaded from LocalStorage: ${InventoryService.products.length} items`);
                    
                    // Notify all listeners
                    InventoryService.notifyListeners();
                    if (onDataUpdate) onDataUpdate(InventoryService.products);

                    if (typeof renderInventoryTable === 'function') renderInventoryTable();
                    
                    if (typeof showToast === 'function') {
                        showToast('Using offline mode. Connect to sync with Sheets.', 'warning');
                    }
                    return;
                } catch (parseError) {
                    console.error("Error parsing local inventory:", parseError);
                }
            }
            
            // If no local data either, initialize empty
            InventoryService.products = [];
            InventoryService.isInitialized = true;
            InventoryService.notifyListeners();
            if (onDataUpdate) onDataUpdate([]);
            if (typeof renderInventoryTable === 'function') renderInventoryTable();
            
            if (typeof showToast === 'function') {
                showToast('Failed to load inventory. Using empty inventory.', 'error');
            }
        }
    },

    // Add listener for inventory updates
    addListener: (callback) => {
        InventoryService.listeners.push(callback);
    },

    // Notify all listeners of changes
    notifyListeners: () => {
        InventoryService.listeners.forEach(cb => cb(InventoryService.products));
    },

    // Sync from Google Sheets
    syncFromGoogleSheets: async () => {
        InventoryService.isInitialized = false;
        await InventoryService.init();
        if (typeof showToast === 'function') {
            showToast('Inventory Refreshed from Sheets', 'success');
        }
    },

    // Get all products
    getAllProducts: () => {
        return InventoryService.products;
    },

    // Get product by ID
    getProductById: (id) => {
        return InventoryService.products.find(p => p.id === id);
    },

    // Search products
    searchProducts: (query) => {
        const q = query.toLowerCase();
        return InventoryService.products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.bundle && p.bundle.toLowerCase().includes(q))
        );
    },

    // Get children of a bundle product
    getChildren: (parentProduct) => {
        if (!parentProduct.bundle || !parentProduct.bundle.trim()) return [];

        const targetBundle = parentProduct.bundle.trim().toLowerCase();
        const bundleProducts = InventoryService.products.filter(p =>
            p.bundle && p.bundle.trim().toLowerCase() === targetBundle
        );

        // The host is the first one in the list
        if (bundleProducts.length > 0 && String(bundleProducts[0].id) === String(parentProduct.id)) {
            return bundleProducts.slice(1);
        }

        return [];
    },

    // Check if product is a bundle
    isBundle: (product) => {
        if (!product.bundle || !product.bundle.trim()) return false;
        
        const targetBundle = product.bundle.trim().toLowerCase();
        const bundleProducts = InventoryService.products.filter(p =>
            p.bundle && p.bundle.trim().toLowerCase() === targetBundle
        );
        
        return bundleProducts.length > 1 && String(bundleProducts[0].id) === String(product.id);
    },

    // Update stock for a product
    updateStock: async (id, qtyChange) => {
        const product = InventoryService.getProductById(id);
        if (product) {
            const newQty = (parseInt(product.qty) || 0) + qtyChange;

            try {
                console.log(`Sending stock update to Sheet: Row ${id}, New Qty ${newQty}`);

                await fetch(window.GAS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        updates: [{
                            rowId: id,
                            newQty: newQty
                        }]
                    })
                });

                // Update local state immediately
                product.qty = newQty;
                InventoryService.notifyListeners();
                
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
                if (typeof showToast === 'function') {
                    showToast(`Stock updated in Sheet for ${product.name}`, 'success');
                }
                return true;
            } catch (e) {
                console.error("Error updating stock in Sheet:", e);
                if (typeof showToast === 'function') {
                    showToast('Sheet sync failed, but sale recorded locally', 'warning');
                }
                return false;
            }
        }
        return false;
    },

    // Set exact stock quantity
    setStock: async (id, newQty) => {
        const product = InventoryService.getProductById(id);
        if (product) {
            try {
                await fetch(window.GAS_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        updates: [{
                            rowId: id,
                            newQty: parseInt(newQty)
                        }]
                    })
                });

                product.qty = parseInt(newQty);
                InventoryService.notifyListeners();
                
                if (typeof renderInventoryTable === 'function') renderInventoryTable();
                return true;
            } catch (e) {
                console.error("Error setting stock in Sheet:", e);
                return false;
            }
        }
        return false;
    },

    // Get available stock for a product (considering bundles)
    getAvailableStock: (productId) => {
        const product = InventoryService.getProductById(productId);
        if (!product) return 0;
        
        // If it's a bundle, return the bundle's qty
        if (InventoryService.isBundle(product)) {
            return product.qty || 0;
        }
        
        // If it's a child product, check parent bundle stock
        if (product.bundle && product.bundle.trim()) {
            const targetBundle = product.bundle.trim().toLowerCase();
            const parentProduct = InventoryService.products.find(p => 
                p.bundle && 
                p.bundle.trim().toLowerCase() === targetBundle &&
                InventoryService.isBundle(p)
            );
            
            if (parentProduct) {
                return parentProduct.qty || 0;
            }
        }
        
        return product.qty || 0;
    }
};

console.log('Inventory Service loaded');
