class FridgeChefsApp {
    constructor() {
        this.selectedProducts = [];
        this.currentRecipes = [];
        this.allProducts = [];
        this.categories = {};
        this.fuse = null;
        this.aiUsage = this.loadAIUsage();
        this.phoneInput = null;
        this.currentShareRecipe = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadProducts();
            this.setupEventListeners();
            this.setupBurgerMenu();
            this.updateAIUsageDisplay();
            console.log('✅ FridgeChef инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    // Загрузка ИИ-использования
    loadAIUsage() {
        const today = new Date().toDateString();
        const stored = JSON.parse(localStorage.getItem('fridgechef_ai_usage') || '{}');
        
        if (stored.date !== today) {
            // Сброс на новый день
            return {
                date: today,
                count: 0,
                maxFree: 3
            };
        }
        
        return stored;
    }

    saveAIUsage() {
        localStorage.setItem('fridgechef_ai_usage', JSON.stringify(this.aiUsage));
    }

    canUseAI() {
        return this.aiUsage.count < this.aiUsage.maxFree;
    }

    useAI() {
        if (this.canUseAI()) {
            this.aiUsage.count++;
            this.saveAIUsage();
            this.updateAIUsageDisplay();
            return true;
        }
        return false;
    }

    updateAIUsageDisplay() {
        const remaining = this.aiUsage.maxFree - this.aiUsage.count;
        const badge = document.getElementById('ai-badge');
        const sidebarCount = document.getElementById('sidebar-ai-count');
        
        if (badge) {
            badge.textContent = remaining;
            badge.style.background = remaining > 0 ? '#F59E0B' : '#EF4444';
        }
        
        if (sidebarCount) {
            sidebarCount.textContent = `${remaining}/${this.aiUsage.maxFree}`;
            sidebarCount.style.color = remaining > 0 ? '#10B981' : '#EF4444';
        }
    }

    // Загрузка продуктов
    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.categories;
                this.allProducts = [];
                
                // Собираем все продукты
                Object.entries(data.categories).forEach(([categoryName, products]) => {
                    products.forEach(product => {
                        this.allProducts.push({
                            ...product,
                            category: categoryName
                        });
                    });
                });
                
                // Инициализация поиска
                this.initSearch();
                
                // Отображение категорий
                this.renderCategories();
                
                console.log(`✅ Загружено ${this.allProducts.length} продуктов`);
            }
        } catch (error) {
            console.error('Ошибка загрузки продуктов:', error);
            this.showToast('Не удалось загрузить продукты', 'error');
        }
    }

    initSearch() {
        this.fuse = new Fuse(this.allProducts, {
            keys: ['name'],
            threshold: 0.3,
            includeScore: true,
            distance: 100,
            minMatchCharLength: 1
        });
    }

    renderCategories() {
        const container = document.getElementById('categories-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(this.categories).forEach(([categoryName, products]) => {
            const categoryElement = this.createCategoryElement(categoryName, products);
            container.appendChild(categoryElement);
        });
        
        this.setupCategoryToggles();
    }

    createCategoryElement(name, products) {
        const div = document.createElement('div');
        div.className = 'category-card';
        div.innerHTML = `
            <div class="category-header">
                <div class="category-title">
                    <span class="category-emoji">${this.getCategoryEmoji(name)}</span>
                    ${name}
                </div>
                <div class="category-count">${products.length}</div>
                <i class="fas fa-chevron-down category-toggle"></i>
            </div>
            <div class="category-products">
                ${products.map(product => `
                    <div class="product-item ${this.isProductSelected(product.id) ? 'selected' : ''}" 
                         data-id="${product.id}">
                        <span class="product-emoji">${product.icon}</span>
                        <span class="product-name">${product.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
        return div;
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Базовые': '🧂',
            'Овощи': '🥦',
            'Молочные': '🥛',
            'Мясо и птица': '🍗',
            'Рыба и морепродукты': '🐟',
            'Крупы и макароны': '🍚',
            'Фрукты и ягоды': '🍎',
            'Соусы и специи': '🌶️',
            'Хлеб и выпечка': '🍞'
        };
        return emojiMap[category] || '📦';
    }

    setupCategoryToggles() {
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.product-item')) return;
                const category = header.closest('.category-card');
                category.classList.toggle('active');
            });
        });

        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleProduct(parseInt(item.dataset.id));
            });
        });
    }

    // Поиск
    setupEventListeners() {
        // Поиск
        const searchInput = document.getElementById('search');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length > 0) {
                this.handleSearch(searchInput.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                const results = document.getElementById('search-results');
                if (results) results.classList.remove('active');
            }
        });

        // Очистка выбранных
        document.getElementById('clear-selected')?.addEventListener('click', () => {
            this.clearSelectedProducts();
        });

        // Поиск рецептов
        document.getElementById('find-recipes')?.addEventListener('click', () => {
            this.findRecipes();
        });

        // ИИ-рецепт
        document.getElementById('ai-recipe-btn')?.addEventListener('click', () => {
            this.generateAIRecipe();
        });

        // Премиум
        document.getElementById('show-premium')?.addEventListener('click', () => {
            this.showPremiumModal();
        });

        document.getElementById('buy-premium')?.addEventListener('click', () => {
            this.processPayment();
        });

        // Отправка рецепта
        document.getElementById('send-recipe')?.addEventListener('click', () => {
            this.sendRecipe();
        });

        // Переключение категорий
        document.getElementById('toggle-categories')?.addEventListener('click', () => {
            this.toggleAllCategories();
        });

        // Модалки
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });

        // Выбор плана
        document.querySelectorAll('.plan-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.plan-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
            });
        });

        // Выбор метода отправки
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.method-card').forEach(c => {
                    c.classList.remove('active');
                });
                card.classList.add('active');
                
                const phoneContainer = document.getElementById('phone-container');
                if (card.dataset.method === 'whatsapp') {
                    phoneContainer.style.display = 'block';
                    if (!this.phoneInput) this.setupPhoneInput();
                } else {
                    phoneContainer.style.display = 'none';
                }
            });
        });
    }

    setupBurgerMenu() {
        const burgerBtn = document.getElementById('burger-menu');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const closeBtn = document.getElementById('sidebar-close');

        burgerBtn?.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        closeBtn?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }

    setupPhoneInput() {
        const phoneElement = document.getElementById('whatsapp-phone');
        if (phoneElement && !this.phoneInput) {
            this.phoneInput = window.intlTelInput(phoneElement, {
                initialCountry: "tj",
                separateDialCode: true,
                preferredCountries: ["tj", "ru", "kz", "uz", "kg"],
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
            });
        }
    }

    handleSearch(term) {
        const searchTerm = term.trim().toLowerCase();
        const resultsContainer = document.getElementById('search-results');
        
        if (!resultsContainer) return;
        
        if (searchTerm === '') {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('active');
            return;
        }

        if (!this.fuse) {
            resultsContainer.innerHTML = '<div class="search-result-item">Загрузка...</div>';
            resultsContainer.classList.add('active');
            return;
        }

        const results = this.fuse.search(searchTerm).slice(0, 8);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <i class="fas fa-search"></i>
                    <div class="result-name">Ничего не найдено</div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = results.map(result => {
                const product = result.item;
                return `
                    <div class="search-result-item ${this.isProductSelected(product.id) ? 'selected' : ''}" 
                         data-id="${product.id}">
                        <span class="result-emoji">${product.icon}</span>
                        <span class="result-name">${product.name}</span>
                        <span class="result-category">${product.category}</span>
                    </div>
                `;
            }).join('');
            
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.toggleProduct(parseInt(item.dataset.id));
                    document.getElementById('search').value = '';
                    resultsContainer.classList.remove('active');
                });
            });
        }
        
        resultsContainer.classList.add('active');
    }

    // Работа с выбранными продуктами
    toggleProduct(productId) {
        const product = this.allProducts.find(p => p.id === productId);
        if (!product) return;

        const existingIndex = this.selectedProducts.findIndex(p => p.id === productId);
        
        if (existingIndex >= 0) {
            this.selectedProducts.splice(existingIndex, 1);
        } else {
            this.selectedProducts.push({
                id: productId,
                name: product.name,
                icon: product.icon,
                category: product.category
            });
        }

        this.updateProductSelectionUI(productId);
        this.renderSelectedChips();
        this.updateSelectedSection();
    }

    isProductSelected(productId) {
        return this.selectedProducts.some(p => p.id === productId);
    }

    updateProductSelectionUI(productId) {
        // В поиске
        const searchItem = document.querySelector(`.search-result-item[data-id="${productId}"]`);
        if (searchItem) {
            searchItem.classList.toggle('selected', this.isProductSelected(productId));
        }

        // В категориях
        const categoryItem = document.querySelector(`.product-item[data-id="${productId}"]`);
        if (categoryItem) {
            categoryItem.classList.toggle('selected', this.isProductSelected(productId));
        }
    }

    renderSelectedChips() {
        const container = document.getElementById('chips-container');
        if (!container) return;
        
        container.innerHTML = this.selectedProducts.map(product => `
            <div class="chip" data-id="${product.id}">
                <span class="chip-emoji">${product.icon}</span>
                <span class="chip-name">${product.name}</span>
                <button class="chip-remove" onclick="app.removeProduct(${product.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    removeProduct(productId) {
        this.toggleProduct(productId);
    }

    updateSelectedSection() {
        const section = document.getElementById('selected-section');
        const countElement = document.getElementById('selected-count');
        const emptyState = document.getElementById('empty-state');
        
        if (section && countElement) {
            countElement.textContent = this.selectedProducts.length;
            
            if (this.selectedProducts.length > 0) {
                section.style.display = 'block';
                if (emptyState) emptyState.style.display = 'none';
            } else {
                section.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
            }
        }
    }

    clearSelectedProducts() {
        if (this.selectedProducts.length === 0) return;
        
        if (confirm(`Удалить все выбранные продукты (${this.selectedProducts.length})?`)) {
            // Снимаем выделение
            this.selectedProducts.forEach(product => {
                this.updateProductSelectionUI(product.id);
            });
            
            // Очищаем массив
            this.selectedProducts = [];
            
            // Обновляем UI
            this.renderSelectedChips();
            this.updateSelectedSection();
        }
    }

    // Поиск рецептов
    async findRecipes() {
        if (this.selectedProducts.length === 0) {
            this.showToast('Выберите хотя бы один продукт', 'warning');
            return;
        }

        const button = document.getElementById('find-recipes');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск...';
        button.disabled = true;

        try {
            const ingredients = this.selectedProducts.map(p => p.name);
            const response = await fetch('/api/find-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentRecipes = data.recipes;
                this.showRecipes(data.recipes);
                
                const resultsSection = document.getElementById('recipes-section');
                const resultsCount = document.getElementById('results-count');
                const resultsSubtitle = document.getElementById('results-subtitle');
                
                if (resultsSection) resultsSection.style.display = 'block';
                if (resultsCount) resultsCount.textContent = data.count;
                if (resultsSubtitle) resultsSubtitle.textContent = `По ${this.selectedProducts.length} ингредиентам`;
                
                this.showToast(`Найдено ${data.count} рецептов`, 'success');
                
                // Прокрутка к результатам
                resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                this.showToast(data.error || 'Ошибка поиска', 'error');
            }
        } catch (error) {
            console.error('Ошибка поиска рецептов:', error);
            this.showToast('Ошибка соединения', 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // Генерация ИИ-рецепта
    async generateAIRecipe() {
        if (this.selectedProducts.length === 0) {
            this.showToast('Выберите продукты для генерации рецепта', 'warning');
            return;
        }
        
        // Проверка лимита
        if (!this.canUseAI()) {
            this.showModal('limit-modal');
            return;
        }

        const button = document.getElementById('ai-recipe-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация...';
        button.disabled = true;

        try {
            const ingredients = this.selectedProducts.map(p => p.name);
            const response = await fetch('/api/generate-ai-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ingredients,
                    maxRecipes: 1
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Используем ИИ-рецепт
                this.useAI();
                
                // Добавляем рецепт
                this.currentRecipes = [...data.recipes, ...this.currentRecipes];
                this.showRecipes(this.currentRecipes);
                
                const resultsSection = document.getElementById('recipes-section');
                const resultsCount = document.getElementById('results-count');
                const resultsSubtitle = document.getElementById('results-subtitle');
                
                if (resultsSection) resultsSection.style.display = 'block';
                if (resultsCount) resultsCount.textContent = this.currentRecipes.length;
            
