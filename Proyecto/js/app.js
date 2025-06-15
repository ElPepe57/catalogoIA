// ===== VARIABLES GLOBALES =====
let products = [];
let categoryDefinitions = {};
let cart = [];

// Elementos del DOM
const sectionsContainer = document.getElementById('product-sections-container');
const modal = document.getElementById('product-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('modal-close-btn');
const cartFab = document.getElementById('cart-fab');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartBtn = document.getElementById('cart-close-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');
const cartIncentive = document.getElementById('cart-incentive');
const searchInput = document.getElementById('search-input');

// ===== ZOOM INTELIGENTE (LÓGICA RESTAURADA DE LA VERSIÓN FUNCIONAL) =====
class SmartZoom {
    constructor(imageElement, zoomLevel = 2.5) {
        this.image = imageElement;
        this.zoomLevel = zoomLevel;
        this.container = null;
        this.lens = null;
        this.result = null;
        this.isActive = false;
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }
    
    init() {
        if (this.image.parentNode.classList.contains('image-zoom-container')) {
            return;
        }
        
        this.createContainer();
        this.createLens();
        this.createResult();
        this.attachEventListeners();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'image-zoom-container';
        
        this.image.parentNode.insertBefore(this.container, this.image);
        this.container.appendChild(this.image);
    }
    
    createLens() {
        this.lens = document.createElement('div');
        this.lens.className = 'zoom-lens';
        this.lens.style.pointerEvents = 'none';
        this.container.appendChild(this.lens);
    }
    
    createResult() {
        this.result = document.createElement('div');
        this.result.className = 'zoom-result';
        this.result.style.pointerEvents = 'none';
        
        if (this.isMobile) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'zoom-close';
            closeBtn.innerHTML = '×';
            closeBtn.style.pointerEvents = 'auto';
            closeBtn.addEventListener('click', () => this.deactivate());
            this.result.appendChild(closeBtn);
        }
        
        const modalContent = this.container.closest('.modal-content');
        if (modalContent) {
            modalContent.appendChild(this.result);
        } else {
            document.body.appendChild(this.result);
        }
    }
    
    // === LÓGICA DE EVENTOS RESTAURADA DE LA VERSIÓN FUNCIONAL ===
    attachEventListeners() {
        if (this.isMobile) {
            this.container.addEventListener('click', (e) => {
                if (e.target === this.image || e.target === this.container) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.isActive) {
                        this.deactivate();
                    } else {
                        this.activate(e);
                    }
                }
            });
            
            this.container.addEventListener('touchmove', (e) => {
                if (this.isActive) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    this.updateZoom(touch);
                }
            });
        } else {
            this.container.addEventListener('mouseenter', (e) => {
                if (this.isOverImage(e)) {
                    this.activate();
                }
            });
            
            this.container.addEventListener('mouseleave', () => {
                this.deactivate();
            });
            
            this.container.addEventListener('mousemove', (e) => {
                if (this.isOverImage(e)) {
                    if (!this.isActive) {
                        this.activate();
                    }
                    this.updateZoom(e);
                } else {
                    if (this.isActive) {
                        this.deactivate();
                    }
                }
            });
        }
        
        this.image.addEventListener('dragstart', (e) => e.preventDefault());
        this.image.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    isOverImage(e) {
        const imageRect = this.image.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        return x >= imageRect.left && 
               x <= imageRect.right && 
               y >= imageRect.top && 
               y <= imageRect.bottom;
    }
    
    activate(e = null) {
        this.isActive = true;
        this.lens.classList.add('active');
        this.result.classList.add('active');
        
        this.result.style.backgroundImage = `url('${this.image.src}')`;
        this.result.style.backgroundRepeat = 'no-repeat';
        
        const containerRect = this.container.getBoundingClientRect();
        const lensSize = Math.min(containerRect.width, containerRect.height) * 0.25;
        
        this.lens.style.width = lensSize + 'px';
        this.lens.style.height = lensSize + 'px';
        
        this.positionZoomResult();
        
        if (e) {
            this.updateZoom(e);
        }
    }
    
    positionZoomResult() {
        const containerRect = this.container.getBoundingClientRect();
        const modalContent = this.container.closest('.modal-content');
        
        if (modalContent) {
            const modalRect = modalContent.getBoundingClientRect();
            
            this.result.style.position = 'fixed';
            this.result.style.top = modalRect.top + 'px';
            this.result.style.left = (modalRect.right + 20) + 'px';
            this.result.style.width = containerRect.width + 'px';
            this.result.style.height = containerRect.height + 'px';
            this.result.style.zIndex = '9999';
            
            const resultRect = this.result.getBoundingClientRect();
            if (resultRect.right > window.innerWidth) {
                this.result.style.left = (modalRect.left - containerRect.width - 20) + 'px';
            }
        }
    }
    
    deactivate() {
        this.isActive = false;
        this.lens.classList.remove('active');
        this.result.classList.remove('active');
    }
    
    updateZoom(e) {
        if (!this.isActive) return;
        
        const pos = this.getCursorPos(e);
        this.updateLensPosition(pos.x, pos.y);
        this.updateResultBackground(pos.x, pos.y);
    }
    
    getCursorPos(e) {
        const rect = this.image.getBoundingClientRect();
        const x = (e.clientX || e.pageX) - rect.left;
        const y = (e.clientY || e.pageY) - rect.top;
        return { x, y };
    }
    
    updateLensPosition(x, y) {
        const imageRect = this.image.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        
        const relX = x;
        const relY = y;
        
        const lensWidth = this.lens.offsetWidth;
        const lensHeight = this.lens.offsetHeight;
        
        const maxX = containerRect.width - lensWidth;
        const maxY = containerRect.height - lensHeight;
        
        let lensX = Math.max(0, Math.min(relX - lensWidth / 2, maxX));
        let lensY = Math.max(0, Math.min(relY - lensHeight / 2, maxY));
        
        this.lens.style.left = lensX + 'px';
        this.lens.style.top = lensY + 'px';
    }
    
    updateResultBackground(x, y) {
        const imageRect = this.image.getBoundingClientRect();
        const resultRect = this.result.getBoundingClientRect();
        const lensWidth = this.lens.offsetWidth;
        const lensHeight = this.lens.offsetHeight;
        
        const zoomFactorX = resultRect.width / lensWidth;
        const zoomFactorY = resultRect.height / lensHeight;
        
        const bgWidth = imageRect.width * zoomFactorX;
        const bgHeight = imageRect.height * zoomFactorY;
        
        const bgPosX = -(x - lensWidth / 2) * zoomFactorX;
        const bgPosY = -(y - lensHeight / 2) * zoomFactorY;
        
        this.result.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        this.result.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }
    
    destroy() {
        if (this.result && this.result.parentNode) {
            this.result.parentNode.removeChild(this.result);
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.image, this.container);
            this.container.remove();
        }
    }
}

let activeZoomInstances = [];

// ===== CARGA DE DATOS =====
async function loadData() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        products = data.products;
        categoryDefinitions = data.categoryDefinitions;
        initializeApp();
    } catch (error) {
        console.error('Error cargando los datos:', error);
        sectionsContainer.innerHTML = '<div class="loading-message">Error al cargar los productos. Por favor, recarga la página.</div>';
    }
}

// ===== INICIALIZACIÓN =====
function initializeApp() {
    renderContent();
    updateCart();
    setupEventListeners();
    setupModalEventListeners();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { 
        if (e.target === modal) closeModal(); 
    });
    
    cartFab.addEventListener('click', () => cartSidebar.classList.add('active'));
    closeCartBtn.addEventListener('click', () => cartSidebar.classList.remove('active'));
    cartItemsContainer.addEventListener('click', handleCartItemClick);
    checkoutBtn.addEventListener('click', handleCheckout);
    
    sectionsContainer.addEventListener('click', handleProductClick);
}

// ===== MANEJADORES DE EVENTOS =====
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.brand.toLowerCase().includes(searchTerm) || 
        (p.tags && p.tags.join(' ').toLowerCase().includes(searchTerm)) || 
        p.variants.some(v => v.name.toLowerCase().includes(searchTerm))
    );
    renderContent(filtered);
}

function handleProductClick(e) {
    if (e.target.matches('.btn-details')) {
        openModal(parseInt(e.target.dataset.productId));
    }
}

function handleCartItemClick(e) {
    if (e.target.matches('.cart-item-remove')) {
        removeFromCart(parseInt(e.target.dataset.variantId));
    }
}

function handleCheckout(e) {
    e.preventDefault();
    if (cart.length > 0) {
        window.open(`https://wa.me/51912907338?text=${generateWhatsAppMessage()}`, '_blank');
    } else {
        alert('Tu carrito está vacío.');
    }
}

function setupModalEventListeners() {
    modalBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('filter-btn')) {
            e.stopPropagation();
            handleFilterClick(e.target);
            return;
        }
        
        if (e.target.matches('[data-action="increase"]')) {
            e.stopPropagation();
            const form = e.target.closest('.add-to-cart-form');
            const quantityInput = form.querySelector('.quantity-input');
            let quantity = parseInt(quantityInput.value) || 1;
            quantityInput.value = quantity + 1;
            return;
        }
        
        if (e.target.matches('[data-action="decrease"]')) {
            e.stopPropagation();
            const form = e.target.closest('.add-to-cart-form');
            const quantityInput = form.querySelector('.quantity-input');
            let quantity = parseInt(quantityInput.value) || 1;
            if (quantity > 1) {
                quantityInput.value = quantity - 1;
            }
            return;
        }
        
        if (e.target.classList.contains('btn-add-to-cart')) {
            e.stopPropagation();
            const form = e.target.closest('.add-to-cart-form');
            const variantId = parseInt(form.dataset.variantId);
            const quantityInput = form.querySelector('.quantity-input');
            const quantity = parseInt(quantityInput.value) || 1;
            if (quantity > 0) {
                addToCart(variantId, quantity);
            }
            return;
        }
        
        if (e.target.classList.contains('carousel-btn') || e.target.classList.contains('carousel-dot')) {
            e.stopPropagation();
            return;
        }
    });
    
    modalBody.addEventListener('input', function(e) {
        if (e.target.classList.contains('quantity-input')) {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) {
                e.target.value = 1;
            }
        }
    });
}

function handleFilterClick(button) {
    if (button.classList.contains('disabled')) {
        return;
    }
    
    const group = button.closest('.filter-options');
    group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    const filterType = group.dataset.filter;
    if (filterType === 'presentation') {
        resetDependentFilters();
        setFirstAvailableOption(button.dataset.value);
    }
    
    const currentProductId = parseInt(modalBody.dataset.currentProductId);
    setTimeout(() => {
        updateModalWithFilters(currentProductId);
    }, 10);
}

function resetDependentFilters() {
    document.querySelectorAll('[data-filter="dosage"] .filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('[data-filter="quantity"] .filter-btn').forEach(btn => btn.classList.remove('active'));
}

function setFirstAvailableOption(selectedPresentation) {
    const currentProductId = parseInt(modalBody.dataset.currentProductId);
    const product = products.find(p => p.id === currentProductId);
    
    const availableDosages = [...new Set(
        product.variants
            .filter(v => v.presentation === selectedPresentation)
            .map(v => v.dosage)
    )];
    
    if (availableDosages.length > 0) {
        const firstDosageBtn = document.querySelector(`[data-filter="dosage"] [data-value="${availableDosages[0]}"]`);
        if (firstDosageBtn) {
            firstDosageBtn.classList.add('active');
            
            const availableQuantities = [...new Set(
                product.variants
                    .filter(v => v.presentation === selectedPresentation && v.dosage === availableDosages[0])
                    .map(v => v.quantity)
            )];
            
            if (availableQuantities.length > 0) {
                const firstQuantityBtn = document.querySelector(`[data-filter="quantity"] [data-value="${availableQuantities[0]} unidades"]`);
                if (firstQuantityBtn) {
                    firstQuantityBtn.classList.add('active');
                }
            }
        }
    }
}

// ===== FUNCIONES DE RENDERIZADO =====
function renderContent(filteredProducts = products) {
    sectionsContainer.innerHTML = '';
    
    if (searchInput.value.trim() !== '') {
        renderSearchResults(filteredProducts);
    } else {
        renderCategorySections();
    }
}

function renderSearchResults(filteredProducts) {
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `<p class="no-results-message" style="display: block;">No se encontraron productos.</p>`;
    } else {
        filteredProducts.forEach(product => grid.appendChild(createProductCard(product)));
    }
    
    sectionsContainer.appendChild(grid);
}

function renderCategorySections() {
    for (const categoryKey in categoryDefinitions) {
        const categoryProducts = products.filter(p => p.category === categoryKey);
        if (categoryProducts.length === 0) continue;
        
        const section = document.createElement('section');
        section.className = 'category-section';
        section.innerHTML = `
            <div class="category-header">
                <h2 class="category-title">${categoryDefinitions[categoryKey].title}</h2>
                <p class="category-description">${categoryDefinitions[categoryKey].description}</p>
            </div>
        `;
        
        const grid = document.createElement('div');
        grid.className = 'products-grid';
        categoryProducts.forEach(product => grid.appendChild(createProductCard(product)));
        section.appendChild(grid);
        sectionsContainer.appendChild(section);
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const lowestPrice = Math.min(...product.variants.flatMap(v => v.pricingTiers.map(t => parseFloat(t.price))));

    const tagsHTML = product.tags ? product.tags.slice(0, 3).map(tag => 
        `<span class="product-tag">${tag}</span>`
    ).join('') : '';

    card.innerHTML = `
        <div class="product-image-container">
            <img src="${product.variants[0].images[0]}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-content">
            <div class="product-tags">${tagsHTML}</div>
            <p class="product-brand">${product.brand}</p>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-short-description">${product.shortDescription || ''}</p>
            <div class="product-footer-card">
                <div class="price-info">
                    <p class="price-label">Desde</p>
                    <span class="price">S/ ${lowestPrice.toFixed(2)}</span>
                </div>
                <button class="btn-details" data-product-id="${product.id}">Ver Opciones</button>
            </div>
        </div>
    `;
    return card;
}

// ===== FUNCIONES DEL MODAL =====
function openModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    modalBody.dataset.currentProductId = productId;
    
    const presentations = [...new Set(product.variants.map(v => v.presentation))];
    const dosages = [...new Set(product.variants.map(v => v.dosage))];
    const quantities = [...new Set(product.variants.map(v => v.quantity))];
    
    modalBody.innerHTML = createModalContent(product, presentations, dosages, quantities);
    
    initializeFilters(productId);
    modal.classList.add('active');
}

function createModalContent(product, presentations, dosages, quantities) {
    return `
        <div class="modal-content">
            <div class="modal-image" id="modal-product-image-container"></div>
            <div class="modal-info">
                <h2 class="modal-title">${product.name}</h2>
                <p class="modal-brand">${product.brand}</p>
                <div class="variant-filters" id="modal-variant-filters">
                    ${createFilterSections(presentations, dosages, quantities)}
                </div>
                <div id="modal-variant-details"></div>
            </div>
        </div>
    `;
}

function createFilterSections(presentations, dosages, quantities) {
    let html = '';
    
    if (presentations.length > 1) {
        html += createFilterSection('presentation', 'Presentación', presentations);
    }
    if (dosages.length > 1) {
        html += createFilterSection('dosage', 'Dosificación', dosages);
    }
    if (quantities.length > 1) {
        html += createFilterSection('quantity', 'Cantidad', quantities, ' unidades');
    }
    
    return html;
}

function createFilterSection(filterType, label, options, suffix = '') {
    return `
        <div class="filter-section">
            <label class="filter-label">${label}:</label>
            <div class="filter-options" data-filter="${filterType}">
                ${options.map(option => `<button class="filter-btn" data-value="${option}">${option}${suffix}</button>`).join('')}
            </div>
        </div>
    `;
}

function closeModal() {
    cleanupZoomInstances();
    modal.classList.remove('active');
}

function initializeFilters(productId) {
    const product = products.find(p => p.id === productId);
    const firstVariant = product.variants[0];
    
    document.querySelectorAll('.filter-options').forEach(group => {
        const filterType = group.dataset.filter;
        const targetValue = firstVariant[filterType];
        const targetBtn = group.querySelector(`[data-value="${targetValue}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    });
    
    updateModalWithFilters(productId);
}

function updateModalWithFilters(productId) {
    const product = products.find(p => p.id === productId);
    
    const selectedFilters = getSelectedFilters();
    updateFilterButtonStates(product, selectedFilters);
    
    const matchingVariant = findMatchingVariant(product, selectedFilters);
    
    if (matchingVariant) {
        updateModalVariantDetails(matchingVariant);
    }
}

function getSelectedFilters() {
    const selectedFilters = {};
    document.querySelectorAll('.filter-options').forEach(group => {
        const filterType = group.dataset.filter;
        const activeBtn = group.querySelector('.filter-btn.active');
        if (activeBtn) {
            selectedFilters[filterType] = activeBtn.dataset.value;
        }
    });
    return selectedFilters;
}

function findMatchingVariant(product, selectedFilters) {
    return product.variants.find(variant => {
        if (selectedFilters.presentation && variant.presentation !== selectedFilters.presentation) {
            return false;
        }
        if (selectedFilters.dosage && variant.dosage !== selectedFilters.dosage) {
            return false;
        }
        if (selectedFilters.quantity) {
            const cleanQuantity = selectedFilters.quantity.replace(' unidades', '');
            if (variant.quantity !== cleanQuantity) {
                return false;
            }
        }
        return true;
    });
}

function updateFilterButtonStates(product, selectedFilters) {
    document.querySelectorAll('.filter-options').forEach(group => {
        const filterType = group.dataset.filter;
        const buttons = group.querySelectorAll('.filter-btn');
        
        buttons.forEach(button => {
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            
            const buttonValue = button.dataset.value;
            let hasVariant = checkVariantAvailability(product, filterType, buttonValue, selectedFilters);
            
            if (!hasVariant) {
                button.classList.add('disabled');
                button.style.pointerEvents = 'none';
            }
        });
    });
}

function checkVariantAvailability(product, filterType, buttonValue, selectedFilters) {
    if (filterType === 'presentation') {
        return product.variants.some(v => v.presentation === buttonValue);
    } 
    else if (filterType === 'dosage') {
        if (selectedFilters.presentation) {
            return product.variants.some(v => 
                v.presentation === selectedFilters.presentation && v.dosage === buttonValue
            );
        } else {
            return product.variants.some(v => v.dosage === buttonValue);
        }
    }
    else if (filterType === 'quantity') {
        const cleanButtonValue = buttonValue.replace(' unidades', '');
        if (selectedFilters.presentation && selectedFilters.dosage) {
            return product.variants.some(v => 
                v.presentation === selectedFilters.presentation && 
                v.dosage === selectedFilters.dosage && 
                v.quantity === cleanButtonValue
            );
        } else if (selectedFilters.presentation) {
            return product.variants.some(v => 
                v.presentation === selectedFilters.presentation && 
                v.quantity === cleanButtonValue
            );
        } else if (selectedFilters.dosage) {
            return product.variants.some(v => 
                v.dosage === selectedFilters.dosage && 
                v.quantity === cleanButtonValue
            );
        } else {
            return product.variants.some(v => v.quantity === cleanButtonValue);
        }
    }
    return false;
}

function updateModalVariantDetails(variant) {
    if (!variant) return;

    updateModalImage(variant);
    updateVariantInfo(variant);
}

function updateModalImage(variant) {
    const imageContainer = document.getElementById('modal-product-image-container');
    let contentHTML = '';

    if (variant.images && variant.images.length > 0) {
        if (variant.images.length > 1) {
            contentHTML = createCarouselHTML(variant.images);
        } else {
            contentHTML = `
                <div class="single-image-container">
                    <img src="${variant.images[0]}" alt="Imagen del producto" class="modal-main-image">
                </div>
            `;
        }
    }
    
    imageContainer.innerHTML = contentHTML;
    
    if (variant.images && variant.images.length > 1) {
        setupCarousel(imageContainer);
    }
    
    setTimeout(() => {
        initializeZoom();
    }, 100);
}


function createCarouselHTML(images) {
    const slides = images.map((src, i) => `<div class="carousel-slide ${i === 0 ? 'active' : ''}"><img src="${src}" alt="Imagen del producto"></div>`).join('');
    const dots = images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></span>`).join('');
    
    return `
        <div class="carousel-container">
            <div class="carousel-track">${slides}</div>
            <button class="carousel-btn prev">&lt;</button>
            <button class="carousel-btn next">&gt;</button>
            <div class="carousel-dots">${dots}</div>
        </div>
    `;
}

function updateVariantInfo(variant) {
    const detailsContainer = document.getElementById('modal-variant-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="variant-details">
                <div class="variant-info">
                    <h4 class="variant-name">${variant.name}</h4>
                    <div class="variant-specs">
                        <div class="spec-item">
                            <div class="spec-label">Presentación</div>
                            <div class="spec-value">${variant.presentation}</div>
                        </div>
                        <div class="spec-item">
                            <div class="spec-label">Dosificación</div>
                            <div class="spec-value">${variant.dosage}</div>
                        </div>
                        <div class="spec-item">
                            <div class="spec-label">Cantidad</div>
                            <div class="spec-value">${variant.quantity}</div>
                        </div>
                    </div>
                </div>
                <table class="pricing-table-modal">
                    <thead>
                        <tr><th>Condición de Compra</th><th>Precio Unitario</th></tr>
                    </thead>
                    <tbody>
                        ${variant.pricingTiers.map(tier => 
                            `<tr><th>${tier.tierName}</th><td class="price-value">S/ ${tier.price}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
            </div>
            <div class="add-to-cart-form" data-variant-id="${variant.variantId}">
                <div class="quantity-control">
                    <button class="quantity-btn-modal" data-action="decrease">-</button>
                    <input type="number" class="quantity-input" value="1" min="1">
                    <button class="quantity-btn-modal" data-action="increase">+</button>
                </div>
                <button class="btn-add-to-cart">Añadir al Carrito</button>
            </div>
        `;
    }
}

function setupCarousel(container) {
    const track = container.querySelector('.carousel-track');
    if (!track) return;
    
    const slides = Array.from(track.children);
    if (slides.length <= 1) return;

    const nextButton = container.querySelector('.carousel-btn.next');
    const prevButton = container.querySelector('.carousel-btn.prev');
    const dotsNav = container.querySelector('.carousel-dots');
    const dots = dotsNav ? Array.from(dotsNav.children) : [];
    let currentIndex = 0;

    const moveToSlide = (targetIndex) => {
        const slideWidth = slides[0].getBoundingClientRect().width;
        track.style.transform = 'translateX(-' + slideWidth * targetIndex + 'px)';
        
        slides.forEach((slide, index) => slide.classList.toggle('active', index === targetIndex));
        dots.forEach((dot, index) => dot.classList.toggle('active', index === targetIndex));
        
        currentIndex = targetIndex;
        
        setTimeout(() => {
            initializeZoom();
        }, 300);
    };

    nextButton.addEventListener('click', (e) => {
        e.stopPropagation();
        moveToSlide((currentIndex + 1) % slides.length);
    });
    
    prevButton.addEventListener('click', (e) => {
        e.stopPropagation();
        moveToSlide((currentIndex - 1 + slides.length) % slides.length);
    });
    
    if (dotsNav) {
        dotsNav.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetDot = e.target.closest('span.carousel-dot');
            if (targetDot) moveToSlide(parseInt(targetDot.dataset.slide));
        });
    }
}

function initializeZoom() {
    cleanupZoomInstances();
    
    const imageContainer = document.getElementById('modal-product-image-container');
    const activeImage = imageContainer.querySelector('.carousel-slide.active img, .single-image-container img');

    if (activeImage) {
        if (activeImage.complete) {
            createZoomInstance(activeImage);
        } else {
            activeImage.addEventListener('load', () => createZoomInstance(activeImage), { once: true });
        }
    }
}

function createZoomInstance(img) {
    try {
        if (!img.closest('.image-zoom-container')) {
            const zoom = new SmartZoom(img, 2.5);
            activeZoomInstances.push(zoom);
        }
    } catch (error) {
        console.log('Error creating zoom:', error);
    }
}

function cleanupZoomInstances() {
    activeZoomInstances.forEach(zoom => {
        try {
            zoom.destroy();
        } catch (error) {
            // Silently fail if destroy has issues.
        }
    });
    activeZoomInstances = [];

    // Adicionalmente, se asegura de que cualquier residuo del DOM sea eliminado.
    const strayResults = document.querySelectorAll('.zoom-result');
    strayResults.forEach(el => el.remove());
}

function getApplicableTier(productVariant, totalCartQty) {
    let applicableTier = productVariant.pricingTiers[0];
    for (const tier of productVariant.pricingTiers) {
        if (totalCartQty >= tier.minQty) {
            applicableTier = tier;
        } else {
            break;
        }
    }
    return applicableTier;
}

function addToCart(variantId, quantity) {
    const existingItem = cart.find(item => item.variantId === variantId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        let product, variant;
        for (const p of products) {
            const v = p.variants.find(v => v.variantId === variantId);
            if (v) {
                product = p;
                variant = v;
                break;
            }
        }
        if (product && variant) {
            cart.push({
                variantId,
                productId: product.id,
                name: `${product.name} (${variant.name})`,
                quantity,
                image: variant.images[0]
            });
        }
    }
    updateCart();
    closeModal();
    cartSidebar.classList.add('active');
}

function removeFromCart(variantId) {
    cart = cart.filter(item => item.variantId !== variantId);
    updateCart();
}

function updateCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
        cartIncentive.style.display = 'none';
    } else {
        updateCartIncentive(totalCartQty);
        
        cart.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const variant = product.variants.find(v => v.variantId === item.variantId);
            const applicableTier = getApplicableTier(variant, totalCartQty);
            const currentPrice = parseFloat(applicableTier.price);
            total += currentPrice * item.quantity;
            
            const itemEl = createCartItemElement(item, currentPrice, applicableTier);
            cartItemsContainer.appendChild(itemEl);
        });
    }
    
    cartBadge.textContent = totalCartQty;
    cartTotalPrice.textContent = `S/ ${total.toFixed(2)}`;
}

function updateCartIncentive(totalCartQty) {
    let nextTier = null;
    const allTiers = [...new Set(products.flatMap(p => p.variants.flatMap(v => v.pricingTiers.map(t => t.minQty))))].sort((a, b) => a - b).filter(t => t > 1);
    
    for (const minQty of allTiers) {
        if (totalCartQty < minQty) {
            nextTier = { minQty };
            break;
        }
    }
    
    if (nextTier) {
        const needed = nextTier.minQty - totalCartQty;
        cartIncentive.textContent = `¡Añade ${needed} más para un mejor precio!`;
        cartIncentive.style.display = 'block';
    } else {
        const highestTier = Math.max(...allTiers);
        if (totalCartQty >= highestTier && highestTier > 1) {
            cartIncentive.textContent = `¡Felicidades! Tienes el mejor precio.`;
            cartIncentive.style.display = 'block';
        } else {
            cartIncentive.style.display = 'none';
        }
    }
}

function createCartItemElement(item, currentPrice, applicableTier) {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
        <img src="${item.image}" class="cart-item-img" alt="${item.name}">
        <div class="cart-item-info">
            <p class="name">${item.name}</p>
            <p class="price">${item.quantity} x S/ ${currentPrice.toFixed(2)}</p>
            <p class="price-tier">${applicableTier.tierName}</p>
        </div>
        <button class="cart-item-remove" data-variant-id="${item.variantId}">&times;</button>
    `;
    return itemEl;
}

function generateWhatsAppMessage() {
    let message = "Hola! Quisiera realizar el siguiente pedido:\n\n";
    let total = 0;
    const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const variant = product.variants.find(v => v.variantId === item.variantId);
        const applicableTier = getApplicableTier(variant, totalCartQty);
        const currentPrice = parseFloat(applicableTier.price);
        const subtotal = currentPrice * item.quantity;
        
        message += `*${item.name}*\n  - Cantidad: ${item.quantity}\n  - Precio Unitario: S/ ${currentPrice.toFixed(2)} (${applicableTier.tierName})\n  - Subtotal: S/ ${subtotal.toFixed(2)}\n\n`;
        total += subtotal;
    });
    
    message += `*TOTAL DEL PEDIDO: S/ ${total.toFixed(2)}*\n_(Total de unidades: ${totalCartQty})_`;
    return encodeURIComponent(message);
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
});
