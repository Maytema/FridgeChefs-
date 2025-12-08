import { initAnimations, createParticleBurst } from './animations.js';

class ChefZeroApp {
    constructor() {
        this.selectedProducts = new Set();
        this.currentRecipes = [];
        this.displayedRecipes = 3; // Показываем сначала 3 рецепта
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
        
        // Setup categories
        this.setupCategories();
        
        // Register PWA
        this.registerServiceWorker();
        
        // Handle mobile keyboard
        this.handleMobileKeyboard();
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
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            this.products = await response.json();
            console.log('📦 Загружено продуктов:', this.products.length);
        } catch (error) {
            console.error('Failed to load products:', error);
            this.products = [];
        }
    }

    setupCategories() {
        const categories = [...new Set(this.products.map(p => p.category))];
        
        // Основные категории (первые 5)
        const mainCategories = categories.slice(0, 5);
        
        // Дополнительные категории
        const moreCategories = categories.slice(5);
        
        // Заполняем дополнительные категории
        const moreContainer = document.getElementById('moreCategories');
        if (moreContainer && moreCategories.length > 0) {
            moreContainer.innerHTML = moreCategories.map(cat => `
                <button class="category-chip" data-category="${cat}">
                    ${this.getCategoryIcon(cat)} ${this.capitalizeFirst(cat)}
                </button>
            `).join('');
            
            // Добавляем обработчики
            moreContainer.querySelectorAll('.category-chip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.selectCategory(e.target.dataset.category);
                });
            });
        }
        
        // Обработчик кнопки "Ещё"
        document.getElementById('showMoreCategories').addEventListener('click', () => {
            moreContainer.style.display = moreContainer.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    getCategoryIcon(category) {
        const icons = {
            'овощи': '<i class="fas fa-carrot"></i>',
            'мясо': '<i class="fas fa-drumstick-bite"></i>',
            'молочные': '<i class="fas fa-cheese"></i>',
            'крупы': '<i class="fas fa-bread-slice"></i>',
            'фрукты': '<i class="fas fa-apple-alt"></i>',
            'специи': '<i class="fas fa-mortar-pestle"></i>',
            'рыба': '<i class="fas fa-fish"></i>',
            'напитки': '<i class="fas fa-wine-bottle"></i>',
            'выпечка': '<i class="fas fa-cookie-bite"></i>',
            'бакалея': '<i class="fas fa-shopping-basket"></i>'
        };
        return icons[category] || '<i class="fas fa-question"></i>';
    }

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    selectCategory(category) {
        // Находим продукты этой категории
        const categoryProducts = this.products.filter(p => p.category === category);
        
        // Добавляем первые 3 продукта из категории
        categoryProducts.slice(0, 3).forEach(product => {
            this.addProduct(product);
        });
        
        // Закрываем дополнительные категории
        document.getElementById('moreCategories').style.display = 'none';
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('productSearch');
        searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        searchInput.addEventListener('focus', () => {
            this.showAutocomplete();
            // Прокручиваем к поиску на мобильных
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
        searchInput.addEventListener('blur', () => setTimeout(() => this.hideAutocomplete(), 200));

        // Search button
        document.getElementById('searchRecipesBtn').addEventListener('click', () => this.searchRecipes());
        
        // AI Recipe button
        document.getElementById('aiRecipeBtn').addEventListener('click', () => this.generateAIRecipe());

        // Clear products button
        document.getElementById('clearProducts').addEventListener('click', () => this.clearProducts());

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => this.toggleSettings());
        document.querySelector('.close-settings').addEventListener('click', () => this.toggleSettings());

        // Theme switch
        document.getElementById('themeSwitch').addEventListener('change', (e) => this.toggleTheme(e.target.checked));

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMoreRecipes());

        // Category chips
        document.querySelectorAll('.category-chip[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCategory(e.currentTarget.dataset.category);
            });
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
                document.getElementById('settingsPanel').classList.remove('active');
            }
        });
    }

    handleMobileKeyboard() {
        // На мобильных устройствах предотвращаем скрытие контента клавиатурой
        if ('visualViewport' in window) {
            const visualViewport = window.visualViewport;
            const searchInput = document.getElementById('productSearch');
            
            visualViewport.addEventListener('resize', () => {
                if (document.activeElement === searchInput) {
                    // Прокручиваем так, чтобы поле ввода было видно
                    searchInput.scrollIntoView({ block: 'center' });
                }
            });
        }
    }

    handleSearchInput(e) {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 1) {
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
                ${this.getCategoryIcon(item.category)}
                <div style="flex: 1;">
                    <strong>${item.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.category}</div>
                </div>
                <span style="font-size: 1.2rem;">${item.emoji}</span>
            </div>
        `).join('');

        container.style.display = 'block';
        
        // Add click handlers
        container.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const product = this.products.find(p => p.id == e.currentTarget.dataset.id);
                if (product) {
                    this.addProduct(product);
                    document.getElementById('productSearch').value = '';
                    this.hideAutocomplete();
                    
                    // Фокусируемся обратно на поле для продолжения ввода
                    setTimeout(() => {
                        document.getElementById('productSearch').focus();
                    }, 100);
                }
            });
        });
    }

    hideAutocomplete() {
        const container = document.getElementById('autocomplete');
        container.style.display = 'none';
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
        
        // Показываем секцию с выбранными продуктами
        document.getElementById('selectedProductsSection').style.display = 'block';
        
        // Автоматически ищем рецепты если включена настройка
        const autoSearch = document.getElementById('autoSearchSwitch')?.checked;
        if (autoSearch !== false) {
            this.searchRecipes();
        }
    }

    renderChips() {
        const container = document.getElementById('productChips');
        const chips = Array.from(this.selectedProducts).map(key => {
            const [id, ...nameParts] = key.split('_');
            const name = nameParts.join('_');
            const product = this.products.find(p => p.id == id);
            const emoji = product?.emoji || '🍕';
            const icon = this.getCategoryIcon(product?.category || '');
            
            return `
                <div class="chip" data-key="${key}">
                    ${icon}
                    <span class="name">${name}</span>
                    <span class="emoji">${emoji}</span>
                </div>
            `;
        });

        container.innerHTML = chips.join('');
        document.getElementById('selectedCount').textContent = this.selectedProducts.size;

        // Add double tap to remove
        container.querySelectorAll('.chip').forEach(chip => {
            let tapCount = 0;
            let tapTimer;
            
            chip.addEventListener('click', () => {
                tapCount++;
                
                if (tapCount === 1) {
                    tapTimer = setTimeout(() => {
                        tapCount = 0;
                    }, 300);
                } else if (tapCount === 2) {
                    clearTimeout(tapTimer);
                    this.removeProduct(chip.dataset.key);
                    tapCount = 0;
                }
            });
        });
    }

    removeProduct(key) {
        const chip = document.querySelector(`[data-key="${key}"]`);
        if (chip) {
            // Анимация удаления
            gsap.to(chip, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    this.selectedProducts.delete(key);
                    this.renderChips();
                    this.searchRecipes();
                    
                    // Скрываем секцию если нет продуктов
                    if (this.selectedProducts.size === 0) {
                        document.getElementById('selectedProductsSection').style.display = 'none';
                    }
                }
            });
        }
    }

    clearProducts() {
        this.selectedProducts.clear();
        document.getElementById('selectedProductsSection').style.display = 'none';
        this.searchRecipes();
    }

    async searchRecipes() {
        const container = document.getElementById('recipesContainer');
        const emptyState = document.getElementById('emptyState');
        const loadMore = document.getElementById('loadMoreContainer');
        
        if (this.selectedProducts.size === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            loadMore.style.display = 'none';
            document.getElementById('resultsCount').textContent = '0';
            return;
        }

        emptyState.style.display = 'none';
        
        // Показываем загрузку
        container.innerHTML = `
            <div class="loading" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                <div class="spinner"></div>
                <p>Ищем рецепты...</p>
            </div>
        `;

        try {
            const products = Array.from(this.selectedProducts).map(key => {
                const [_, ...nameParts] = key.split('_');
                return nameParts.join('_');
            });

            const response = await fetch('/api/recipes/find', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products })
            });
            
            this.currentRecipes = await response.json();
            this.displayedRecipes = 3; // Сбрасываем счетчик
            this.renderRecipes();
            
        } catch (error) {
            console.error('Failed to search recipes:', error);
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--error);">
                    <p>Ошибка при поиске рецептов. Пожалуйста, попробуйте снова.</p>
                </div>
            `;
        }
    }

    renderRecipes() {
        const container = document.getElementById('recipesContainer');
        const loadMore = document.getElementById('loadMoreContainer');
        const recipesToShow = this.currentRecipes.slice(0, this.displayedRecipes);
        
        document.getElementById('resultsCount').textContent = this.currentRecipes.length;

        if (recipesToShow.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                    <p>Не найдено рецептов с этими продуктами. Попробуйте добавить больше продуктов.</p>
                </div>
            `;
            loadMore.style.display = 'none';
            return;
        }

        container.innerHTML = recipesToShow.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                <div class="recipe-content">
                    <h3>${recipe.title}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">${recipe.description}</p>
                    <div class="recipe-meta">
                        <span><i class="fas fa-clock"></i> ${recipe.time}</span>
                        <span><i class="fas fa-user"></i> ${recipe.portions} порции</span>
                        <span>${this.getDifficultyIcon(recipe.difficulty)} ${recipe.difficulty}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Показываем кнопку "Показать ещё" если есть больше рецептов
        if (this.currentRecipes.length > this.displayedRecipes) {
            loadMore.style.display = 'block';
        } else {
            loadMore.style.display = 'none';
        }

        // Add click handlers
        container.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => {
                const recipe = this.currentRecipes.find(r => r.id == card.dataset.id);
                this.showRecipe(recipe);
            });
        });
    }

    loadMoreRecipes() {
        this.displayedRecipes += 3;
        this.renderRecipes();
    }

    getDifficultyIcon(difficulty) {
        const icons = {
            'просто': '<i class="fas fa-smile" style="color: var(--success);"></i>',
            'средне': '<i class="fas fa-meh" style="color: var(--accent);"></i>',
            'сложно': '<i class="fas fa-frown" style="color: var(--error);"></i>'
        };
        return icons[difficulty] || '';
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
            
            // Show recipe
            this.hideProgressBar();
            this.showRecipe(recipe);
            
            // Add particle effect
            createParticleBurst(window.innerWidth / 2, window.innerHeight / 2);
            
        } catch (error) {
            console.error('Failed to generate AI recipe:', error);
            this.hideProgressBar();
            this.showToast('Ошибка генерации. Попробуйте снова.', 'error');
        }
    }

    showRecipe(recipe) {
        const modal = document.getElementById('recipeModal');
        const content = modal.querySelector('.recipe-modal-content');
        
        content.innerHTML = `
            <div class="recipe-header">
                <img src="${recipe.image}" alt="${recipe.title}" style="width:100%; border-radius: var(--radius); margin-bottom: 1rem;">
                <h2 style="margin-bottom: 0.5rem;">${recipe.title}</h2>
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <span style="background: var(--surface-2); padding: 0.5rem 1rem; border-radius: 50px;">
                        <i class="fas fa-clock"></i> ${recipe.time}
                    </span>
                    <span style="background: var(--surface-2); padding: 0.5rem 1rem; border-radius: 50px;">
                        <i class="fas fa-user"></i> ${recipe.portions} пор
