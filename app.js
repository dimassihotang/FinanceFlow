// Data storage
let transactions = [];
let budgets = {};
let categoryChart, trendChart;
let currentPage = 1;
const itemsPerPage = 10;

// Load data from localStorage
function loadData() {
    try {
        const storedTransactions = localStorage.getItem('financeflow_transactions');
        const storedBudgets = localStorage.getItem('financeflow_budgets');

        transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
        budgets = storedBudgets ? JSON.parse(storedBudgets) : {};

        // Validate loaded data
        if (!Array.isArray(transactions)) transactions = [];
        if (typeof budgets !== 'object' || budgets === null) budgets = {};

    } catch (error) {
        console.error('Gagal memuat data:', error);
        transactions = [];
        budgets = {};
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('financeflow_transactions', JSON.stringify(transactions));
        localStorage.setItem('financeflow_budgets', JSON.stringify(budgets));
        localStorage.setItem('financeflow_last_save', new Date().toISOString());
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
        showNotification('Gagal menyimpan data!', 'error');
    }
}

// Theme management
function loadTheme() {
    try {
        const theme = localStorage.getItem('financeflow_theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeIcon').className = 'fas fa-sun';
        }
    } catch (error) {
        console.log('Theme preference not saved');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = document.getElementById('themeIcon');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
        try {
            localStorage.setItem('financeflow_theme', 'dark');
        } catch (error) {
            console.log('Cannot save theme preference');
        }
    } else {
        icon.className = 'fas fa-moon';
        try {
            localStorage.setItem('financeflow_theme', 'light');
        } catch (error) {
            console.log('Cannot save theme preference');
        }
    }
}

// Transaction management
document.getElementById('transactionForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const type = document.querySelector('input[name="type"]:checked')?.value;

    // Validation
    if (!description || description.length < 3) {
        showNotification('Deskripsi harus minimal 3 karakter!', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        showNotification('Jumlah harus lebih dari 0!', 'error');
        return;
    }

    if (!category) {
        showNotification('Pilih kategori terlebih dahulu!', 'error');
        return;
    }

    if (!type) {
        showNotification('Pilih jenis transaksi!', 'error');
        return;
    }

    const transaction = {
        id: Date.now(),
        description,
        amount,
        category,
        type,
        date: new Date().toISOString().split('T')[0]
    };

    transactions.unshift(transaction);
    saveData();
    updateDisplay();
    updateBudgetDisplay();
    updateCharts();

    // Reset form
    this.reset();

    showNotification('Transaksi berhasil ditambahkan!', 'success');
});

// Update display functions
function updateDisplay() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
    document.getElementById('balance').textContent = formatCurrency(balance);

    updateTransactionList();
}

function updateTransactionList() {
    const container = document.getElementById('transactionList');

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h4>Belum ada transaksi</h4>
                <p>Tambahkan transaksi pertama Anda untuk memulai pengelolaan keuangan!</p>
            </div>
        `;
        return;
    }

    const filteredTransactions = getFilteredTransactions();
    const paginatedTransactions = paginateTransactions(filteredTransactions);

    if (paginatedTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h4>Tidak ada transaksi yang sesuai</h4>
                <p>Coba ubah filter untuk melihat transaksi lainnya</p>
            </div>
        `;
        return;
    }

    container.innerHTML = paginatedTransactions.map(transaction => `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-info">
                <h4>${transaction.description}</h4>
                <p>${getCategoryName(transaction.category)} • ${formatDate(transaction.date)}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
                </div>
                <button onclick="editTransaction(${transaction.id})" class="btn btn-secondary" style="padding: 8px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTransaction(${transaction.id})" class="btn btn-danger" style="padding: 8px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    updatePagination(filteredTransactions.length);
}

function paginateTransactions(transactions) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return transactions.slice(startIndex, startIndex + itemsPerPage);
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = 'btn btn-secondary';
        pageBtn.style.padding = '8px 12px';
        if (i === currentPage) {
            pageBtn.className = 'btn btn-primary';
        }
        pageBtn.onclick = () => {
            currentPage = i;
            updateTransactionList();
        };
        pagination.appendChild(pageBtn);
    }

    const container = document.getElementById('transactionList');
    container.appendChild(pagination);
}

// Transaction actions
function deleteTransaction(id) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateDisplay();
        updateBudgetDisplay();
        updateCharts();
        showNotification('Transaksi berhasil dihapus!', 'success');
    }
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Fill form with transaction data
    document.getElementById('description').value = transaction.description;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;

    // Delete old transaction
    deleteTransaction(id);

    // Scroll to form
    document.getElementById('transactionForm').scrollIntoView({ behavior: 'smooth' });
}

// Budget management
function openBudgetModal() {
    document.getElementById('budgetModal').classList.add('show');
}

function closeBudgetModal() {
    document.getElementById('budgetModal').classList.remove('show');
    document.getElementById('budgetForm').reset();
}

function handleBudgetSubmit(event) {
    event.preventDefault();

    const category = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);

    if (!category || !amount) {
        showNotification('Mohon isi semua field!', 'error');
        return;
    }

    if (amount <= 0) {
        showNotification('Jumlah anggaran harus lebih dari 0!', 'error');
        return;
    }

    budgets[category] = amount;
    saveData();
    updateBudgetDisplay();
    closeBudgetModal();

    showNotification('Anggaran berhasil ditetapkan!', 'success');
}

function updateBudgetDisplay() {
    const container = document.getElementById('budgetList');
    const budgetEntries = Object.entries(budgets);

    if (budgetEntries.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-400); margin-top: 20px;">Belum ada anggaran yang ditetapkan</p>';
        return;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    container.innerHTML = budgetEntries.map(([category, budgetAmount]) => {
        const spent = transactions
            .filter(t => t.type === 'expense' &&
                t.category === category &&
                new Date(t.date).getMonth() === currentMonth &&
                new Date(t.date).getFullYear() === currentYear)
            .reduce((sum, t) => sum + t.amount, 0);

        const percentage = (spent / budgetAmount) * 100;
        const isOverBudget = percentage > 100;

        return `
            <div class="budget-item">
                <div class="budget-header">
                    <strong>${getCategoryName(category)}</strong>
                    <span>${formatCurrency(spent)} / ${formatCurrency(budgetAmount)}</span>
                </div>
                <div class="budget-progress">
                    <div class="budget-progress-bar ${isOverBudget ? 'over-budget' : ''}" 
                         style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--gray-500);">
                    <span>${percentage.toFixed(1)}% terpakai</span>
                    ${isOverBudget ? '<span style="color: var(--danger);">Melebihi anggaran!</span>' :
                `<span>Sisa: ${formatCurrency(budgetAmount - spent)}</span>`}
                </div>
            </div>
        `;
    }).join('');
}

// Filter functions
function getFilteredTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;
    const typeFilter = document.getElementById('filterType').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    return transactions.filter(transaction => {
        // Search filter
        if (searchTerm && !(
            transaction.description.toLowerCase().includes(searchTerm) ||
            getCategoryName(transaction.category).toLowerCase().includes(searchTerm)
        )) return false;

        // Other filters
        if (categoryFilter && transaction.category !== categoryFilter) return false;
        if (typeFilter && transaction.type !== typeFilter) return false;
        if (dateFrom && transaction.date < dateFrom) return false;
        if (dateTo && transaction.date > dateTo) return false;
        return true;
    });
}

function applyFilters() {
    currentPage = 1;
    updateTransactionList();
    showNotification('Filter diterapkan!', 'info');
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    currentPage = 1;
    updateTransactionList();
    showNotification('Filter direset!', 'info');
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', function () {
    currentPage = 1;
    updateTransactionList();
});

// Chart functions
function initializeCharts() {
    const ctx1 = document.getElementById('categoryChart').getContext('2d');
    const ctx2 = document.getElementById('trendChart').getContext('2d');

    categoryChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1', '#a855f7', '#10b981', '#ef4444', '#f59e0b',
                    '#06b6d4', '#8b5cf6', '#f97316', '#84cc16', '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });

    trendChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pendapatan',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true
            }, {
                label: 'Pengeluaran',
                data: [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    updateCharts();
}

function updateCharts() {
    updateCategoryChart();
    updateTrendChart();
}

function updateCategoryChart() {
    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryData = {};

    expenses.forEach(expense => {
        categoryData[expense.category] = (categoryData[expense.category] || 0) + expense.amount;
    });

    const labels = Object.keys(categoryData).map(cat => getCategoryName(cat));
    const data = Object.values(categoryData);

    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.update();
}

function updateTrendChart() {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const incomeData = last7Days.map(date => {
        return transactions
            .filter(t => t.type === 'income' && t.date === date)
            .reduce((sum, t) => sum + t.amount, 0);
    });

    const expenseData = last7Days.map(date => {
        return transactions
            .filter(t => t.type === 'expense' && t.date === date)
            .reduce((sum, t) => sum + t.amount, 0);
    });

    trendChart.data.labels = last7Days.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    });
    trendChart.data.datasets[0].data = incomeData;
    trendChart.data.datasets[1].data = expenseData;
    trendChart.update();
}

// Data management
function clearAllData() {
    if (confirm('Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.')) {
        transactions = [];
        budgets = {};
        saveData();
        updateDisplay();
        updateBudgetDisplay();
        updateCharts();
        showNotification('Semua data berhasil dihapus!', 'success');
    }
}

function exportData() {
    if (transactions.length === 0) {
        showNotification('Tidak ada data untuk diekspor!', 'error');
        return;
    }

    const csvContent = [
        'Tanggal,Deskripsi,Kategori,Tipe,Jumlah',
        ...transactions.map(t =>
            `${t.date},"${t.description}",${getCategoryName(t.category)},${t.type === 'income' ? 'Pendapatan' : 'Pengeluaran'},${t.amount}`
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeflow_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showNotification('Data berhasil diekspor!', 'success');
}

function backupData() {
    const backup = {
        transactions,
        budgets,
        date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Backup data berhasil dibuat!', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');

            if (!headers.includes('Tanggal') || !headers.includes('Jumlah')) {
                throw new Error('Format CSV tidak valid');
            }

            let importCount = 0;
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',');
                if (values.length >= 5) {
                    const transaction = {
                        id: Date.now() + i,
                        date: values[0],
                        description: values[1].replace(/"/g, ''),
                        category: getCategoryKeyByName(values[2]) || 'other',
                        type: values[3] === 'Pendapatan' ? 'income' : 'expense',
                        amount: parseFloat(values[4])
                    };

                    if (transaction.amount && transaction.description) {
                        transactions.unshift(transaction);
                        importCount++;
                    }
                }
            }

            saveData();
            updateDisplay();
            updateBudgetDisplay();
            updateCharts();

            showNotification(`${importCount} transaksi berhasil diimpor!`, 'success');
        } catch (error) {
            showNotification('Gagal mengimpor data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (!Array.isArray(backup.transactions)) throw new Error('Format backup tidak valid');

            if (confirm('Apakah Anda yakin ingin memulihkan data? Data saat ini akan diganti.')) {
                transactions = backup.transactions;
                budgets = backup.budgets || {};
                saveData();
                updateDisplay();
                updateBudgetDisplay();
                updateCharts();
                showNotification('Data berhasil dipulihkan!', 'success');
            }
        } catch (error) {
            showNotification('Gagal memulihkan data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Financial analysis
function showFinancialAnalysis() {
    const analysis = calculateFinancialAnalysis();
    const modalContent = `
        <div class="analysis-section">
            <h4><i class="fas fa-calendar-alt"></i> Ringkasan Bulan Ini</h4>
            <p>Total Pendapatan: <strong>${formatCurrency(analysis.monthlyIncome)}</strong></p>
            <p>Total Pengeluaran: <strong>${formatCurrency(analysis.monthlyExpense)}</strong></p>
            <p>Saldo: <strong style="color: ${analysis.monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">
                ${formatCurrency(analysis.monthlyBalance)}
            </strong></p>
        </div>
        
        <div class="analysis-section">
            <h4><i class="fas fa-tags"></i> Kategori Pengeluaran Terbesar</h4>
            ${analysis.topCategories.map((cat, index) => `
                <p>${index + 1}. ${cat.name}: <strong>${formatCurrency(cat.amount)}</strong></p>
            `).join('')}
        </div>
        
        <div class="analysis-section">
            <h4><i class="fas fa-chart-line"></i> Tren Bulan Ini</h4>
            <p>Rata-rata pengeluaran harian: <strong>${formatCurrency(analysis.avgDailyExpense)}</strong></p>
            <p>Pengeluaran tertinggi: <strong>${formatCurrency(analysis.highestExpense.amount)}</strong> 
               (${analysis.highestExpense.description})</p>
        </div>
    `;

    document.getElementById('analysisContent').innerHTML = modalContent;
    document.getElementById('analysisModal').classList.add('show');
}

function closeModal() {
    document.getElementById('analysisModal').classList.remove('show');
    document.getElementById('budgetModal').classList.remove('show');
}

function calculateFinancialAnalysis() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const categoryExpenses = {};
    monthlyTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
        });

    const topCategories = Object.entries(categoryExpenses)
        .map(([category, amount]) => ({
            name: getCategoryName(category),
            amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    // Calculate days passed in current month
    const now = new Date();
    const daysPassed = now.getDate();

    // Find highest expense
    const highestExpense = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((max, t) => t.amount > (max?.amount || 0) ? t : max, {});

    return {
        monthlyIncome,
        monthlyExpense,
        monthlyBalance: monthlyIncome - monthlyExpense,
        topCategories,
        avgDailyExpense: monthlyExpense / daysPassed,
        highestExpense: {
            amount: highestExpense.amount || 0,
            description: highestExpense.description || 'Tidak ada'
        }
    };
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getCategoryName(categoryKey) {
    const categories = {
        'food': '🍽️ Makanan & Minuman',
        'transportation': '🚗 Transportasi',
        'shopping': '🛍️ Belanja',
        'entertainment': '🎬 Hiburan',
        'bills': '📋 Tagihan & Utilitas',
        'healthcare': '🏥 Kesehatan',
        'education': '📚 Pendidikan',
        'salary': '💼 Gaji',
        'freelance': '💻 Freelance',
        'investment': '📈 Investasi',
        'other': '📦 Lainnya'
    };
    return categories[categoryKey] || categoryKey;
}

function getCategoryKeyByName(name) {
    const categories = {
        '🍽️ Makanan & Minuman': 'food',
        '🚗 Transportasi': 'transportation',
        '🛍️ Belanja': 'shopping',
        '🎬 Hiburan': 'entertainment',
        '📋 Tagihan & Utilitas': 'bills',
        '🏥 Kesehatan': 'healthcare',
        '📚 Pendidikan': 'education',
        '💼 Gaji': 'salary',
        '💻 Freelance': 'freelance',
        '📈 Investasi': 'investment',
        '📦 Lainnya': 'other'
    };
    return categories[name];
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check' : type === 'error' ? 'fa-times' : 'fa-info'}"></i>
        ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
    loadData();
    updateDisplay();
    updateBudgetDisplay();
    initializeCharts();

    // Setup search functionality
    document.getElementById('searchInput').addEventListener('input', function () {
        currentPage = 1;
        updateTransactionList();
    });
});