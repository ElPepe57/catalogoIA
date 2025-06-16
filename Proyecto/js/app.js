// =================================================================
// INICIALIZACIÓN Y VARIABLES GLOBALES
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeHeroSlider(); 
    loadData();
});

let products = [];
let categoryDefinitions = {};
let cart = [];
let activeZoomInstances = [];
let currentModalProduct = null;
let appliedDiscount = null; 

const validDiscounts = {
    "BIENVENIDO10": { type: "percentage", value: 10 },
    "AHORRA50": { type: "fixed", value: 50.00 },
    "GRANCOMPRA": { type: "percentage", value: 15, minTotal: 500 }
};

// --- Elementos del DOM ---
const sectionsContainer = document.getElementById('product-sections-container');
const modal = document.getElementById('product-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('modal-close-btn');
const cartFab = document.getElementById('cart-fab');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartBtn = document.getElementById('cart-close-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const checkoutBtn = document.getElementById('checkout-btn');
const cartIncentive = document.getElementById('cart-incentive');
const searchInput = document.getElementById('search-input');
const cartSubtotalPrice = document.getElementById('cart-subtotal-price');
const discountRow = document.getElementById('discount-row');
const discountCodeText = document.getElementById('discount-code-text');
const cartDiscountAmount = document.getElementById('cart-discount-amount');
const cartTotalPrice = document.getElementById('cart-total-price');
const discountInput = document.getElementById('discount-input');
const applyDiscountBtn = document.getElementById('apply-discount-btn');


// =================================================================
// CARGA DE DATOS E INICIALIZACIÓN
// =================================================================
async function loadData() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
    setupStickyHeader(); // <-- Configura el header fijo
    renderContent();
    updateCart();
    setupEventListeners();
}

// =================================================================
// MANEJO DE EVENTOS
// =================================================================
function setupEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    cartFab.addEventListener('click', () => cartSidebar.classList.add('active'));
    closeCartBtn.addEventListener('click', () => cartSidebar.classList.remove('active'));
    cartItemsContainer.addEventListener('click', handleCartClick);
    cartItemsContainer.addEventListener('input', handleCartInput);
    modalBody.addEventListener('click', handleModalBodyClick);
    applyDiscountBtn.addEventListener('click', applyDiscount);
    checkoutBtn.addEventListener('click', handleCheckout);
    sectionsContainer.addEventListener('click', handleProductClick);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('active')) closeModal(); });
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            optimizeGridLayout();
            activeZoomInstances.forEach(zoom => zoom.positionZoomResult?.());
        }, 150);
    });
}

// =================================================================
// FUNCIONES DE DISEÑO Y UI
// =================================================================
function setupStickyHeader() {
    const header = document.querySelector('.header');
    const scrollThreshold = 50; 
    window.addEventListener('scroll', () => {
        header.classList.toggle('sticky', window.scrollY > scrollThreshold);
    }, { passive: true });
}

function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    animatedElements.forEach(el => observer.observe(el));
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
    if (detailsButton) openModal(parseInt(detailsButton.dataset.productId));
}

function handleCheckout(e) {
    e.preventDefault();
    if (cart.length > 0) window.open(`https://wa.me/51912907338?text=${generateWhatsAppMessage()}`, '_blank');
    else alert('Tu carrito está vacío.');
}

// =================================================================
// RENDERIZADO DE CONTENIDO
// =================================================================
function renderContent(filteredProducts = products) {
    sectionsContainer.innerHTML = '';
    if (searchInput.value.trim() !== '') renderSearchResults(filteredProducts);
    else renderCategorySections();
    setupScrollAnimations();
}

function renderSearchResults(filteredProducts) {
    const grid = document.createElement('div');
    grid.className = 'products-grid';
    if (filteredProducts.length === 0) grid.innerHTML = `<p class="no-results-message">No se encontraron productos.</p>`;
    else filteredProducts.forEach(product => grid.appendChild(createProductCard(product)));
    sectionsContainer.appendChild(grid);
}

function renderCategorySections() {
    sectionsContainer.innerHTML = Object.entries(categoryDefinitions).map(([key, def]) => {
        const categoryProducts = products.filter(p => p.category === key);
        if (categoryProducts.length === 0) return '';
        return `
            <section class="category-section animate-on-scroll">
                <div class="category-header">
                    <h2 class="category-title">${def.title}</h2>
                    <p class="category-description">${def.description}</p>
                </div>
                <div class="products-grid">
                    ${categoryProducts.map(p => createProductCard(p).outerHTML).join('')}
                </div>
            </section>`;
    }).join('');
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card animate-on-scroll';
    const lowestPrice = Math.min(...product.variants.flatMap(v => v.pricingTiers.map(t => parseFloat(t.price))));
    const tagsHTML = product.tags ? product.tags.slice(0, 3).map(tag => `<span class="product-tag">${tag}</span>`).join('') : '';
    card.innerHTML = `
        <div class="product-image-container"><img src="${product.variants[0].images[0]}" alt="${product.name}" loading="lazy"></div>
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
        </div>`;
    return card;
}

function optimizeGridLayout() {
    document.querySelectorAll('.products-grid').forEach(grid => {
        const count = grid.children.length;
        grid.className = 'products-grid'; 
        if (count === 1) grid.classList.add('single-product');
        else if (count === 2) grid.classList.add('two-products');
        else if (count === 3) grid.classList.add('three-products');
        else grid.classList.add('many-products');
    });
}

// ... (Resto del JS sin cambios: Modal, Carrito, Descuentos, Zoom, etc.)
function handleModalBodyClick(e) { if (!currentModalProduct) return; const target = e.target; if (target.classList.contains('filter-btn') && !target.classList.contains('disabled')) { const group = target.closest('.filter-options'); group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); target.classList.add('active'); updateModalContent(currentModalProduct); } else if (target.dataset.action && target.closest('.quantity-control')) { handleQuantityChange(target); } else if (target.matches('.btn-add-to-cart')) { const form = target.closest('.add-to-cart-form'); const variantId = parseInt(form.dataset.variantId); const quantity = parseInt(form.querySelector('.quantity-input').value); addToCart(variantId, quantity); } }
function updateModalContent(product) { let selectedFilters = getSelectedFilters(); let variant = findMatchingVariant(product, selectedFilters); if (!variant) { const firstAvailable = product.variants.find(v => v.presentation === selectedFilters.presentation); if (firstAvailable) { variant = firstAvailable; syncActiveButtonsToVariant(variant); } } if (variant) { updateFilterButtonStates(product, variant.presentation); updateModalVariantDetails(variant); } }
function openModal(productId) { const product = products.find(p => p.id === productId); if (!product) return; currentModalProduct = product; cleanupZoomInstances(); buildModalHTML(product); syncActiveButtonsToVariant(product.variants[0]); updateModalContent(product); modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal() { cleanupZoomInstances(); modal.classList.remove('active'); document.body.style.overflow = ''; modalBody.innerHTML = ''; currentModalProduct = null; }
function buildModalHTML(product) { const filterTypes = ['presentation', 'dosage', 'quantity']; const filters = {}; filterTypes.forEach(type => { const options = [...new Set(product.variants.map(v => v[type]))]; if (options.length > 1) filters[type] = options; }); const createFilterHTML = (type, label, options) => { const suffix = type === 'quantity' ? ' unidades' : ''; return ` <div class="filter-section"> <label class="filter-label">${label.charAt(0).toUpperCase() + label.slice(1)}:</label> <div class="filter-options" data-filter="${type}"> ${options.map(o => `<button class="filter-btn" data-value="${o}">${o}${suffix}</button>`).join('')} </div> </div>`; }; modalBody.innerHTML = ` <div class="modal-content"> <div class="modal-image" id="modal-product-image-container"></div> <div class="modal-info"> <h2 class="modal-title">${product.name}</h2><p class="modal-brand">${product.brand}</p> <div class="variant-filters"> ${Object.entries(filters).map(([type, options]) => createFilterHTML(type, type, options)).join('')} </div> <div id="modal-variant-details"></div> </div> </div>`; }
function getSelectedFilters() { const selections = {}; modalBody.querySelectorAll('.filter-options').forEach(group => { const type = group.dataset.filter; const activeBtn = group.querySelector('.filter-btn.active'); if (activeBtn) selections[type] = activeBtn.dataset.value; }); return selections; }
function findMatchingVariant(product, filters) { return product.variants.find(v => Object.entries(filters).every(([key, value]) => String(v[key]) === String(value))); }
function syncActiveButtonsToVariant(variant) { if (!variant) return; modalBody.querySelectorAll('.filter-options').forEach(group => { const type = group.dataset.filter; group.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', String(btn.dataset.value) === String(variant[type]))); }); }
function updateFilterButtonStates(product, selectedPresentation) { const relevantVariants = product.variants.filter(v => v.presentation === selectedPresentation); const possibleDosages = new Set(relevantVariants.map(v => String(v.dosage))); const possibleQuantities = new Set(relevantVariants.map(v => String(v.quantity))); modalBody.querySelectorAll('[data-filter="dosage"] .filter-btn').forEach(btn => btn.classList.toggle('disabled', !possibleDosages.has(btn.dataset.value))); modalBody.querySelectorAll('[data-filter="quantity"] .filter-btn').forEach(btn => btn.classList.toggle('disabled', !possibleQuantities.has(btn.dataset.value))); }
function handleQuantityChange(button) { const input = button.closest('.quantity-control').querySelector('.quantity-input'); let quantity = parseInt(input.value); if (button.dataset.action === 'increase') quantity++; else if (button.dataset.action === 'decrease' && quantity > 1) quantity--; input.value = quantity; }
function updateModalVariantDetails(variant) { if (!variant) return; updateModalImage(variant); const detailsContainer = document.getElementById('modal-variant-details'); detailsContainer.innerHTML = ` <div class="variant-info"> <h4 class="variant-name">${variant.name}</h4> <div class="variant-specs"> <div class="spec-item"><div class="spec-label">Presentación</div><div class="spec-value">${variant.presentation}</div></div> ${variant.dosage !== "nan" ? `<div class="spec-item"><div class="spec-label">Dosificación</div><div class="spec-value">${variant.dosage}</div></div>` : ''} <div class="spec-item"><div class="spec-label">Cantidad</div><div class="spec-value">${variant.quantity}</div></div> </div> </div> <table class="pricing-table-modal"> <thead><tr><th>Condición</th><th>Precio Unitario</th></tr></thead> <tbody>${variant.pricingTiers.map(tier => `<tr><th>${tier.tierName}</th><td class="price-value">S/ ${tier.price}</td></tr>`).join('')}</tbody> </table> <div class="add-to-cart-form" data-variant-id="${variant.variantId}"> <div class="quantity-control"><button class="quantity-btn-modal" data-action="decrease">-</button><input type="number" class="quantity-input" value="1" min="1"><button class="quantity-btn-modal" data-action="increase">+</button></div> <button class="btn-add-to-cart">Añadir al Carrito</button> </div>`; }
function updateModalImage(variant) { const imageContainer = document.getElementById('modal-product-image-container'); if (!imageContainer) return; const images = variant.images?.filter(img => img) || []; imageContainer.innerHTML = ''; if (images.length > 1) { imageContainer.innerHTML = ` <div class="carousel-container"> <div class="carousel-track">${images.map((src, i) => `<div class="carousel-slide ${i === 0 ? 'active' : ''}"><img src="${src}" alt="Imagen del producto" class="modal-main-image"></div>`).join('')}</div> <button class="carousel-btn prev">&lt;</button><button class="carousel-btn next">&gt;</button> <div class="carousel-dots">${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide-index="${i}"></span>`).join('')}</div> </div>`; setupCarousel(imageContainer.querySelector('.carousel-container')); } else if (images.length === 1) { imageContainer.innerHTML = `<div class="single-image-container"><img src="${images[0]}" alt="Imagen del producto" class="modal-main-image"></div>`; } setTimeout(initializeZoom, 100); }
function addToCart(variantId, quantity) { const existingItem = cart.find(item => item.variantId === variantId); if (existingItem) existingItem.quantity += quantity; else { const product = products.find(p => p.variants.some(v => v.variantId === variantId)); const variant = product.variants.find(v => v.variantId === variantId); cart.push({ variantId, productId: product.id, name: `${product.name} (${variant.name})`, quantity, image: variant.images[0] }); } updateCart(); closeModal(); cartSidebar.classList.add('active'); }
function handleCartClick(e) { const target = e.target; const variantId = parseInt(target.dataset.variantId); const itemInCart = variantId ? cart.find(i => i.variantId === variantId) : undefined; if (target.classList.contains('cart-quantity-btn')) { if (target.dataset.action === 'increase') itemInCart.quantity++; else if (target.dataset.action === 'decrease') itemInCart.quantity--; if (itemInCart.quantity < 1) cart = cart.filter(i => i.variantId !== variantId); updateCart(); } else if (target.closest('.cart-item-remove')) { cart = cart.filter(i => i.variantId !== parseInt(target.closest('.cart-item-remove').dataset.variantId)); updateCart(); } }
function handleCartInput(e) { const target = e.target; if (target.classList.contains('cart-quantity-input')) { const variantId = parseInt(target.dataset.variantId); const itemInCart = cart.find(i => i.variantId === variantId); if (itemInCart) { const newQuantity = parseInt(target.value); if (!isNaN(newQuantity) && newQuantity > 0) itemInCart.quantity = newQuantity; else cart = cart.filter(i => i.variantId !== variantId); updateCart(); } } }
function applyDiscount() { const code = discountInput.value.trim().toUpperCase(); if (appliedDiscount) { alert("Ya se ha aplicado un descuento."); return; } const discount = validDiscounts[code]; if (discount) { const subtotal = calculateSubtotal(); if (discount.minTotal && subtotal < discount.minTotal) { alert(`Este código requiere una compra mínima de S/ ${discount.minTotal.toFixed(2)}.`); return; } appliedDiscount = { code, ...discount }; updateCart(); discountInput.disabled = true; applyDiscountBtn.textContent = "Aplicado"; applyDiscountBtn.classList.add("applied"); } else { alert("El código de descuento no es válido."); discountInput.value = ""; } }
function calculateSubtotal() { const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0); return cart.reduce((subtotal, item) => { const product = products.find(p => p.id === item.productId); const variant = product.variants.find(v => v.variantId === item.variantId); const applicableTier = getApplicableTier(variant, totalCartQty); return subtotal + parseFloat(applicableTier.price) * item.quantity; }, 0); }
function updateCart() { const subtotal = calculateSubtotal(); let discountAmount = 0; if (appliedDiscount) { if (appliedDiscount.type === 'percentage') discountAmount = (subtotal * appliedDiscount.value) / 100; else if (appliedDiscount.type === 'fixed') discountAmount = appliedDiscount.value; } discountAmount = Math.min(subtotal, discountAmount); const total = subtotal - discountAmount; cartItemsContainer.innerHTML = ''; if (cart.length === 0) { cartItemsContainer.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>'; cartIncentive.style.display = 'none'; appliedDiscount = null; discountInput.disabled = false; discountInput.value = ""; applyDiscountBtn.textContent = "Aplicar"; applyDiscountBtn.classList.remove("applied"); } else { updateCartIncentive(cart.reduce((sum, item) => sum + item.quantity, 0)); cart.forEach(item => { const product = products.find(p => p.id === item.productId); const variant = product.variants.find(v => v.variantId === item.variantId); const applicableTier = getApplicableTier(variant, cart.reduce((s, i) => s + i.quantity, 0)); const itemEl = document.createElement('div'); itemEl.className = 'cart-item'; itemEl.innerHTML = ` <img src="${item.image}" class="cart-item-img" alt="${item.name}"> <div class="cart-item-info"> <p class="name">${item.name}</p> <div class="cart-item-pricing"> <span>S/ ${parseFloat(applicableTier.price).toFixed(2)} c/u</span> <span class="price-tier">(${applicableTier.tierName})</span> </div> </div> <div class="cart-item-controls"> <button class="cart-quantity-btn" data-action="decrease" data-variant-id="${item.variantId}">-</button> <input type="number" class="cart-quantity-input" value="${item.quantity}" min="1" data-variant-id="${item.variantId}" aria-label="Cantidad"> <button class="cart-quantity-btn" data-action="increase" data-variant-id="${item.variantId}">+</button> </div> <button class="cart-item-remove" data-variant-id="${item.variantId}">&times;</button>`; cartItemsContainer.appendChild(itemEl); }); } cartBadge.textContent = cart.reduce((sum, item) => sum + item.quantity, 0); cartSubtotalPrice.textContent = `S/ ${subtotal.toFixed(2)}`; if (appliedDiscount) { discountCodeText.textContent = appliedDiscount.code; cartDiscountAmount.textContent = `- S/ ${discountAmount.toFixed(2)}`; discountRow.style.display = 'flex'; } else { discountRow.style.display = 'none'; } cartTotalPrice.textContent = `S/ ${total.toFixed(2)}`; }
function getApplicableTier(variant, totalQty) { return variant.pricingTiers.slice().reverse().find(tier => totalQty >= tier.minQty) || variant.pricingTiers[0]; }
function updateCartIncentive(totalQty) { const allTiers = [...new Set(products.flatMap(p => p.variants.flatMap(v => v.pricingTiers.map(t => t.minQty))))].sort((a, b) => a - b); const nextTier = allTiers.find(tier => totalQty < tier); if (nextTier) { cartIncentive.textContent = `¡Añade ${nextTier - totalQty} más para un mejor precio!`; cartIncentive.style.display = 'block'; } else { cartIncentive.textContent = `¡Felicidades! Tienes el mejor precio.`; cartIncentive.style.display = totalQty > 1 ? 'block' : 'none'; } }
function generateWhatsAppMessage() { let message = "Hola! Quisiera realizar el siguiente pedido:\n\n"; const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0); const subtotal = calculateSubtotal(); cart.forEach(item => { const product = products.find(p => p.id === item.productId); const variant = product.variants.find(v => v.variantId === item.variantId); const tier = getApplicableTier(variant, totalQty); const price = parseFloat(tier.price); message += `*${item.name}*\n - Cantidad: ${item.quantity}\n - P.U.: S/ ${price.toFixed(2)} (${tier.tierName})\n - Subtotal: S/ ${(price * item.quantity).toFixed(2)}\n\n`; }); message += `*SUBTOTAL: S/ ${subtotal.toFixed(2)}*\n`; if (appliedDiscount) { let discount = 0; if (appliedDiscount.type === 'percentage') discount = (subtotal * appliedDiscount.value) / 100; else if (appliedDiscount.type === 'fixed') discount = appliedDiscount.value; discount = Math.min(subtotal, discount); message += `*Descuento (${appliedDiscount.code}): - S/ ${discount.toFixed(2)}*\n`; message += `*TOTAL DEL PEDIDO: S/ ${(subtotal - discount).toFixed(2)}*\n`; } else { message += `*TOTAL DEL PEDIDO: S/ ${subtotal.toFixed(2)}*\n`; } message += `_(Total de unidades: ${totalQty})_`; return encodeURIComponent(message); }
function setupCarousel(container) { const track = container.querySelector('.carousel-track'); const slides = Array.from(track.children); const nextBtn = container.querySelector('.carousel-btn.next'); const prevBtn = container.querySelector('.carousel-btn.prev'); const dots = Array.from(container.querySelectorAll('.carousel-dot')); let currentIndex = 0; const moveToSlide = (index) => { track.style.transform = `translateX(-${100 * index}%)`; slides.forEach((s, i) => s.classList.toggle('active', i === index)); dots.forEach((d, i) => d.classList.toggle('active', i === index)); currentIndex = index; cleanupZoomInstances(); setTimeout(initializeZoom, 300); }; nextBtn.addEventListener('click', () => moveToSlide((currentIndex + 1) % slides.length)); prevBtn.addEventListener('click', () => moveToSlide((currentIndex - 1 + slides.length) % slides.length)); dots.forEach(dot => dot.addEventListener('click', (e) => moveToSlide(parseInt(e.target.dataset.slideIndex)))); }
function initializeZoom() { cleanupZoomInstances(); const activeImage = document.querySelector('#modal-product-image-container .carousel-slide.active img, #modal-product-image-container .single-image-container img'); if (activeImage) { if (activeImage.complete) createZoomInstance(activeImage); else activeImage.onload = () => createZoomInstance(activeImage); } }
function createZoomInstance(img) { if (!img || !img.parentNode || img.closest('.image-zoom-container')) return; activeZoomInstances.push(new SmartZoom(img)); }
function cleanupZoomInstances() { activeZoomInstances.forEach(zoom => zoom.destroy()); activeZoomInstances = []; }
class SmartZoom { constructor(img, zoomLevel = 2) { this.image = img; this.zoomLevel = zoomLevel; this.isMobile = window.innerWidth <= 1024; this.isDestroyed = false; if (!this.isMobile) this.init(); } init() { if (this.isDestroyed || !this.image?.parentNode) return; this.container = document.createElement('div'); this.container.className = 'image-zoom-container'; this.image.parentNode.insertBefore(this.container, this.image); this.container.appendChild(this.image); this.lens = document.createElement('div'); this.lens.className = 'zoom-lens'; this.container.appendChild(this.lens); this.result = document.createElement('div'); this.result.className = 'zoom-result'; document.body.appendChild(this.result); this.handleMouseMove = this.handleMouseMove.bind(this); this.handleMouseEnter = this.handleMouseEnter.bind(this); this.handleMouseLeave = this.handleMouseLeave.bind(this); this.container.addEventListener('mousemove', this.handleMouseMove); this.container.addEventListener('mouseenter', this.handleMouseEnter); this.container.addEventListener('mouseleave', this.handleMouseLeave); } handleMouseEnter() { if (this.isDestroyed) return; this.positionZoomResult(); this.result.style.opacity = '1'; this.lens.style.opacity = '1'; } handleMouseLeave() { if (this.isDestroyed) return; this.result.style.opacity = '0'; this.lens.style.opacity = '0'; } handleMouseMove(e) { if (this.isDestroyed) return; window.requestAnimationFrame(() => { const rect = this.container.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; if (x < 0 || y < 0 || x > rect.width || y > rect.height) { this.handleMouseLeave(); return; } const lensX = this.result.offsetWidth / this.zoomLevel; const lensY = this.result.offsetHeight / this.zoomLevel; this.lens.style.width = `${lensX}px`; this.lens.style.height = `${lensY}px`; let lx = x - lensX / 2; let ly = y - lensY / 2; lx = Math.max(0, Math.min(lx, rect.width - lensX)); ly = Math.max(0, Math.min(ly, rect.height - lensY)); this.lens.style.left = `${lx}px`; this.lens.style.top = `${ly}px`; const bgX = (lx / rect.width) * (this.image.naturalWidth * this.zoomLevel - this.result.offsetWidth); const bgY = (ly / rect.height) * (this.image.naturalHeight * this.zoomLevel - this.result.offsetHeight); this.result.style.backgroundPosition = `-${bgX}px -${bgY}px`; }); } positionZoomResult() { if (this.isDestroyed || !this.image) return; const modalContent = document.querySelector('.modal-content'); if (!modalContent) return; this.result.style.backgroundImage = `url('${this.image.src}')`; this.result.style.backgroundSize = `${this.image.naturalWidth * this.zoomLevel}px ${this.image.naturalHeight * this.zoomLevel}px`; const modalRect = modalContent.getBoundingClientRect(); const resultSize = Math.min(modalRect.height * 0.8, 450); this.result.style.width = `${resultSize}px`; this.result.style.height = `${resultSize}px`; this.result.style.top = `${modalRect.top + (modalRect.height - resultSize) / 2}px`; if (window.innerWidth - modalRect.right >= resultSize + 20) { this.result.style.left = `${modalRect.right + 20}px`; this.result.style.display = 'block'; } else if (modalRect.left >= resultSize + 20) { this.result.style.left = `${modalRect.left - resultSize - 20}px`; this.result.style.display = 'block'; } else { this.result.style.display = 'none'; } } destroy() { this.isDestroyed = true; this.container?.removeEventListener('mousemove', this.handleMouseMove); this.container?.removeEventListener('mouseenter', this.handleMouseEnter); this.container?.removeEventListener('mouseleave', this.handleMouseLeave); if (this.container?.parentNode && this.image) { this.container.parentNode.insertBefore(this.image, this.container); this.container.remove(); } this.result?.remove(); this.container = this.lens = this.result = this.image = null; } }

