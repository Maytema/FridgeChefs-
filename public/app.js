import { initAnimations } from './animations.js';

class ChefZeroApp {
    constructor() {
        this.selectedProducts = new Set();
        this.currentRecipes = [];
        this.limits = {
            free: 3,
            used: 0,
            resetDate: null
        };
        this.deviceId = this.getDeviceId();
        this.init();
    }

    async init() {
        // Load limits
        this.loadLimits();
        
        // Initialize animations
        initAnimations();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load products for autocomplete
        await this.loadProducts();
        
        // Animate stats
        this.animateStats();
        
        // Register PWA
        this.registerServiceWorker();
    }

    getDeviceId() {
        let id = localStorage.getItem('chefzero_device_id');
        if (!id) {
            id = 'dev_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chefzero_device_id', id);
        }
        return id;
    }

    loadLimits() {
        const saved = localStorage.getItem('chefzero_limits');
        if (saved) {
            this.limits = JSON.parse(saved);
            // Check if week has passed
            const now = Date.now();
            if (this.limits.resetDate && now > this.limits.resetDate) {
                this.limits.used = 0;
                this.limits.resetDate = now + (7 * 24 * 60 * 60 * 1000);
            }
        } else {
            // First time - set reset date to a week from now
            this.limits.resetDate = Date.now() + (7 * 24 * 60 * 60 * 1000);
        }
        this.updateLimitsDisplay();
    }

    updateLimitsDisplay() {
        const remaining = this.limits.free - this.limits.used;
        document.getElementById('freeCount').textContent = remaining;
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.products = [];
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('productSearch');
        searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        searchInput.addEventListener('focus', () => this.showAutocomplete());
        searchInput.addEventListener('blur', () => setTimeout(() => this.hideAutocomplete(), 200));

        // AI Recipe button
        document.getElementById('aiRecipeBtn').addEventListener('click', () => this.generateAIRecipe());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Payment plans
        document.querySelectorAll('.select-plan').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectPlan(e.target.closest('.plan').dataset.plan));
        });
    }

    handleSearchInput(e) {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        const matches = this.products.filter(product => 
            product.name.toLowerCase().includes(query) ||
            product.searchTags.some(tag => tag.includes(query))
        ).slice(0, 8);

        this.showAutocomplete(matches);
    }

    showAutocomplete(items = []) {
        const container = document.getElementById('autocomplete');
        if (items.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="autocomplete-item" data-id="${item.id}">
                <span class="emoji">${item.emoji}</span>
                <span>${item.name}</span>
                <small>${item.category}</small>
            </div>
        `).join('');

        container.style.display = 'block';
        
        // Add click handlers
        container.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.addProduct({
                    id: e.currentTarget.dataset.id,
                    name: e.currentTarget.children[1].textContent,
                    emoji: e.currentTarget.children[0].textContent
                });
                document.getElementById('productSearch').value = '';
                this.hideAutocomplete();
            });
        });
    }

    hideAutocomplete() {
        document.getElementById('autocomplete').style.display = 'none';
    }

    addProduct(product) {
        if (this.selectedProducts.size >= 15) {
            this.showToast('Максимум 15 продуктов!', 'error');
            return;
        }

        const productKey = `${product.id}_${product.name}`;
        if (this.selectedProducts.has(productKey)) {
            this.showToast('Продукт уже добавлен!', 'warning');
            return;
        }

        this.selectedProducts.add(productKey);
        this.renderChips();
        this.searchRecipes();
    }

    renderChips() {
        const container = document.getElementById('productChips');
        const chips = Array.from(this.selectedProducts).map(key => {
            const [id, ...nameParts] = key.split('_');
            const name = nameParts.join('_');
            const emoji = this.products.find(p => p.id == id)?.emoji || '🍕';
            
            return `
                <div class="chip" data-key="${key}" draggable="true">
                    <span class="emoji">${emoji}</span>
                    <span class="name">${name}</span>
                    <button class="delete" aria-label="Удалить">×</button>
                </div>
            `;
        });

        container.innerHTML = chips.join('');
        document.getElementById('selectedCount').textContent = this.selectedProducts.size;

        // Add drag & drop
        this.setupDragAndDrop();
        
        // Add delete handlers
        container.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chip = e.target.closest('.chip');
                this.removeProduct(chip.dataset.key);
            });
        });
    }

    setupDragAndDrop() {
        const container = document.getElementById('productChips');
        let dragged = null;

        container.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('dragstart', (e) => {
                dragged = chip;
                setTimeout(() => chip.classList.add('dragging'), 0);
            });

            chip.addEventListener('dragend', () => {
                chip.classList.remove('dragging');
                dragged = null;
            });

            chip.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(container, e.clientX);
                if (afterElement == null) {
                    container.appendChild(dragged);
                } else {
                    container.insertBefore(dragged, afterElement);
                }
            });
        });
    }

    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.chip:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    removeProduct(key) {
        const chip = document.querySelector(`[data-key="${key}"]`);
        if (chip) {
            // Explode animation
            chip.style.animation = 'explode 0.5s forwards';
            setTimeout(() => {
                this.selectedProducts.delete(key);
                this.renderChips();
                this.searchRecipes();
            }, 300);
        }
    }

    async searchRecipes() {
        if (this.selectedProducts.size === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('aiRecipes').innerHTML = '';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        
        // Show regular recipes
        try {
            const response = await fetch('/api/recipes/find', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: Array.from(this.selectedProducts)
                })
            });
            
            this.currentRecipes = await response.json();
            this.renderRegularRecipes();
        } catch (error) {
            console.error('Failed to search recipes:', error);
        }
    }

    renderRegularRecipes() {
        const container = document.getElementById('regularRecipes');
        container.innerHTML = this.currentRecipes.slice(0, 6).map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                <div class="recipe-card-content">
                    <h3>${recipe.title}</h3>
                    <p>${recipe.description}</p>
                    <div class="recipe-meta">
                        <span>⏱️ ${recipe.time}</span>
                        <span>👥 ${recipe.portions}</span>
                        <span>${recipe.difficulty === 'просто' ? '🟢' : recipe.difficulty === 'средне' ? '🟡' : '🔴'} ${recipe.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => {
                const recipe = this.currentRecipes.find(r => r.id == card.dataset.id);
                this.showRecipe(recipe);
            });
        });
    }

    async generateAIRecipe() {
        // Check limits
        if (this.limits.used >= this.limits.free) {
            this.showPaymentModal();
            return;
        }

        if (this.selectedProducts.size === 0) {
            this.showToast('Добавьте хотя бы один продукт!', 'warning');
            return;
        }

        // Show progress
        this.showProgressBar();

        try {
            const products = Array.from(this.selectedProducts).map(key => {
                const [_, ...nameParts] = key.split('_');
                return nameParts.join('_');
            });

            const response = await fetch('/api/ai/recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products })
            });

            if (!response.ok) throw new Error('AI request failed');

            const recipe = await response.json();
            
            // Update limits
            this.limits.used++;
            localStorage.setItem('chefzero_limits', JSON.stringify(this.limits));
            this.updateLimitsDisplay();
            
            // Show recipe
            this.hideProgressBar();
            this.showRecipe(recipe);
            
            // Add to AI recipes grid
            this.addAIRecipeCard(recipe);
            
        } catch (error) {
            console.error('Failed to generate AI recipe:', error);
            this.hideProgressBar();
            this.showToast('Ошибка генерации. Попробуйте снова.', 'error');
        }
    }

    addAIRecipeCard(recipe) {
        const container = document.getElementById('aiRecipes');
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.dataset.id = 'ai_' + Date.now();
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
            <div class="recipe-card-content">
                <h3>${recipe.title} <small>✨ ИИ</small></h3>
                <div class="recipe-meta">
                    <span>⏱️ ${recipe.time}</span>
                    <span>👥 ${recipe.portions}</span>
                    <span>${recipe.difficulty === 'просто' ? '🟢' : recipe.difficulty === 'средне' ? '🟡' : '🔴'} ${recipe.difficulty}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => this.showRecipe(recipe));
        container.insertBefore(card, container.firstChild);
        
        // Limit to 6 cards
        if (container.children.length > 6) {
            container.removeChild(container.lastChild);
        }
    }

    showRecipe(recipe) {
        document.getElementById('recipeTitle').textContent = recipe.title;
        document.getElementById('recipeImage').src = recipe.image;
        document.getElementById('recipeTime').textContent = `⏱️ ${recipe.time}`;
        document.getElementById('recipePortions').textContent = `👥 ${recipe.portions}`;
        document.getElementById('recipeDifficulty').textContent = 
            `${recipe.difficulty === 'просто' ? '🟢' : recipe.difficulty === 'средне' ? '🟡' : '🔴'} ${recipe.difficulty}`;
        
        document.getElementById('recipeIngredients').innerHTML = 
            recipe.ingredients.map(i => `<li>${i}</li>`).join('');
        
        document.getElementById('recipeSteps').innerHTML = 
            recipe.steps.map(s => `<li>${s}</li>`).join('');
        
        document.getElementById('recipeModal').classList.add('active');
        
        // 3D flip effect
        gsap.fromTo('.recipe-modal', 
            { rotationY: -90, opacity: 0 },
            { rotationY: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
        );
    }

    showPaymentModal() {
        document.getElementById('paymentModal').classList.add('active');
    }

    async selectPlan(plan) {
        try {
            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan,
                    deviceId: this.deviceId
                })
            });
            
            const payment = await response.json();
            
            // Show payment iframe
            const frame = document.getElementById('paymentFrame');
            frame.innerHTML = `
                <iframe src="${payment.paymentUrl}" 
                        style="width:100%; height:500px; border:none; border-radius:var(--radius)">
                </iframe>
            `;
            
            // Poll for payment status
            this.checkPaymentStatus(payment.id);
            
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast('Ошибка оплаты', 'error');
        }
    }

    async checkPaymentStatus(paymentId) {
        const check = async () => {
            try {
                const response = await fetch(`/api/payment/status/${paymentId}`);
                const status = await response.json();
                
                if (status.status === 'paid') {
                    // Success!
                    this.limits.free += status.addedCredits;
                    localStorage.setItem('chefzero_limits', JSON.stringify(this.limits));
                    this.updateLimitsDisplay();
                    
                    this.closeModals();
                    this.showConfetti();
                    this.showToast('Премиум активирован! 🎉', 'success');
                } else if (status.status === 'pending') {
                    setTimeout(check, 3000);
                }
            } catch (error) {
                console.error('Status check error:', error);
            }
        };
        
        setTimeout(check, 3000);
    }

    showProgressBar() {
        const container = document.getElementById('progressBar');
        const fill = container.querySelector('.progress-fill');
        
        container.style.display = 'flex';
        
        // Animate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) clearInterval(interval);
            fill.style.width = Math.min(progress, 95) + '%';
        }, 300);
        
        this.progressInterval = interval;
    }

    hideProgressBar() {
        const container = document.getElementById('progressBar');
        const fill = container.querySelector('.progress-fill');
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        fill.style.width = '100%';
        setTimeout(() => {
            container.style.display = 'none';
            fill.style.width = '0%';
        }, 500);
    }

    showConfetti() {
        if (window.confetti) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }

    showToast(message, type = 'info') {
        // Implement toast notification
        console.log(`[${type}] ${message}`);
    }

    switchTab(tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        document.getElementById('aiRecipes').style.display = tab === 'ai' ? 'grid' : 'none';
        document.getElementById('regularRecipes').style.display = tab === 'regular' ? 'grid' : 'none';
    }

    toggleTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('chefzero_theme', isDark ? 'light' : 'dark');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    animateStats() {
        document.querySelectorAll('.number').forEach(el => {
            const target = parseInt(el.dataset.count);
            let current = 0;
            const increment = target / 50;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    el.textContent = target;
                    clearInterval(timer);
                } else {
                    el.textContent = Math.floor(current);
                }
            }, 30);
        });
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed:', err));
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChefZeroApp();
    
    // Set theme from localStorage
    const savedTheme = localStorage.getItem('chefzero_theme') || 
                       (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
});
