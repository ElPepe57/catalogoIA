// =================================================================
// INICIALIZACIÓN Y VARIABLES GLOBALES
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa el slider del hero tan pronto como el DOM esté listo.
    initializeHeroSlider(); 
    // Carga los datos de los productos.
    loadData();
});

let products = [];
let categoryDefinitions = {};
let cart = [];
let activeZoomInstances = [];

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

// =================================================================
// CARGA DE DATOS E INICIALIZACIÓN PRINCIPAL
// =================================================================
async function loadData() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        products = data.products;
        categoryDefinitions = data.categoryDefinitions;
        initializeApp();
    } catch (error) {
        console.error('Error cargando los datos:', error);
        sectionsContainer.innerHTML = '<div class="loading-message">Error al cargar los productos. Por favor, recarga la página.</div>';
    }
}

function initializeApp() {
    renderContent();
    updateCart();
    setupEventListeners();
    setupModalEventListeners();
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            optimizeGridLayout();
            // Reposicionar el zoom al cambiar tamaño de ventana
            activeZoomInstances.forEach(zoom => {
                if (zoom && typeof zoom.positionZoomResult === 'function') {
                    zoom.positionZoomResult();
                }
            });
        }, 150);
    });
}

// =================================================================
// MANEJO DE EVENTOS
// =================================================================
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

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

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
    const detailsButton = e.target.closest('.btn-details');
    if (detailsButton) {
        openModal(parseInt(detailsButton.dataset.productId));
    }
}

function handleCartItemClick(e) {
    const removeButton = e.target.closest('.cart-item-remove');
    if (removeButton) {
        removeFromCart(parseInt(removeButton.dataset.variantId));
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

// =================================================================
// RENDERIZADO DE CONTENIDO
// =================================================================
function renderContent(filteredProducts = products) {
    sectionsContainer.innerHTML = '';
    
    if (searchInput.value.trim() !== '') {
        renderSearchResults(filteredProducts);
    } else {
        renderCategorySections();
    }
    
    setTimeout(optimizeGridLayout, 50);
}

function renderSearchResults(filteredProducts) {
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = `<p class="no-results-message">No se encontraron productos.</p>`;
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
    const tagsHTML = product.tags ? product.tags.slice(0, 3).map(tag => `<span class="product-tag">${tag}</span>`).join('') : '';

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

function optimizeGridLayout() {
    const grids = document.querySelectorAll('.products-grid');
    grids.forEach(grid => {
        const productCount = grid.children.length;
        grid.classList.remove('single-product', 'two-products', 'three-products', 'many-products');
        
        if (productCount === 1) grid.classList.add('single-product');
        else if (productCount === 2) grid.classList.add('two-products');
        else if (productCount === 3) grid.classList.add('three-products');
        else grid.classList.add('many-products');
    });
}

// =================================================================
// FUNCIONALIDAD DEL HERO SLIDER
// =================================================================
let currentSlideIndex = 0;
let slides, indicators, totalSlides, slideInterval;

function initializeHeroSlider() {
    slides = document.querySelectorAll('.hero-slide');
    indicators = document.querySelectorAll('.hero-indicator');
    totalSlides = slides.length;

    if (totalSlides === 0) return;

    window.showSlide = function(index) {
        currentSlideIndex = (index + totalSlides) % totalSlides;
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));
        slides[currentSlideIndex].classList.add('active');
        indicators[currentSlideIndex].classList.add('active');
    };

    window.nextSlide = () => showSlide(currentSlideIndex + 1);
    window.previousSlide = () => showSlide(currentSlideIndex - 1);
    window.currentSlide = (index) => showSlide(index - 1);

    const startSlideShow = () => slideInterval = setInterval(nextSlide, 7000);
    const stopSlideShow = () => clearInterval(slideInterval);

    const heroSlider = document.getElementById('heroSlider');
    if (heroSlider) {
        heroSlider.addEventListener('mouseenter', stopSlideShow);
        heroSlider.addEventListener('mouseleave', startSlideShow);
    }

    startSlideShow();
}


// =================================================================
// FUNCIONALIDAD DEL MODAL
// =================================================================
function openModal(productId) {
    cleanupZoomInstances();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    modalBody.dataset.currentProductId = productId;
    
    const presentations = [...new Set(product.variants.map(v => v.presentation))];
    const dosages = [...new Set(product.variants.map(v => v.dosage))];
    const quantities = [...new Set(product.variants.map(v => v.quantity))];
    
    modalBody.innerHTML = `
        <div class="modal-content">
            <div class="modal-image" id="modal-product-image-container"></div>
            <div class="modal-info">
                <h2 class="modal-title">${product.name}</h2>
                <p class="modal-brand">${product.brand}</p>
                <div class="variant-filters" id="modal-variant-filters">
                    ${presentations.length > 1 ? createFilterSection('presentation', 'Presentación', presentations) : ''}
                    ${dosages.length > 1 ? createFilterSection('dosage', 'Dosificación', dosages) : ''}
                    ${quantities.length > 1 ? createFilterSection('quantity', 'Cantidad', quantities, ' unidades') : ''}
                </div>
                <div id="modal-variant-details"></div>
            </div>
        </div>
    `;
    
    initializeFilters(productId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    cleanupZoomInstances();
    modal.classList.remove('active');
    document.body.style.overflow = '';
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

function setupModalEventListeners() {
    modalBody.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('filter-btn')) {
            handleFilterClick(target);
        } else if (target.matches('[data-action]')) {
            const form = target.closest('.add-to-cart-form');
            const quantityInput = form.querySelector('.quantity-input');
            let quantity = parseInt(quantityInput.value) || 1;
            if (target.dataset.action === 'increase') {
                quantityInput.value = quantity + 1;
            } else if (target.dataset.action === 'decrease' && quantity > 1) {
                quantityInput.value = quantity - 1;
            }
        } else if (target.classList.contains('btn-add-to-cart')) {
            const form = target.closest('.add-to-cart-form');
            const variantId = parseInt(form.dataset.variantId);
            const quantityInput = form.querySelector('.quantity-input');
            const quantity = parseInt(quantityInput.value) || 1;
            if (quantity > 0) {
                addToCart(variantId, quantity);
            }
        }
    });

     modalBody.addEventListener('input', function(e) {
        if (e.target.classList.contains('quantity-input')) {
            if (parseInt(e.target.value) < 1 || isNaN(parseInt(e.target.value))) {
                e.target.value = 1;
            }
        }
    });
}

function initializeFilters(productId) {
    const product = products.find(p => p.id === productId);
    const firstVariant = product.variants[0];
    
    const filters = ['presentation', 'dosage', 'quantity'];
    filters.forEach(filterType => {
        const group = document.querySelector(`.filter-options[data-filter="${filterType}"]`);
        if (group) {
            const targetValue = filterType === 'quantity' ? `${firstVariant[filterType]} unidades` : firstVariant[filterType];
            const targetBtn = group.querySelector(`[data-value="${targetValue}"]`) || group.querySelector('.filter-btn');
             if(targetBtn) targetBtn.classList.add('active');
        }
    });
    
    updateModalWithFilters(productId);
}

function handleFilterClick(button) {
    if (button.classList.contains('disabled')) return;
    
    const group = button.closest('.filter-options');
    group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    const productId = parseInt(modalBody.dataset.currentProductId);
    updateModalWithFilters(productId);
}

function updateModalWithFilters(productId) {
    const product = products.find(p => p.id === productId);
    const selectedFilters = getSelectedFilters();
    
    updateFilterButtonStates(product, selectedFilters);
    
    let matchingVariant = findMatchingVariant(product, getSelectedFilters());
    
    if (!matchingVariant) {
        // Si no hay match exacto, relajar filtros para encontrar uno disponible
        const relaxedFilters = { presentation: selectedFilters.presentation };
        matchingVariant = findMatchingVariant(product, relaxedFilters);
        // Actualizar UI de los filtros para reflejar la selección real
        if(matchingVariant) {
            document.querySelectorAll('.filter-options').forEach(group => {
                const filterType = group.dataset.filter;
                group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                const activeValue = filterType === 'quantity' ? `${matchingVariant[filterType]} unidades` : matchingVariant[filterType];
                const activeBtn = group.querySelector(`[data-value="${activeValue}"]`);
                if(activeBtn) activeBtn.classList.add('active');
            });
        }
    }
    
    if (matchingVariant) {
        updateModalVariantDetails(matchingVariant);
    }
}

function getSelectedFilters() {
    const selectedFilters = {};
    document.querySelectorAll('.filter-options').forEach(group => {
        const activeBtn = group.querySelector('.filter-btn.active');
        if (activeBtn) {
            let value = activeBtn.dataset.value;
            if (group.dataset.filter === 'quantity') {
                value = value.replace(' unidades', '');
            }
            selectedFilters[group.dataset.filter] = value;
        }
    });
    return selectedFilters;
}

function findMatchingVariant(product, selectedFilters) {
    return product.variants.find(variant => 
        Object.entries(selectedFilters).every(([key, value]) => variant[key] == value)
    );
}

function updateFilterButtonStates(product, selectedFilters) {
    document.querySelectorAll('.filter-options[data-filter]').forEach(group => {
        const currentFilterType = group.dataset.filter;
        
        group.querySelectorAll('.filter-btn').forEach(button => {
            const tempFilters = {...selectedFilters};
            let buttonValue = button.dataset.value;
             if (currentFilterType === 'quantity') {
                buttonValue = buttonValue.replace(' unidades', '');
            }
            tempFilters[currentFilterType] = buttonValue;
            
            const isAvailable = product.variants.some(variant => 
                Object.entries(tempFilters).every(([key, value]) => variant[key] == value)
            );
            
            button.classList.toggle('disabled', !isAvailable);
        });
    });
}

function updateModalVariantDetails(variant) {
    if (!variant) return;

    updateModalImage(variant);
    
    const detailsContainer = document.getElementById('modal-variant-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="variant-info">
                <h4 class="variant-name">${variant.name}</h4>
                <div class="variant-specs">
                    <div class="spec-item"><div class="spec-label">Presentación</div><div class="spec-value">${variant.presentation}</div></div>
                    <div class="spec-item"><div class="spec-label">Dosificación</div><div class="spec-value">${variant.dosage}</div></div>
                    <div class="spec-item"><div class="spec-label">Cantidad</div><div class="spec-value">${variant.quantity}</div></div>
                </div>
            </div>
            <table class="pricing-table-modal">
                <thead><tr><th>Condición</th><th>Precio Unitario</th></tr></thead>
                <tbody>${variant.pricingTiers.map(tier => `<tr><th>${tier.tierName}</th><td class="price-value">S/ ${tier.price}</td></tr>`).join('')}</tbody>
            </table>
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

function updateModalImage(variant) {
    const imageContainer = document.getElementById('modal-product-image-container');
    if (!imageContainer) return;
    
    let contentHTML = '';
    if (variant.images && variant.images.length > 0) {
        if (variant.images.length > 1) {
            const slides = variant.images.map((src, i) => `<div class="carousel-slide ${i === 0 ? 'active' : ''}"><img src="${src}" alt="Imagen del producto" class="modal-main-image"></div>`).join('');
            const dots = variant.images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></span>`).join('');
            contentHTML = `
                <div class="carousel-container">
                    <div class="carousel-track">${slides}</div>
                    <button class="carousel-btn prev">&lt;</button>
                    <button class="carousel-btn next">&gt;</button>
                    <div class="carousel-dots">${dots}</div>
                </div>`;
        } else {
            contentHTML = `<div class="single-image-container"><img src="${variant.images[0]}" alt="Imagen del producto" class="modal-main-image"></div>`;
        }
    }
    imageContainer.innerHTML = contentHTML;
    
    if (variant.images && variant.images.length > 1) {
        setupCarousel(imageContainer);
    }
    
    setTimeout(initializeZoom, 150);
}

// =================================================================
// CARRITO DE COMPRAS
// =================================================================
function addToCart(variantId, quantity) {
    const existingItem = cart.find(item => item.variantId === variantId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        const product = products.find(p => p.variants.some(v => v.variantId === variantId));
        const variant = product.variants.find(v => v.variantId === variantId);
        cart.push({
            variantId,
            productId: product.id,
            name: `${product.name} (${variant.name})`,
            quantity,
            image: variant.images[0]
        });
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
            cartItemsContainer.appendChild(itemEl);
        });
    }
    
    cartBadge.textContent = totalCartQty;
    cartTotalPrice.textContent = `S/ ${total.toFixed(2)}`;
}

function getApplicableTier(productVariant, totalCartQty) {
    return productVariant.pricingTiers
        .slice()
        .reverse()
        .find(tier => totalCartQty >= tier.minQty) || productVariant.pricingTiers[0];
}

function updateCartIncentive(totalCartQty) {
    const allTiers = [...new Set(products.flatMap(p => p.variants.flatMap(v => v.pricingTiers.map(t => t.minQty))))].sort((a, b) => a - b);
    const nextTierMinQty = allTiers.find(minQty => totalCartQty < minQty);
    
    if (nextTierMinQty) {
        const needed = nextTierMinQty - totalCartQty;
        cartIncentive.textContent = `¡Añade ${needed} más para un mejor precio!`;
        cartIncentive.style.display = 'block';
    } else {
        cartIncentive.textContent = `¡Felicidades! Tienes el mejor precio.`;
        cartIncentive.style.display = totalCartQty > 1 ? 'block' : 'none';
    }
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
        
        message += `*${item.name}*\n  - Cantidad: ${item.quantity}\n  - P.U.: S/ ${currentPrice.toFixed(2)} (${applicableTier.tierName})\n  - Subtotal: S/ ${subtotal.toFixed(2)}\n\n`;
        total += subtotal;
    });
    
    message += `*TOTAL DEL PEDIDO: S/ ${total.toFixed(2)}*\n_(Total de unidades: ${totalCartQty})_`;
    return encodeURIComponent(message);
}

// =================================================================
// LÓGICA DEL CARRUSEL Y ZOOM DE IMAGEN
// =================================================================
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
        track.style.transform = `translateX(-${slideWidth * targetIndex}px)`;
        
        slides.forEach((slide, index) => slide.classList.toggle('active', index === targetIndex));
        dots.forEach((dot, index) => dot.classList.toggle('active', index === targetIndex));
        
        currentIndex = targetIndex;
        
        cleanupZoomInstances();
        setTimeout(initializeZoom, 350);
    };

    nextButton.addEventListener('click', () => moveToSlide((currentIndex + 1) % slides.length));
    prevButton.addEventListener('click', () => moveToSlide((currentIndex - 1 + slides.length) % slides.length));
    
    if (dotsNav) {
        dotsNav.addEventListener('click', e => {
            const targetDot = e.target.closest('span.carousel-dot');
            if (targetDot) moveToSlide(parseInt(targetDot.dataset.slide));
        });
    }
}

function initializeZoom() {
    cleanupZoomInstances();
    const activeImage = document.querySelector('#modal-product-image-container .carousel-slide.active img, #modal-product-image-container .single-image-container img');
    if (activeImage) {
        if (activeImage.complete) {
            createZoomInstance(activeImage);
        } else {
            activeImage.onload = () => createZoomInstance(activeImage);
        }
    }
}

function createZoomInstance(img) {
    if (!img || !img.parentNode || img.closest('.image-zoom-container')) return;
    activeZoomInstances.push(new SmartZoom(img));
}

function cleanupZoomInstances() {
    activeZoomInstances.forEach(zoom => zoom.destroy());
    activeZoomInstances = [];
}

class SmartZoom {
    constructor(imageElement, zoomLevel = 2) {
        this.image = imageElement;
        this.zoomLevel = zoomLevel;
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    init() {
        if (this.isMobile) return; // Desactivar en móvil por simplicidad
        this.container = document.createElement('div');
        this.container.className = 'image-zoom-container';
        this.image.parentNode.insertBefore(this.container, this.image);
        this.container.appendChild(this.image);

        this.lens = document.createElement('div');
        this.lens.className = 'zoom-lens';
        this.container.appendChild(this.lens);

        this.result = document.createElement('div');
        this.result.className = 'zoom-result';
        // Lo adjuntamos fuera del modal para evitar problemas de overflow
        document.body.appendChild(this.result); 

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    }

    handleMouseEnter() {
        this.result.style.opacity = '1';
        this.lens.style.opacity = '1';
        this.positionZoomResult();
    }

    handleMouseLeave() {
        this.result.style.opacity = '0';
        this.lens.style.opacity = '0';
    }

    handleMouseMove(e) {
        const { left, top, width, height } = this.image.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        const lensSize = this.result.offsetWidth / this.zoomLevel;
        this.lens.style.width = `${lensSize}px`;
        this.lens.style.height = `${lensSize}px`;
        
        let lensX = x - lensSize / 2;
        let lensY = y - lensSize / 2;

        if (lensX < 0) lensX = 0;
        if (lensY < 0) lensY = 0;
        if (lensX > width - lensSize) lensX = width - lensSize;
        if (lensY > height - lensSize) lensY = height - lensSize;

        this.lens.style.left = `${lensX}px`;
        this.lens.style.top = `${lensY}px`;

        this.result.style.backgroundPosition = `-${lensX * this.zoomLevel}px -${lensY * this.zoomLevel}px`;
    }

    positionZoomResult() {
        const modalContentRect = document.querySelector('.modal-content').getBoundingClientRect();
        this.result.style.backgroundImage = `url('${this.image.src}')`;
        this.result.style.backgroundSize = `${this.image.width * this.zoomLevel}px ${this.image.height * this.zoomLevel}px`;
        
        const resultSize = modalContentRect.height * 0.8;
        const resultTop = modalContentRect.top + (modalContentRect.height * 0.1);
        
        this.result.style.width = `${resultSize}px`;
        this.result.style.height = `${resultSize}px`;
        this.result.style.top = `${resultTop}px`;
        
        // Posicionar a la derecha o izquierda del modal
        if (modalContentRect.right + resultSize + 20 < window.innerWidth) {
             this.result.style.left = `${modalContentRect.right + 20}px`;
        } else {
             this.result.style.left = `${modalContentRect.left - resultSize - 20}px`;
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.image, this.container);
            this.container.remove();
        }
        if (this.result && this.result.parentNode) {
            this.result.remove();
        }
    }
}
