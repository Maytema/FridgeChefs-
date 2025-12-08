class ChefZeroApp {
    constructor() {
        this.selectedProducts = new Set();
        this.recipes = [];
        this.popularRecipes = [];
        this.categories = [];
        this.userLimits = { aiRemaining: 3, premium: false };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.restoreState();
        this.showToast('ChefZero готов к работе!', 'success');
    }

    async loadData() {
        try {
            const [productsRes, popularRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/recipes/popular')
            ]);
            
            const productsData = await productsRes.json();
            this.categories = productsData.categories || [];
            this.renderCategories(this.categories);
            
            this.popularRecipes = await popularRes.json();
            this.renderPopularRecipes(this.popularRecipes);
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showToast('Не удалось загрузить данные', 'error');
        }
    }

    setupEventListeners() {
        document.getElementById('product-search').addEventListener('input', (e) => 
            this.handleSearchInput(e.target.value));
        
        document.getElementById('find-recipes-btn').addEventListener('click', () => 
            this.findRecipes());
        
        document.getElementById('ai-recipe-btn').addEventListener('click', () => 
            this.generateAIRecipe());
        
        document.getElementById('premium-btn').addEventListener('click', () => 
            this.showPremiumModal());
        
        document.getElementById('toggle-categories').addEventListener('click', () => 
            this.toggleAllCategories());
        
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', () => this.closeAllModals());
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllModals();
        });
    }

    async handleSearchInput(query) {
        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }
        
        try {
            const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            this.showSearchResults(results);
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }

    addProduct(product) {
        if (this.selectedProducts.has(product.id)) return;
        
        this.selectedProducts.add(product.id);
        this.addProductChip(product);
        this.updateSelectedProductsCount();
        this.updateProductSelection(product.id, true);
        this.saveState();
        
        this.showToast(`${product.emoji} ${product.name} добавлен`, 'success');
    }

    removeProduct(productId) {
        this.selectedProducts.delete(productId);
        this.removeProductChip(productId);
        this.updateSelectedProductsCount();
        this.updateProductSelection(productId, false);
        this.saveState();
    }

    async findRecipes() {
        if (this.selectedProducts.size < 2) {
            this.showToast('Выберите минимум 2 продукта', 'warning');
            return;
        }
        
        try {
            const productsArray = Array.from(this.selectedProducts);
            const response = await fetch('/api/recipes/find', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products: productsArray })
            });
            
            this.recipes = await response.json();
            this.renderRecipes(this.recipes);
            document.getElementById('results-count').textContent = `${this.recipes.length} найдено`;
            
            if (this.recipes.length === 0) {
                this.showToast('Рецепты не найдены', 'warning');
            }
            
        } catch (error) {
            console.error('Ошибка поиска рецептов:', error);
            this.showToast('Ошибка поиска', 'error');
        }
    }

    async generateAIRecipe() {
        if (this.userLimits.aiRemaining <= 0 && !this.userLimits.premium) {
            this.showPremiumModal();
            return;
        }
        
        if (this.selectedProducts.size < 2) {
            this.showToast('Выберите минимум 2 продукта', 'warning');
            return;
        }
        
        try {
            const productsArray = Array.from(this.selectedProducts);
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    products: productsArray.map(id => ({ id })),
                    time: '30 минут',
                    difficulty: 'средняя',
                    servings: 4
                })
            });
            
            const recipe = await response.json();
            
            if (!this.userLimits.premium) {
                this.userLimits.aiRemaining--;
                this.updateLimits();
            }
            
            this.showRecipeModal(recipe);
            this.showConfetti();
            
        } catch (error) {
            console.error('Ошибка генерации рецепта:', error);
            this.showToast('ИИ временно недоступен', 'error');
        }
    }

    async handlePayment(plan) {
        const modal = document.getElementById('payment-modal');
        const loading = document.getElementById('payment-loading');
        const success = document.getElementById('payment-success');
        const error = document.getElementById('payment-error');
        
        this.showModal('payment-modal');
        
        try {
            const response = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan,
                    amount: plan === 'monthly' ? 299 : 99,
                    currency: 'RUB'
                })
            });
            
            const payment = await response.json();
            
            if (payment.invoice_url) {
                window.open(payment.invoice_url, '_blank');
                
                loading.style.display = 'none';
                success.style.display = 'block';
                
                setTimeout(() => {
                    this.userLimits.premium = true;
                    this.userLimits.aiRemaining = 999;
                    this.updateLimits();
                    this.closeAllModals();
                    this.showToast('Премиум доступ активирован!', 'success');
                }, 2000);
            }
            
        } catch (error) {
            console.error('Ошибка оплаты:', error);
            loading.style.display = 'none';
            error.style.display = 'block';
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-accordion');
        container.innerHTML = categories.map(category => `
            <div class="category-item">
                <div class="category-header">
                    <div class="category-title">
                        <span class="emoji">${category.emoji}</span>
                        <span>${category.name} (${category.products.length})</span>
                    </div>
                    <div class="category-arrow">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="category-content">
                    <div class="products-grid">
                        ${category.products.map(product => `
                            <label class="product-label" data-product-id="${product.id}">
                                <input type="checkbox" class="product-checkbox" value="${product.id}">
                                <span class="emoji">${product.emoji}</span>
                                <span>${product.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
        
        this.initProductCheckboxes();
    }

    initProductCheckboxes() {
        document.querySelectorAll('.product-label').forEach(label => {
            label.addEventListener('click', () => {
                const checkbox = label.querySelector('.product-checkbox');
                const productId = parseInt(label.dataset.productId);
                
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    label.classList.add('selected');
                    this.addProduct(this.findProductById(productId));
                } else {
                    checkbox.checked = false;
                    label.classList.remove('selected');
                    this.removeProduct(productId);
                }
            });
        });
    }

    updateProductSelection(productId, selected) {
        const label = document.querySelector(`[data-product-id="${productId}"]`);
        if (label) {
            label.classList.toggle('selected', selected);
            label.querySelector('.product-checkbox').checked = selected;
        }
    }

    addProductChip(product) {
        const container = document.getElementById('selected-chips');
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.dataset.productId = product.id;
        chip.innerHTML = `
            <span class="emoji">${product.emoji}</span>
            <span>${product.name}</span>
        `;
        
        chip.addEventListener('dblclick', () => this.removeProduct(product.id));
        
        container.appendChild(chip);
    }

    removeProductChip(productId) {
        const chip = document.querySelector(`.chip[data-product-id="${productId}"]`);
        if (chip) chip.remove();
    }

    updateSelectedProductsCount() {
        const count = this.selectedProducts.size;
        const emptyState = document.getElementById('empty-state');
        const resultsSection = document.getElementById('results-section');
        
        if (count > 0) {
            emptyState.style.display = 'none';
            resultsSection.style.display = 'block';
        } else {
            emptyState.style.display = 'block';
            resultsSection.style.display = 'none';
        }
    }

    showSearchResults(products) {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        container.innerHTML = products.map(product => `
            <div class="search-result-item" data-product-id="${product.id}">
                <span class="emoji">${product.emoji}</span>
                <span>${product.name}</span>
            </div>
        `).join('');
        
        container.style.display = 'block';
        
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = parseInt(item.dataset.productId);
                const product = this.findProductById(productId);
                if (product) {
                    this.addProduct(product);
                    container.style.display = 'none';
                    document.getElementById('product-search').value = '';
                }
            });
        });
    }

    hideSearchResults() {
        const container = document.getElementById('search-results');
        if (container) container.style.display = 'none';
    }

    renderRecipes(recipes) {
        const container = document.getElementById('recipes-grid');
        if (!container) return;
        
        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-recipe-id="${recipe.id}">
                <div class="recipe-image"></div>
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta">
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${recipe.time}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${recipe.portions} порц.</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.initRecipeCards();
    }

    renderPopularRecipes(recipes) {
        const container = document.getElementById('popular-recipes');
        if (!container) return;
        
        container.innerHTML = recipes.slice(0, 3).map(recipe => `
            <div class="recipe-card" data-recipe-id="${recipe.id}">
                <div class="recipe-image"></div>
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-meta">
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${recipe.time}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${recipe.portions} порц.</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.initRecipeCards();
    }

    initRecipeCards() {
        document.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => {
                const recipeId = parseInt(card.dataset.recipeId);
                const recipe = this.recipes.find(r => r.id === recipeId) || 
                              this.popularRecipes.find(r => r.id === recipeId);
                
                if (recipe) {
                    this.showRecipeModal(recipe);
                }
            });
        });
    }

    showRecipeModal(recipe) {
        const modalBody = document.getElementById('recipe-modal-body');
        
        modalBody.innerHTML = `
            <div class="recipe-detail">
                <div class="recipe-detail-header">
                    <h2 class="recipe-detail-title">${recipe.title}</h2>
                    <div class="recipe-detail-meta">
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>${recipe.time}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-chart-line"></i>
                            <span>${recipe.difficulty}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${recipe.portions} порций</span>
                        </div>
                    </div>
                </div>
                
                <div class="recipe-section">
                    <h4><i class="fas fa-shopping-basket"></i> Ингредиенты</h4>
                    <ul class="ingredients-list">
                        ${(recipe.ingredients || []).map(ing => `<li>${ing}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="recipe-section">
                    <h4><i class="fas fa-list-ol"></i> Приготовление</h4>
                    <ol class="steps-list">
                        ${(recipe.steps || []).map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>
                
                ${recipe.isAI ? `
                    <div class="ai-note">
                        <i class="fas fa-robot"></i> Рецепт создан искусственным интеллектом
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showModal('recipe-modal');
    }

    toggleAllCategories() {
        const categories = document.querySelectorAll('.category-item');
        const allOpen = Array.from(categories).every(cat => cat.classList.contains('active'));
        
        categories.forEach(category => {
            const content = category.querySelector('.category-content');
            
            if (allOpen) {
                category.classList.remove('active');
                content.style.maxHeight = null;
            } else {
                category.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
        
        const btn = document.getElementById('toggle-categories');
        btn.innerHTML = allOpen ? 
            '<span>Развернуть все</span><i class="fas fa-chevron-down"></i>' :
            '<span>Свернуть все</span><i class="fas fa-chevron-up"></i>';
    }

    updateLimits() {
        document.getElementById('ai-remaining').textContent = this.userLimits.aiRemaining;
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
        
        setTimeout(() => toast.remove(), 5000);
    }

    showConfetti() {
        // Простой confetti эффект
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: hsl(${Math.random() * 360}, 100%, 50%);
                top: -20px;
                left: ${Math.random() * 100}vw;
                border-radius: 50%;
                animation: fall ${Math.random() * 2 + 1}s linear forwards;
                z-index: 9999;
            `;
            
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    findProductById(id) {
        for (const category of this.categories) {
            const product = category.products.find(p => p.id === id);
            if (product) return product;
        }
        return null;
    }

    saveState() {
        localStorage.setItem('chefzero-selected', JSON.stringify(Array.from(this.selectedProducts)));
    }

    resto
