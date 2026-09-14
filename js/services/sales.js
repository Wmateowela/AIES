// Sales Service - Manages sales transactions and history

window.SalesService = {
    sales: [],
    isInitialized: false,
    listeners: [],

    // Initialize sales from localStorage
    init: (onDataUpdate) => {
        try {
            const savedSales = StorageService.load('sales', []);
            SalesService.sales = savedSales.map(s => ({
                ...s,
                id: s.id.toString(),
                productId: s.productId.toString(),
                qty: parseInt(s.qty) || 0,
                salePrice: parseFloat(s.salePrice) || 0,
                totalAmount: parseFloat(s.totalAmount) || 0,
                timestamp: s.timestamp || Date.now()
            }));
            
            console.log(`Sales loaded: ${SalesService.sales.length} transactions`);
            SalesService.isInitialized = true;
            
            if (onDataUpdate) onDataUpdate(SalesService.sales);
            SalesService.notifyListeners();
        } catch (e) {
            console.error("Error loading sales:", e);
            SalesService.sales = [];
            SalesService.isInitialized = true;
        }
    },

    // Add listener for sales updates
    addListener: (callback) => {
        SalesService.listeners.push(callback);
    },

    // Notify all listeners of changes
    notifyListeners: () => {
        SalesService.listeners.forEach(cb => cb(SalesService.sales));
    },

    // Get all sales
    getAllSales: () => {
        return SalesService.sales;
    },

    // Get sales by date range
    getSalesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        
        return SalesService.sales.filter(sale => {
            const saleDate = sale.timestamp || Date.now();
            return saleDate >= start && saleDate <= end;
        });
    },

    // Get today's sales
    getTodaySales: () => {
        const today = FirebaseHelper.getTodayString();
        return SalesService.getSalesByDateRange(today, today);
    },

    // Record a new sale
    recordSale: async (productId, qty, salePrice, totalAmount, customerName = '') => {
        try {
            const sale = {
                id: FirebaseHelper.generateId(),
                productId: productId.toString(),
                qty: parseInt(qty),
                salePrice: parseFloat(salePrice),
                totalAmount: parseFloat(totalAmount),
                customerName: customerName,
                timestamp: Date.now(),
                date: FirebaseHelper.getTodayString()
            };

            // Add to local storage immediately
            SalesService.sales.unshift(sale);
            StorageService.save('sales', SalesService.sales);
            SalesService.notifyListeners();

            // Update inventory stock
            await InventoryService.updateStock(productId, -qty);

            if (typeof showToast === 'function') {
                showToast('Sale recorded successfully', 'success');
            }

            return { success: true, sale };
        } catch (e) {
            console.error("Error recording sale:", e);
            if (typeof showToast === 'function') {
                showToast('Failed to record sale', 'error');
            }
            return { success: false, error: e.message };
        }
    },

    // Delete a sale
    deleteSale: async (saleId) => {
        try {
            const saleIndex = SalesService.sales.findIndex(s => s.id === saleId);
            if (saleIndex === -1) {
                return { success: false, error: 'Sale not found' };
            }

            const sale = SalesService.sales[saleIndex];
            
            // Restore inventory stock
            await InventoryService.updateStock(sale.productId, parseInt(sale.qty));

            // Remove from array
            SalesService.sales.splice(saleIndex, 1);
            StorageService.save('sales', SalesService.sales);
            SalesService.notifyListeners();

            if (typeof showToast === 'function') {
                showToast('Sale deleted successfully', 'success');
            }

            return { success: true };
        } catch (e) {
            console.error("Error deleting sale:", e);
            if (typeof showToast === 'function') {
                showToast('Failed to delete sale', 'error');
            }
            return { success: false, error: e.message };
        }
    },

    // Get sales statistics
    getSalesStats: (startDate, endDate) => {
        const salesInRange = SalesService.getSalesByDateRange(startDate, endDate);
        
        const totalSales = salesInRange.length;
        const totalRevenue = salesInRange.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalItemsSold = salesInRange.reduce((sum, sale) => sum + sale.qty, 0);
        
        return {
            totalSales,
            totalRevenue,
            totalItemsSold,
            averageSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0
        };
    },

    // Export sales data
    exportSalesData: () => {
        return JSON.stringify(SalesService.sales, null, 2);
    }
};

console.log('Sales Service loaded');
