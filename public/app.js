const CART_KEY = 'calamans-kitchen-cart';

const FALLBACK_MENU_SECTIONS = {
  rice: [
    { id: 'rice-1', name: 'Smoky Party Jollof Rice', price: 4500, image: 'assets/smoky-party-jollof-rice.jpeg', description: 'Classic red party jollof with deep pepper body and a rich, smoky finish.', available: 1 },
    { id: 'rice-2', name: 'Premium Fried Rice', price: 4800, image: 'assets/premium-fried-rice.jpeg', description: 'Colorful fried rice prepared with vegetables and clean savory seasoning.', available: 1 },
    { id: 'rice-3', name: 'Coconut Rice', price: 5000, image: 'assets/coconut-rice.jpeg', description: 'Soft coconut-infused rice with balanced sweetness and a polished finish.', available: 1 },
    { id: 'rice-4', name: 'Native Rice', price: 5200, image: 'assets/native-rice.jpeg', description: 'Traditional native rice packed with local spices and bold kitchen aroma.', available: 1 },
    { id: 'rice-5', name: 'Basmati Special Rice', price: 5500, image: 'assets/basmati-special-rice.jpeg', description: 'Long-grain basmati rice dressed for premium events and executive trays.', available: 1 },
    { id: 'rice-6', name: 'Designer Spaghetti', price: 4300, image: 'assets/designer-spaghetti.jpeg', description: 'Tomato-rich spaghetti prepared with vegetables and a vibrant presentation.', available: 1 }
  ],
  proteins: [
    { id: 'protein-1', name: 'Peppered Chicken', price: 3200, image: 'assets/peppered-chicken.jpeg', description: 'Spicy, glossy chicken cuts finished for rice trays and events.', available: 1 },
    { id: 'protein-2', name: 'Turkey Wings', price: 3800, image: 'assets/turkey-wings.jpeg', description: 'Well-marinated turkey wings with bold pepper glaze.', available: 1 },
    { id: 'protein-3', name: 'Beef', price: 2200, image: 'assets/beef.jpeg', description: 'Tender beef portion simmered until flavorful and soft.', available: 1 },
    { id: 'protein-4', name: 'Goat Meat', price: 3500, image: 'assets/goat-meat.jpeg', description: 'Goat meat cuts suited for soup and premium local pairings.', available: 1 },
    { id: 'protein-5', name: 'Assorted Meat', price: 3000, image: 'assets/assorted-meat.jpeg', description: 'Popular assorted meat mix prepared with bold seasoning.', available: 1 },
    { id: 'protein-6', name: 'Catfish', price: 4000, image: 'assets/catfish.jpeg', description: 'Fresh catfish portion ideal for soup lovers and seafood fans.', available: 1 },
    { id: 'protein-7', name: 'Croaker Fish', price: 4200, image: 'assets/croaker-fish.jpeg', description: 'Rich croaker fish option with deep savory taste.', available: 1 },
    { id: 'protein-8', name: 'Grilled Prawn', price: 4800, image: 'assets/grilled-prawn.jpeg', description: 'Premium prawn selection for elevated trays and special orders.', available: 1 },
    { id: 'protein-9', name: 'Boiled Egg', price: 800, image: 'assets/boiled-egg.jpeg', description: 'Simple add-on for rice and spaghetti plates.', available: 1 },
    { id: 'protein-10', name: 'Snail', price: 5000, image: 'assets/snail.jpeg', description: 'Premium snail option for customers who want a luxury local touch.', available: 1 }
  ],
  soups: [
    { id: 'soup-1', name: 'Egusi Soup', price: 4200, image: 'assets/egusi-soup.jpeg', description: 'Melon-seed soup with rich body and satisfying depth.', available: 1 },
    { id: 'soup-2', name: 'Afang Soup', price: 4500, image: 'assets/afang-soup.jpeg', description: 'Leafy soup with strong traditional flavor and comforting texture.', available: 1 },
    { id: 'soup-3', name: 'Ogbono Soup', price: 4300, image: 'assets/ogbono-soup.jpeg', description: 'Smooth ogbono soup with a glossy finish and hearty taste.', available: 1 },
    { id: 'soup-4', name: 'Vegetable Soup', price: 4000, image: 'assets/vegetable-soup.jpeg', description: 'A vibrant vegetable soup with freshness and balanced richness.', available: 1 },
    { id: 'soup-5', name: 'Bitterleaf Soup', price: 4600, image: 'assets/bitterleaf-soup.jpeg', description: 'Traditional bitterleaf soup prepared for bold local palates.', available: 1 },
    { id: 'soup-6', name: 'Okra Soup', price: 3900, image: 'assets/okra-soup.jpeg', description: 'Soft okra soup with a light draw and satisfying aroma.', available: 1 }
  ],
  swallow: [
    { id: 'swallow-1', name: 'Garri', price: 1200, image: 'assets/garri.jpeg', description: 'Classic eba option with smooth finish, ideal for egusi, ogbono, and vegetable soups.', available: 1 },
    { id: 'swallow-2', name: 'Semovita', price: 1400, image: 'assets/semovita.jpeg', description: 'Soft and stretchy semovita prepared for customers who prefer a lighter, refined swallow texture.', available: 1 },
    { id: 'swallow-3', name: 'Loi-loi', price: 1500, image: 'assets/loi-loi.jpeg', description: 'Traditional loi-loi option with rich local character for authentic meal combinations.', available: 1 },
    { id: 'swallow-4', name: 'Poundo Yam', price: 1800, image: 'assets/poundo-yam.jpeg', description: 'Premium poundo yam option with satisfying body, perfect for bitterleaf, afang, and okra soup plates.', available: 1 }
  ]
};

const menuSections = {
  rice: [],
  proteins: [],
  soups: [],
  swallow: []
};

const cart = [];

const riceGrid = document.getElementById('rice-grid');
const proteinGrid = document.getElementById('protein-grid');
const soupGrid = document.getElementById('soup-grid');
const swallowGrid = document.getElementById('swallow-grid');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const clearCartButton = document.getElementById('clear-cart');
let menuEventSource = null;

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

function getAllItems() {
  return [...menuSections.rice, ...menuSections.proteins, ...menuSections.soups, ...menuSections.swallow];
}

function findItem(itemId) {
  return getAllItems().find((item) => item.id === itemId);
}

function persistCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function sanitizeCart() {
  const validItems = [];

  for (const entry of cart) {
    const currentItem = findItem(entry.id);
    if (!currentItem || currentItem.available <= 0) {
      continue;
    }

    const quantity = Math.min(Number(entry.quantity || 0), currentItem.available);
    if (quantity <= 0) {
      continue;
    }

    validItems.push({ ...currentItem, quantity });
  }

  cart.splice(0, cart.length, ...validItems);
  persistCart();
}

function renderCards(items, container, darkButtons) {
  if (!container) {
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
        <div class="col-md-6 col-xl-4">
          <article class="menu-card card border-0">
            <img src="${item.image}" alt="${item.name}" />
            <div class="card-body">
              <div class="menu-meta">
                <h3 class="h4 mb-0">${item.name}</h3>
                <span class="price-tag">${formatCurrency(item.price)}</span>
              </div>
              <p class="text-muted mb-3">${item.description}</p>
              <div class="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                <button class="btn ${darkButtons ? 'btn-accent' : 'btn-dark'} rounded-pill px-4 add-to-cart" data-id="${item.id}" ${item.available > 0 ? '' : 'disabled'}>
                  ${item.available > 0 ? 'Add to cart' : 'Sold out'}
                </button>
              </div>
            </div>
          </article>
        </div>
      `
    )
    .join('');
}

function renderCart() {
  if (!cartItems || !cartTotal) {
    return;
  }

  if (cart.length === 0) {
    cartItems.innerHTML = '<div class="text-muted">No items yet. Add dishes from the menu sections above.</div>';
    cartTotal.textContent = formatCurrency(0);
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-row">
          <div>
            <h4>${item.name}</h4>
            <div class="text-muted small">${formatCurrency(item.price)} each</div>
            <div class="cart-actions">
              <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
            </div>
          </div>
          <strong>${formatCurrency(item.price * item.quantity)}</strong>
        </div>
      `
    )
    .join('');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = formatCurrency(total);
}

function renderMenu() {
  renderCards(menuSections.rice, riceGrid, true);
  renderCards(menuSections.proteins, proteinGrid, false);
  renderCards(menuSections.soups, soupGrid, true);
  renderCards(menuSections.swallow, swallowGrid, true);
}

function updateMenuSections(sections) {
  menuSections.rice = sections.rice || [];
  menuSections.proteins = sections.proteins || [];
  menuSections.soups = sections.soups || [];
  menuSections.swallow = sections.swallow || [];
  sanitizeCart();
  renderMenu();
  renderCart();
}

function countMenuItems(sections) {
  const source = sections || {};
  return (source.rice || []).length
    + (source.proteins || []).length
    + (source.soups || []).length
    + (source.swallow || []).length;
}

function showCartToast(message) {
  let toast = document.getElementById('cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;background:#1a1510;color:#fff;padding:0.75rem 1.25rem;border-radius:0.75rem;font-size:0.88rem;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.3);transition:opacity 0.3s;pointer-events:none;';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2200);
}

function addToCart(itemId) {
  const item = findItem(itemId);
  if (!item || item.available <= 0) {
    showCartToast('This item is out of stock.');
    return;
  }

  const existing = cart.find((entry) => entry.id === itemId);
  if (existing) {
    if (existing.quantity >= item.available) {
      showCartToast(`Only ${item.available} ${item.name} left in stock.`);
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  persistCart();
  renderCart();
  showCartToast(`✓ ${item.name} added to cart`);
}

function updateQuantity(itemId, action) {
  const entry = cart.find((item) => item.id === itemId);
  const currentItem = findItem(itemId);
  if (!entry || !currentItem) {
    return;
  }

  if (action === 'increase') {
    if (entry.quantity >= currentItem.available) {
      showCartToast(`Only ${currentItem.available} ${currentItem.name} left in stock.`);
      return;
    }

    entry.quantity += 1;
  }

  if (action === 'decrease') {
    entry.quantity -= 1;
  }

  const index = cart.findIndex((item) => item.id === itemId);
  if (cart[index] && cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  persistCart();
  renderCart();
}

function loadPersistedCart() {
  try {
    const stored = localStorage.getItem(CART_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (Array.isArray(parsed)) {
      cart.splice(0, cart.length, ...parsed);
    }
  } catch (_) {
    cart.splice(0, cart.length);
  }
}

async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    const result = await response.json();
    const sections = result.sections || {};
    if (countMenuItems(sections) === 0) {
      updateMenuSections(FALLBACK_MENU_SECTIONS);
      return;
    }

    updateMenuSections(sections);
  } catch (_) {
    updateMenuSections(FALLBACK_MENU_SECTIONS);
  }
}

function connectMenuStream() {
  if (menuEventSource) {
    menuEventSource.close();
  }

  menuEventSource = new EventSource('/api/menu/stream');
  menuEventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.sections && countMenuItems(payload.sections) > 0) {
        updateMenuSections(payload.sections);
      }
    } catch (_) {
      // Ignore malformed stream packets and keep current menu visible.
    }
  };
  menuEventSource.onerror = () => {
    if (menuEventSource) {
      menuEventSource.close();
      menuEventSource = null;
    }

    window.setTimeout(connectMenuStream, 3000);
  };
}

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('.add-to-cart');
  if (addButton) {
    addToCart(addButton.dataset.id);
  }

  const quantityButton = event.target.closest('.qty-btn');
  if (quantityButton) {
    updateQuantity(quantityButton.dataset.id, quantityButton.dataset.action);
  }
});

if (clearCartButton) {
  clearCartButton.addEventListener('click', () => {
    cart.splice(0, cart.length);
    persistCart();
    renderCart();
  });
}

loadPersistedCart();
renderCart();
loadMenu();
connectMenuStream();
