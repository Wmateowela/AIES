const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwYHs_E4vNH6b5y09pYsj7AJaZprIjrftLyMoSWhoTyK87gsZ1yLdq-X9GSc7giZ68e3w/exec";

const CATEGORIES = [
    "Boys Pants", "Boys Shirts", "Boys Sweater", "Boys Coat", "Girls Suit",
    "Girls Shirts", "Girls Shalwar", "Girls Sweaters", "Gloves", "Boys Cap",
    "Bags", "Tie", "Para", "Monogram", "Socks", "Muffler", "PG", "Nursery",
    "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8+9", "Class 10", "Copies"
];

let currentProducts = [];
let isInitialized = false;

const InventoryService = {
    init: async (onDataUpdate) => {
        try {
            console.log("Fetching Inventory directly from Google Sheets...");
            const response = await fetch(GAS_WEB_APP_URL);
            if (!response.ok) throw new Error('Failed to fetch from Google Sheets');

            const productsData = await response.json();

            // Transform data if necessary (GAS doGet returns array of objects)
            currentProducts = productsData.map(p => ({
                ...p,
                id: p.id.toString(), // Ensure ID is string
                qty: parseInt(p.qty) || 0,
                salePrice: parseFloat(p.salePrice) || 0,
                purchasePrice: parseFloat(p.purchasePrice) || 0
            }));

            console.log(`Inventory loaded: ${currentProducts.length} items from Google Sheets`);

            isInitialized = true;
            if (onDataUpdate) onDataUpdate(currentProducts);

            if (typeof renderInventoryTable === 'function') renderInventoryTable();
        } catch (e) {
            console.error("Error loading inventory from Sheets:", e);
            showToast('Failed to load inventory from Sheets', 'error');
        }
    },

    syncFromGoogleSheets: async () => {
        // Now sync is just re-initializing
        isInitialized = false;
        await InventoryService.init();
        showToast('Inventory Refreshed from Sheets', 'success');
    },

    getAllProducts: () => {
        return currentProducts;
    },

    getProductById: (id) => {
        return currentProducts.find(p => p.id === id);
    },

    // addProduct, updateProduct, deleteProduct are disabled in direct sheet mode
    // as user wants to manage everything in the sheet itself.

    updateStock: async (id, qtyChange) => {
        const product = InventoryService.getProductById(id);
        if (product) {
            const newQty = (parseInt(product.qty) || 0) + qtyChange;

            try {
                console.log(`Sending stock update to Sheet: Row ${id}, New Qty ${newQty}`);

                // We use a form-encoded POST or a simple GET for better compatibility with GAS
                // but POST with JSON is fine if we use the right approach.
                // However, GAS 'doPost' with JSON requires the script to handle it.

                await fetch(GAS_WEB_APP_URL, {
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
                if (typeof renderInventoryTable === 'function') renderInventoryTable();

                showToast(`Stock updated in Sheet for ${product.name}`, 'success');
                return true;
            } catch (e) {
                console.error("Error updating stock in Sheet:", e);
                showToast('Sheet sync failed, but sale recorded locally', 'warning');
                return false;
            }
        }
    },



    searchProducts: (query) => {
        const q = query.toLowerCase();
        return currentProducts.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            (p.bundle && p.bundle.toLowerCase().includes(q))
        );
    },

    getChildren: (parentProduct) => {
        if (!parentProduct.bundle || !parentProduct.bundle.trim()) return [];

        const targetBundle = parentProduct.bundle.trim().toLowerCase();
        // Find all products with the same bundle name
        const bundleProducts = currentProducts.filter(p =>
            p.bundle && p.bundle.trim().toLowerCase() === targetBundle
        );


        // The host is the first one in the list
        if (bundleProducts.length > 0 && String(bundleProducts[0].id) === String(parentProduct.id)) {
            // This is the host. Return all other products in the bundle as children.
            return bundleProducts.slice(1);
        }

        // If it's not the host, it has no children
        return [];
    }
};
