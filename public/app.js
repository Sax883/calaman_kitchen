const CART_KEY = 'calamans-kitchen-cart';

const FALLBACK_MENU_SECTIONS = {
  rice: [
    { id: 'rice-1', name: 'Party Jollof Rice', price: 5000, image: 'assets/smoky-party-jollof-rice.jpeg', description: 'Classic party-style jollof rice with rich pepper flavor and signature smoky finish.', available: 1 },
    { id: 'rice-2', name: 'Fried Rice', price: 5000, image: 'assets/basmati-special-rice.jpeg', description: 'Freshly prepared fried rice with vegetables and balanced savory seasoning.', available: 1 },
    { id: 'rice-3', name: 'Coconut Rice', price: 5000, image: 'assets/coconut-rice.jpeg', description: 'Aromatic coconut rice with a smooth finish and premium home-style taste.', available: 1 }
  ],
  proteins: [
    { id: 'protein-1', name: 'Chicken', price: 5000, image: 'assets/peppered-chicken.jpeg', description: 'Well-seasoned chicken portion, finished for rice and soup pairings.', available: 1 },
    { id: 'protein-2', name: 'Turkey', price: 12000, image: 'assets/turkey-wings.jpeg', description: 'Premium turkey portion marinated and cooked for full flavor.', available: 1 },
    { id: 'protein-3', name: 'Beef', price: 3500, image: 'assets/beef.jpeg', description: 'Tender beef cuts simmered to a rich and satisfying finish.', available: 1 },
    { id: 'protein-4', name: 'Snail', price: 6000, image: 'assets/snail.jpeg', description: 'Premium snail portion prepared for specialty local meals.', available: 1 },
    { id: 'protein-5', name: 'Isi Ewu (Special Order)', price: 25000, image: 'assets/isi-ewu.jpeg', description: 'Special order: classic isi ewu served with bold traditional seasoning.', available: 1 },
    { id: 'protein-6', name: 'Nkwobi (Special Order)', price: 30000, image: 'assets/nkwobi.jpeg', description: 'Special order: rich nkwobi presentation made fresh to order.', available: 1 },
    { id: 'protein-7', name: 'Assorted Pepper Soup (Special Order)', price: 20000, image: 'assets/assorted-pepper-soup.jpeg', description: 'Special order: assorted pepper soup cooked with aromatic local spices.', available: 1 },
    { id: 'protein-8', name: 'Catfish Pepper Soup and Yam (Special Order)', price: 25000, image: 'assets/catfish-peppersoup-with-yam.jpeg', description: 'Special order: catfish pepper soup served with yam.', available: 1 },
    { id: 'protein-9', name: 'Catfish Pepper Soup and Rice (Special Order)', price: 20000, image: 'assets/catfish-pepper-soup-with-rice.jpeg', description: 'Special order: catfish pepper soup served with rice.', available: 1 },
    { id: 'protein-10', name: 'Croaker Fish Pepper Soup (Special Order)', price: 30000, image: 'assets/croaker-pepper-soup.jpeg', description: 'Special order: premium croaker fish pepper soup.', available: 1 },
    { id: 'protein-11', name: 'Native Rice (Special Order)', price: 7000, image: 'assets/native-rice.jpeg', description: 'Special order: native rice prepared with traditional spices.', available: 1 },
    { id: 'protein-12', name: 'Spaghetti (Special Order)', price: 4000, image: 'assets/designer-spaghetti.jpeg', description: 'Special order: tomato-rich spaghetti prepared to request.', available: 1 },
    { id: 'protein-13', name: 'SeaFood Okra', price: 26500, image: 'assets/seafood-okra.jpeg', description: 'Special order: SeaFood Okra prepared fresh to request.', available: 1 }
  ],
  soups: [
    { id: 'soup-1', name: 'Egusi Soup and Meat', price: 9000, image: 'assets/egusi-soup.jpeg', description: 'Premium egusi soup served with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-2', name: 'Banga Soup and Meat', price: 20000, image: 'assets/afang-soup.jpeg', description: 'Rich banga soup and meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-3', name: 'Fisherman Soup with Fish', price: 25000, image: 'assets/fisherman-soup.jpeg', description: 'Seafood-rich fisherman soup with fish. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-4', name: 'Vegetable Soup and Meat', price: 9000, image: 'assets/vegetable-soup.jpeg', description: 'Fresh vegetable soup with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-5', name: 'Okazi Soup and Meat', price: 9000, image: 'assets/afang-soup.jpeg', description: 'Traditional okazi soup served with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-6', name: 'Bitter Leaf Soup and Meat', price: 9000, image: 'assets/bitterleaf-soup.jpeg', description: 'Authentic bitter leaf soup with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-7', name: 'Okoro Soup and Meat', price: 9000, image: 'assets/okra-soup.jpeg', description: 'Home-style okoro soup with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-8', name: 'Ogbono Soup and Meat', price: 9000, image: 'assets/ogbono-soup.jpeg', description: 'Smooth ogbono soup served with meat. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-9', name: 'White Soup', price: 15500, image: 'assets/white-soup.jpeg', description: 'Premium white soup. Add garri or semo for NGN 1,500.', available: 1 },
    { id: 'soup-10', name: 'Native Soup and Meat', price: 9000, image: 'assets/native-soup.jpeg', description: 'Native soup served with meat. Add garri or semo for NGN 1,500.', available: 1 }
  ],
  swallow: [
    { id: 'swallow-1', name: 'Garri', price: 1500, image: 'assets/garri.jpeg', description: 'Freshly prepared eba to pair with soup selections.', available: 1 },
    { id: 'swallow-2', name: 'Semo', price: 1500, image: 'assets/semovita.jpeg', description: 'Soft semo swallow, ideal with traditional soup options.', available: 1 }
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
const specialGrid = document.getElementById('special-grid');
const soupGrid = document.getElementById('soup-grid');
const swallowGrid = document.getElementById('swallow-grid');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const clearCartButton = document.getElementById('clear-cart');
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
  const regularProteins = menuSections.proteins.filter((item) => !String(item.name || '').includes('(Special Order)'));
  const specialOrders = menuSections.proteins.filter((item) => String(item.name || '').includes('(Special Order)'));

  renderCards(menuSections.rice, riceGrid, true);
  renderCards(regularProteins, proteinGrid, false);
  renderCards(specialOrders, specialGrid, true);
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

function testimonialCardMarkup(entry, index, minutesAgo) {
  return `
    <article class="live-comment-item" data-testimonial-index="${index}">
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

function initLiveTestimonials() {
  const grid = document.getElementById('live-testimonials-grid');
  if (!grid) {
    return;
  }

  const visibleSlots = 3;
  const totalCount = liveTestimonials.length;
  let startIndex = 0;
  let rotationTick = 0;

  const renderVisibleWindow = () => {
    if (totalCount === 0) {
      grid.innerHTML = '';
      return;
    }

    const visibleEntries = [];
    for (let offset = 0; offset < Math.min(visibleSlots, totalCount); offset += 1) {
      const idx = (startIndex + offset) % totalCount;
      const minutesAgo = (rotationTick * 2 + offset * 3 + (idx % 4)) % 120;
      visibleEntries.push({ entry: liveTestimonials[idx], index: idx, minutesAgo });
    }

    grid.innerHTML = visibleEntries
      .map(({ entry, index, minutesAgo }) => testimonialCardMarkup(entry, index, minutesAgo))
      .join('');
  };

  renderVisibleWindow();

  if (testimonialTimer) {
    window.clearInterval(testimonialTimer);
    testimonialTimer = 0;
  }

  if (totalCount <= visibleSlots) {
    return;
  }

  testimonialTimer = window.setInterval(() => {
    rotationTick += 1;
    startIndex = (startIndex + 1) % totalCount;
    renderVisibleWindow();
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
