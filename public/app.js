const CART_KEY = 'calamans-kitchen-cart';

const menuSections = Object.create(null);

const cart = [];

const riceGrid = document.getElementById('rice-grid');
const proteinGrid = document.getElementById('protein-grid');
const specialGrid = document.getElementById('special-grid');
const soupGrid = document.getElementById('soup-grid');
const swallowGrid = document.getElementById('swallow-grid');
const drinksGrid = document.getElementById('drinks-grid');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const clearCartButton = document.getElementById('clear-cart');
const menuCategoryGrids = {
  rice: riceGrid,
  proteins: proteinGrid,
  soups: soupGrid,
  swallow: swallowGrid,
  drinks: drinksGrid,
  special: specialGrid
};
const dynamicMenuCategoryGrids = new Map();
let menuEventSource = null;
let testimonialTimer = 0;

const liveTestimonials = [
  { name: 'Amina O.', role: 'Corporate lunch order', message: 'The jollof rice and peppered chicken were perfect. Delivery was on time, portions were generous, and the packaging looked premium.' },
  { name: 'Emeka U.', role: 'Weekend family event', message: 'We ordered soups and assorted proteins for a family event and everyone asked for the vendor. Calaman\'s Kitchen is now our go-to.' },
  { name: 'Sarah I.', role: 'First-time online customer', message: 'The designer spaghetti and turkey were very tasty and fresh. Checkout was easy and I got immediate order confirmation.' },
  { name: 'Tunde A.', role: 'Office catering client', message: 'Excellent professionalism from order to delivery. The native rice and goat meat had authentic flavor and clean presentation.' },
  { name: 'Ngozi K.', role: 'Soup lover', message: 'I love how rich the egusi and afang soups tasted. You can tell the kitchen is disciplined and quality-focused.' },
  { name: 'Femi D.', role: 'Repeat customer', message: 'Fast response, beautiful plating, and reliable service. This is one of the most professional kitchen brands I have used.' },
  { name: 'Blessing N.', role: 'Birthday tray order', message: 'The coconut rice and turkey arrived hot and very fresh. Everyone at the birthday table was impressed.' },
  { name: 'Ifeanyi M.', role: 'Late evening order', message: 'Even with a late order, the kitchen delivered with quality. The soup was rich and perfectly seasoned.' },
  { name: 'Ruth E.', role: 'Family dinner', message: 'Their packaging and food hygiene stood out immediately. Taste and presentation were both top class.' },
  { name: 'David P.', role: 'Church event coordinator', message: 'Calaman\'s Kitchen handled our bulk order professionally and stayed consistent across every tray.' },
  { name: 'Chioma A.', role: 'Weekend special order', message: 'The catfish pepper soup was deeply flavorful and came in generous portions. Highly recommended.' },
  { name: 'Henry B.', role: 'Monthly office order', message: 'Reliable service every month. The team communicates clearly and the meals always arrive as expected.' },
  { name: 'Mercy J.', role: 'New customer', message: 'I placed my first order online and the process was smooth from cart to confirmation.' },
  { name: 'Kingsley T.', role: 'Private dinner host', message: 'Guests praised the native rice and protein selection all night. Service felt premium and organized.' },
  { name: 'Ada O.', role: 'Celebration order', message: 'Great taste, prompt delivery, and polite follow-up. Calaman\'s Kitchen made our celebration meal stress-free.' }
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getAllItems() {
  return Object.values(menuSections).flat();
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
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />
            <div class="card-body">
              <div class="menu-meta">
                <h3 class="h4 mb-0">${escapeHtml(item.name)}</h3>
                <span class="price-tag">${formatCurrency(item.price)}</span>
              </div>
              <p class="text-muted mb-3">${escapeHtml(item.description)}</p>
              <div class="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                <button class="btn ${darkButtons ? 'btn-accent' : 'btn-dark'} rounded-pill px-4 add-to-cart" data-id="${escapeHtml(item.id)}" ${item.available > 0 ? '' : 'disabled'}>
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
            <h4>${escapeHtml(item.name)}</h4>
            <div class="text-muted small">${formatCurrency(item.price)} each</div>
            <div class="cart-actions">
              <button type="button" class="qty-btn" data-action="decrease" data-id="${escapeHtml(item.id)}">-</button>
              <span>${item.quantity}</span>
              <button type="button" class="qty-btn" data-action="increase" data-id="${escapeHtml(item.id)}">+</button>
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
  const regularProteins = menuSections.proteins.filter((item) => !String(item.name || '').includes('(Special Order)'));
  const specialOrders = [
    ...menuSections.proteins.filter((item) => String(item.name || '').includes('(Special Order)')),
    ...menuSections.special
  ];

  renderCards(menuSections.rice, riceGrid, true);
  renderCards(regularProteins, proteinGrid, false);
  renderCards(specialOrders, specialGrid, true);
  renderCards(menuSections.soups, soupGrid, true);
  renderCards(menuSections.swallow, swallowGrid, true);
  renderCards(menuSections.drinks, drinksGrid, true);

  for (const [category, items] of Object.entries(menuSections)) {
    if (!Object.prototype.hasOwnProperty.call(menuCategoryGrids, category)) {
      renderCards(items, getDynamicMenuCategoryGrid(category), true);
    }
  }
}

function menuCategoryTitle(category) {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getDynamicMenuCategoryGrid(category) {
  if (dynamicMenuCategoryGrids.has(category)) {
    return dynamicMenuCategoryGrids.get(category);
  }

  const section = document.createElement('section');
  section.className = 'section-space';
  section.id = `menu-category-${category}`;

  const container = document.createElement('div');
  container.className = 'container';

  const heading = document.createElement('div');
  heading.className = 'section-heading text-center mx-auto mb-4';

  const title = document.createElement('h2');
  title.className = 'menu-section-title';
  title.textContent = menuCategoryTitle(category);
  heading.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'row g-4';
  grid.id = `menu-grid-${category}`;

  container.append(heading, grid);
  section.appendChild(container);

  const reviewsSection = document.getElementById('reviews');
  if (reviewsSection && reviewsSection.parentNode) {
    reviewsSection.parentNode.insertBefore(section, reviewsSection);
  } else {
    document.body.appendChild(section);
  }

  dynamicMenuCategoryGrids.set(category, grid);
  return grid;
}

function updateMenuSections(sections) {
  for (const category of Object.keys(menuSections)) {
    delete menuSections[category];
  }

  for (const [category, items] of Object.entries(sections || {})) {
    if (Array.isArray(items)) {
      menuSections[category] = items;
    }
  }

  for (const category of Object.keys(menuCategoryGrids)) {
    menuSections[category] = menuSections[category] || [];
  }

  sanitizeCart();
  renderMenu();
  renderCart();
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
    const response = await fetch('/api/menu', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Menu request failed (${response.status}).`);
    }

    const result = await response.json();
    if (!result.sections || typeof result.sections !== 'object' || Array.isArray(result.sections)) {
      throw new Error('Menu response did not contain valid sections.');
    }

    updateMenuSections(result.sections);
  } catch (error) {
    updateMenuSections({});
    if (riceGrid) {
      riceGrid.innerHTML = '<div class="col-12 text-muted">Unable to load the menu right now.</div>';
    }
    console.error('Unable to load the live menu:', error);
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
      if (payload.sections && typeof payload.sections === 'object' && !Array.isArray(payload.sections)) {
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

function testimonialTimeLabel(minutesAgo) {
  if (minutesAgo <= 0) {
    return 'Just now';
  }

  if (minutesAgo < 60) {
    return `${minutesAgo}m`;
  }

  const hours = Math.floor(minutesAgo / 60);
  return `${hours}h`;
}

function testimonialCardMarkup(entry, index, minutesAgo, isFresh) {
  return `
    <article class="live-comment-item${isFresh ? ' is-fresh' : ''}" data-testimonial-index="${index}">
      <div class="live-comment-avatar">${entry.name.charAt(0)}</div>
      <div class="live-comment-body">
        <div class="live-comment-head">
          <strong>${entry.name}</strong>
          <small>${entry.role}</small>
        </div>
        <p>${entry.message}</p>
        <div class="live-comment-meta">${testimonialTimeLabel(minutesAgo)}</div>
      </div>
    </article>
  `;
}

function testimonialNode(entry, index, minutesAgo, isFresh) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = testimonialCardMarkup(entry, index, minutesAgo, isFresh).trim();
  return wrapper.firstElementChild;
}

function initLiveTestimonials() {
  const grid = document.getElementById('live-testimonials-grid');
  if (!grid) {
    return;
  }

  const visibleSlots = 3;
  const totalCount = liveTestimonials.length;
  let rotationTick = 0;
  let nextIndex = visibleSlots;
  let replaceSlot = 0;
  const displayedIndexes = [];

  for (let i = 0; i < Math.min(visibleSlots, totalCount); i += 1) {
    displayedIndexes.push(i);
  }

  const renderInitialWindow = () => {
    if (totalCount === 0) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = '';
    for (let offset = 0; offset < displayedIndexes.length; offset += 1) {
      const idx = displayedIndexes[offset];
      const minutesAgo = (rotationTick * 2 + offset * 3 + (idx % 4)) % 120;
      const node = testimonialNode(liveTestimonials[idx], idx, minutesAgo, false);
      if (node) {
        grid.appendChild(node);
      }
    }
  };

  renderInitialWindow();

  if (testimonialTimer) {
    window.clearInterval(testimonialTimer);
    testimonialTimer = 0;
  }

  if (totalCount <= visibleSlots) {
    return;
  }

  testimonialTimer = window.setInterval(() => {
    rotationTick += 1;

    const updatedSlot = replaceSlot;
    displayedIndexes[updatedSlot] = nextIndex % totalCount;
    nextIndex = (nextIndex + 1) % totalCount;
    replaceSlot = (replaceSlot + 1) % displayedIndexes.length;

    const idx = displayedIndexes[updatedSlot];
    const minutesAgo = (rotationTick * 2 + updatedSlot * 3 + (idx % 4)) % 120;
    const nextNode = testimonialNode(liveTestimonials[idx], idx, minutesAgo, true);
    const currentNode = grid.children[updatedSlot];

    if (currentNode && nextNode) {
      currentNode.replaceWith(nextNode);
      return;
    }

    renderInitialWindow();
  }, 7000);
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
initLiveTestimonials();
