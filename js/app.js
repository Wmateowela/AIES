// Main Application Logic - BookShop POS & Inventory Management System

// Global configuration - Use the config file if available, otherwise fallback
window.GAS_WEB_APP_URL = (typeof window.GOOGLE_SCRIPT_URL !== 'undefined' && 
                          window.GOOGLE_SCRIPT_URL && 
                          window.GOOGLE_SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE') 
                         ? window.GOOGLE_SCRIPT_URL 
                         : 'https://script.google.com/macros/s/AKfycbxo9T8JzqQ7H5sXJ6vN8kR2mP4wL1dF3gH9iJ0kL2mN4oP6qR8sT0uV2wX4yZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2kL4mN6oP8qR0sT2uV4wX6yZ8aB0cD2eF4gH6iJ8kL0mN2oP4qR6sT8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0uV2wX4yZ6/exec';

// Global state
window.appState = {
    currentTab: 'pos',
    products: [],
    sales: [],
    dailyInventory: [],
    currentUser: null,
    cart: [],
    searchQuery: '',
    selectedCategory: 'all',
    isDarkMode: false
};

// Utility Functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.log('Toast:', message, type);
        return;
    }
    
    const toast = document.createElement('div');
    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        info: 'bg-blue-600'
    };
    
    toast.className = `${bgColors[type] || bgColors.info} text-white px-6 py-3 rounded-lg shadow-lg mb-2 transform transition-all duration-300 translate-x-full opacity-0`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Initialize Application
async function initApp() {
    try {
        console.log('Initializing application...');
        
        // Initialize services
        await InventoryService.init((products) => {
            appState.products = products;
            renderInventoryTable();
            updateAvailableStockDisplay();
        });
        
        SalesService.init((sales) => {
            appState.sales = sales;
            renderSalesHistory();
            updateDailyInventory();
        });
        
        // Load theme preference
        const isDark = StorageService.getTheme();
        if (isDark) {
            document.documentElement.classList.add('dark');
        }
        
        // Initialize auth
        AuthService.init((user) => {
            appState.currentUser = user;
            if (user) {
                showMainApp();
            } else {
                showLoginScreen();
            }
        });
        
        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Failed to initialize application', 'error');
        
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Navigation
function switchTab(tabName) {
    appState.currentTab = tabName;
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.tab-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${tabName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }
    
    // Refresh data based on tab
    switch(tabName) {
        case 'pos':
            renderPOS();
            break;
        case 'inventory':
            renderInventoryTable();
            break;
        case 'sales':
            renderSalesHistory();
            break;
        case 'daily-inventory':
            updateDailyInventory();
            break;
        case 'reports':
            renderReports();
            break;
    }
}

// POS Functions
function renderPOS() {
    const posProductsGrid = document.getElementById('pos-products-grid');
    if (!posProductsGrid) return;
    
    const filteredProducts = appState.products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
                             (product.barcode && product.barcode.toLowerCase().includes(appState.searchQuery.toLowerCase())) ||
                             (product.category && product.category.toLowerCase().includes(appState.searchQuery.toLowerCase()));
        const matchesCategory = appState.selectedCategory === 'all' || 
                               (product.category && product.category.toLowerCase() === appState.selectedCategory.toLowerCase());
        return matchesSearch && matchesCategory;
    });
    
    posProductsGrid.innerHTML = filteredProducts.map(product => {
        const availableStock = InventoryService.getAvailableStock(product.id);
        const isOutOfStock = availableStock <= 0;
        
        return `
            <div class="bg-surface-container p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-200 ${isOutOfStock ? 'opacity-50' : ''}" 
                 onclick="addToCart('${product.id}')" ${isOutOfStock ? 'style="pointer-events: none;"' : ''}>
                <div class="aspect-square bg-surface-bright rounded-lg mb-3 flex items-center justify-center">
                    <i class="fas fa-box text-4xl text-on-surface-variant"></i>
                </div>
                <h3 class="font-semibold text-on-surface mb-1">${product.name}</h3>
                <p class="text-sm text-on-surface-variant mb-2">Rs. ${product.salePrice}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs ${isOutOfStock ? 'text-error' : 'text-primary'} font-medium">
                        ${isOutOfStock ? 'Out of Stock' : `Stock: ${availableStock}`}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    renderCart();
}

function addToCart(productId) {
    const product = InventoryService.getProductById(productId);
    if (!product) return;
    
    const availableStock = InventoryService.getAvailableStock(productId);
    const existingItem = appState.cart.find(item => item.productId === productId);
    const currentQty = existingItem ? existingItem.qty : 0;
    
    if (currentQty + 1 > availableStock) {
        showToast('Not enough stock available', 'warning');
        return;
    }
    
    if (existingItem) {
        existingItem.qty++;
        existingItem.totalAmount = existingItem.qty * product.salePrice;
    } else {
        appState.cart.push({
            productId: productId,
            name: product.name,
            price: product.salePrice,
            qty: 1,
            totalAmount: product.salePrice
        });
    }
    
    renderCart();
}

function removeFromCart(index) {
    appState.cart.splice(index, 1);
    renderCart();
}

function updateCartQty(index, change) {
    const item = appState.cart[index];
    if (!item) return;
    
    const product = InventoryService.getProductById(item.productId);
    const availableStock = InventoryService.getAvailableStock(item.productId);
    
    const newQty = item.qty + change;
    
    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }
    
    if (newQty > availableStock) {
        showToast('Not enough stock available', 'warning');
        return;
    }
    
    item.qty = newQty;
    item.totalAmount = newQty * item.price;
    renderCart();
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    if (!cartItemsContainer) return;
    
    if (appState.cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-8 text-on-surface-variant">
                <i class="fas fa-shopping-cart text-4xl mb-3"></i>
                <p>Cart is empty</p>
            </div>
        `;
        if (cartTotalElement) cartTotalElement.textContent = 'Rs. 0';
        return;
    }
    
    cartItemsContainer.innerHTML = appState.cart.map((item, index) => `
        <div class="flex items-center justify-between py-3 border-b border-surface-container-highest">
            <div class="flex-1">
                <h4 class="font-medium text-on-surface">${item.name}</h4>
                <p class="text-sm text-on-surface-variant">Rs. ${item.price} × ${item.qty}</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="updateCartQty(${index}, -1)" class="w-8 h-8 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors">
                    <i class="fas fa-minus text-xs"></i>
                </button>
                <span class="w-8 text-center text-on-surface">${item.qty}</span>
                <button onclick="updateCartQty(${index}, 1)" class="w-8 h-8 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-variant transition-colors">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
            <button onclick="removeFromCart(${index})" class="ml-2 text-error hover:text-error-container transition-colors">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = appState.cart.reduce((sum, item) => sum + item.totalAmount, 0);
    if (cartTotalElement) cartTotalElement.textContent = formatCurrency(total);
}

function processCheckout() {
    if (appState.cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }
    
    const totalAmount = appState.cart.reduce((sum, item) => sum + item.totalAmount, 0);
    
    // Process each item in cart
    Promise.all(appState.cart.map(async (item) => {
        return await SalesService.recordSale(item.productId, item.qty, item.price, item.totalAmount);
    })).then((results) => {
        const successCount = results.filter(r => r.success).length;
        
        if (successCount > 0) {
            showToast(`Sale completed! ${successCount} items sold`, 'success');
            appState.cart = [];
            renderCart();
            renderPOS();
            renderSalesHistory();
            updateDailyInventory();
            
            // Print receipt
            printReceipt(totalAmount);
        } else {
            showToast('Failed to complete sale', 'error');
        }
    });
}

function printReceipt(totalAmount) {
    // Simple receipt generation
    console.log('Receipt generated for:', totalAmount);
}

// Inventory Functions
function renderInventoryTable() {
    const inventoryTableBody = document.getElementById('inventory-table-body');
    if (!inventoryTableBody) return;
    
    if (appState.products.length === 0) {
        inventoryTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-on-surface-variant">
                    No products found. Add products from Google Sheets.
                </td>
            </tr>
        `;
        return;
    }
    
    inventoryTableBody.innerHTML = appState.products.map(product => {
        const availableStock = InventoryService.getAvailableStock(product.id);
        const isBundle = InventoryService.isBundle(product);
        
        return `
            <tr class="border-b border-surface-container-highest hover:bg-surface-container/50 transition-colors">
                <td class="px-6 py-4 text-on-surface">${product.name}</td>
                <td class="px-6 py-4 text-on-surface-variant">${product.barcode || '-'}</td>
                <td class="px-6 py-4 text-on-surface-variant">${product.category || '-'}</td>
                <td class="px-6 py-4">
                    <span class="${isBundle ? 'bg-primary-fixed text-on-primary-container' : 'bg-surface-container-highest text-on-surface'} px-3 py-1 rounded-full text-sm">
                        ${isBundle ? 'Bundle' : 'Regular'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="${availableStock <= 0 ? 'text-error' : availableStock <= 5 ? 'text-warning' : 'text-on-surface'} font-medium">
                        ${availableStock}
                    </span>
                </td>
                <td class="px-6 py-4 text-on-surface">Rs. ${product.salePrice}</td>
                <td class="px-6 py-4 text-on-surface">Rs. ${product.purchasePrice}</td>
            </tr>
        `;
    }).join('');
}

function updateAvailableStockDisplay() {
    // Update any stock displays on the page
    renderPOS();
    renderInventoryTable();
}

// Sales History Functions
function renderSalesHistory() {
    const salesTableBody = document.getElementById('sales-table-body');
    const salesStatsElement = document.getElementById('sales-stats');
    
    if (!salesTableBody) return;
    
    const sortedSales = [...appState.sales].sort((a, b) => b.timestamp - a.timestamp);
    
    if (sortedSales.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-on-surface-variant">
                    No sales recorded yet
                </td>
            </tr>
        `;
        if (salesStatsElement) {
            salesStatsElement.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-surface-container p-4 rounded-xl">
                        <h3 class="text-on-surface-variant text-sm mb-1">Total Sales</h3>
                        <p class="text-2xl font-bold text-on-surface">0</p>
                    </div>
                    <div class="bg-surface-container p-4 rounded-xl">
                        <h3 class="text-on-surface-variant text-sm mb-1">Total Revenue</h3>
                        <p class="text-2xl font-bold text-primary">Rs. 0</p>
                    </div>
                    <div class="bg-surface-container p-4 rounded-xl">
                        <h3 class="text-on-surface-variant text-sm mb-1">Items Sold</h3>
                        <p class="text-2xl font-bold text-on-surface">0</p>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Calculate stats
    const totalSales = sortedSales.length;
    const totalRevenue = sortedSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalItemsSold = sortedSales.reduce((sum, sale) => sum + sale.qty, 0);
    
    if (salesStatsElement) {
        salesStatsElement.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-surface-container p-4 rounded-xl">
                    <h3 class="text-on-surface-variant text-sm mb-1">Total Sales</h3>
                    <p class="text-2xl font-bold text-on-surface">${totalSales}</p>
                </div>
                <div class="bg-surface-container p-4 rounded-xl">
                    <h3 class="text-on-surface-variant text-sm mb-1">Total Revenue</h3>
                    <p class="text-2xl font-bold text-primary">${formatCurrency(totalRevenue)}</p>
                </div>
                <div class="bg-surface-container p-4 rounded-xl">
                    <h3 class="text-on-surface-variant text-sm mb-1">Items Sold</h3>
                    <p class="text-2xl font-bold text-on-surface">${totalItemsSold}</p>
                </div>
            </div>
        `;
    }
    
    salesTableBody.innerHTML = sortedSales.map(sale => {
        const product = InventoryService.getProductById(sale.productId);
        const productName = product ? product.name : 'Unknown Product';
        
        return `
            <tr class="border-b border-surface-container-highest hover:bg-surface-container/50 transition-colors">
                <td class="px-6 py-4 text-on-surface">${formatDate(sale.timestamp)}</td>
                <td class="px-6 py-4 text-on-surface">${productName}</td>
                <td class="px-6 py-4 text-on-surface-variant">${sale.qty}</td>
                <td class="px-6 py-4 text-on-surface">Rs. ${sale.salePrice}</td>
                <td class="px-6 py-4 text-primary font-semibold">${formatCurrency(sale.totalAmount)}</td>
                <td class="px-6 py-4">
                    <button onclick="deleteSale('${sale.id}')" class="text-error hover:text-error-container transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function deleteSale(saleId) {
    if (!confirm('Are you sure you want to delete this sale? The stock will be restored.')) {
        return;
    }
    
    SalesService.deleteSale(saleId).then(result => {
        if (result.success) {
            renderSalesHistory();
            updateDailyInventory();
        } else {
            showToast(result.error || 'Failed to delete sale', 'error');
        }
    });
}

// Daily Inventory & Stock History Functions
function updateDailyInventory() {
    const dailyInventoryTableBody = document.getElementById('daily-inventory-table-body');
    if (!dailyInventoryTableBody) return;
    
    // Group sales by date
    const salesByDate = {};
    
    appState.sales.forEach(sale => {
        const saleDate = new Date(sale.timestamp || Date.now()).toISOString().split('T')[0];
        
        if (!salesByDate[saleDate]) {
            salesByDate[saleDate] = [];
        }
        salesByDate[saleDate].push(sale);
    });
    
    // Get all unique dates and sort them (newest first)
    const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Add today if no sales today but we have products
    const today = getTodayString();
    if (!sortedDates.includes(today) && appState.products.length > 0) {
        sortedDates.unshift(today);
    }
    
    if (sortedDates.length === 0) {
        dailyInventoryTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-on-surface-variant">
                    No inventory data available
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate daily inventory records
    const dailyRecords = sortedDates.map(date => {
        const salesOnDate = salesByDate[date] || [];
        
        // Calculate total sales value for the date
        const totalSalesValue = salesOnDate.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalItemsSold = salesOnDate.reduce((sum, sale) => sum + sale.qty, 0);
        
        // Get current stock levels for this date
        // For historical dates, we need to calculate what the stock was on that date
        let currentStockValue = 0;
        
        if (date === today) {
            // For today, use current stock values
            currentStockValue = appState.products.reduce((sum, product) => {
                const availableStock = InventoryService.getAvailableStock(product.id);
                return sum + (availableStock * product.purchasePrice);
            }, 0);
        } else {
            // For historical dates, calculate stock based on sales up to that date
            const dateTimestamp = new Date(date).setHours(23, 59, 59, 999);
            
            currentStockValue = appState.products.reduce((sum, product) => {
                // Get current stock
                const currentStock = product.qty || 0;
                
                // Count how many units were sold after this date
                const salesAfterDate = appState.sales.filter(sale => {
                    return sale.productId === product.id && 
                           (sale.timestamp || Date.now()) > dateTimestamp;
                });
                
                const unitsSoldAfterDate = salesAfterDate.reduce((sum, sale) => sum + sale.qty, 0);
                
                // Stock on that date = current stock + units sold after that date
                const stockOnDate = currentStock + unitsSoldAfterDate;
                
                return sum + (stockOnDate * product.purchasePrice);
            }, 0);
        }
        
        return {
            date: date,
            salesValue: totalSalesValue,
            itemsSold: totalItemsSold,
            stockValue: currentStockValue,
            totalValue: currentStockValue + totalSalesValue
        };
    });
    
    dailyInventoryTableBody.innerHTML = dailyRecords.map(record => `
        <tr class="border-b border-surface-container-highest hover:bg-surface-container/50 transition-colors">
            <td class="px-6 py-4 text-on-surface font-medium">${formatDate(new Date(record.date).getTime())}</td>
            <td class="px-6 py-4 text-primary font-semibold">${formatCurrency(record.salesValue)}</td>
            <td class="px-6 py-4 text-on-surface-variant">${record.itemsSold}</td>
            <td class="px-6 py-4 text-on-surface">${formatCurrency(record.stockValue)}</td>
            <td class="px-6 py-4 text-secondary font-bold">${formatCurrency(record.totalValue)}</td>
        </tr>
    `).join('');
}

// Reports Functions
function renderReports() {
    // Implement reports rendering
    console.log('Rendering reports...');
}

// Search and Filter
function handleSearch(query) {
    appState.searchQuery = query;
    renderPOS();
}

function handleCategoryFilter(category) {
    appState.selectedCategory = category;
    renderPOS();
}

// Auth Functions
function showLoginScreen() {
    const loginSection = document.getElementById('login-section');
    const mainApp = document.getElementById('main-app');
    
    if (loginSection) loginSection.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
}

function showMainApp() {
    const loginSection = document.getElementById('login-section');
    const mainApp = document.getElementById('main-app');
    
    if (loginSection) loginSection.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    // Initialize the first tab
    switchTab('pos');
}

async function handleLogin(email, password) {
    try {
        const result = await AuthService.signIn(email, password);
        
        if (result.success) {
            showToast('Login successful', 'success');
            showMainApp();
        } else {
            showToast(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('An error occurred during login', 'error');
    }
}

async function handleLogout() {
    try {
        await AuthService.signOut();
        showToast('Logged out successfully', 'success');
        showLoginScreen();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('An error occurred during logout', 'error');
    }
}

// Bundle Management
function handleBundleStockChange(productId, qtyChange) {
    const product = InventoryService.getProductById(productId);
    if (!product || !InventoryService.isBundle(product)) return;
    
    // Get all child products
    const children = InventoryService.getChildren(product);
    
    // Update bundle stock
    InventoryService.updateStock(productId, qtyChange);
    
    // Update child products proportionally
    children.forEach(child => {
        // Calculate the ratio based on the bundle composition
        // This assumes each child is used once per bundle
        InventoryService.updateStock(child.id, qtyChange);
    });
    
    showToast('Bundle stock updated', 'success');
}

// Sync Functions
async function syncWithGoogleSheets() {
    try {
        showToast('Syncing with Google Sheets...', 'info');
        await InventoryService.syncFromGoogleSheets();
        renderInventoryTable();
        renderPOS();
        showToast('Sync completed successfully', 'success');
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Failed to sync with Google Sheets', 'error');
    }
}

// Export Functions
function exportToExcel() {
    try {
        const worksheetData = appState.products.map(product => ({
            'Product Name': product.name,
            'Barcode': product.barcode || '',
            'Category': product.category || '',
            'Quantity': product.qty,
            'Sale Price': product.salePrice,
            'Purchase Price': product.purchasePrice,
            'Bundle': product.bundle || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
        
        XLSX.writeFile(workbook, `Inventory_${getTodayString()}.xlsx`);
        showToast('Inventory exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export inventory', 'error');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Wait a bit for services to load
    setTimeout(() => {
        initApp();
    }, 500);
});

// Make functions globally available
window.switchTab = switchTab;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQty = updateCartQty;
window.processCheckout = processCheckout;
window.handleSearch = handleSearch;
window.handleCategoryFilter = handleCategoryFilter;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.deleteSale = deleteSale;
window.syncWithGoogleSheets = syncWithGoogleSheets;
window.exportToExcel = exportToExcel;
window.handleBundleStockChange = handleBundleStockChange;

console.log('App.js loaded successfully');
