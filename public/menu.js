'use strict';

const CART_KEY = 'calamans-kitchen-cart';

const menuSections = {
  rice: [],
  proteins: [],
  soups: [],
  swallow: []
};

const riceGrid = document.getElementById('rice-grid');
const proteinGrid = document.getElementById('protein-grid');
const soupGrid = document.getElementById('soup-grid');
const swallowGrid = document.getElementById('swallow-grid');
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

function updateMenuSections(sections) {
  menuSections.rice = sections.rice || [];
  menuSections.proteins = sections.proteins || [];
  menuSections.soups = sections.soups || [];
  menuSections.swallow = sections.swallow || [];

  renderCards(menuSections.rice, riceGrid, true);
  renderCards(menuSections.proteins, proteinGrid, false);
  renderCards(menuSections.soups, soupGrid, true);
  renderCards(menuSections.swallow, swallowGrid, true);
}

function addToCart(itemId) {
  const item = findItem(itemId);
  if (!item || item.available <= 0) {
    return false;
  }

  let cart = [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cart)) {
      cart = [];
    }
  } catch (_) {
    cart = [];
  }

  const existing = cart.find((entry) => entry.id === itemId);
  if (existing) {
    if (existing.quantity >= item.available) {
      return false;
    }

    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  return true;
}

async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    const result = await response.json();
    updateMenuSections(result.sections || {});
  } catch (_) {
    if (riceGrid) {
      riceGrid.innerHTML = '<div class="col-12 text-muted">Unable to load the menu right now.</div>';
    }
  }
}

function connectMenuStream() {
  if (menuEventSource) {
    menuEventSource.close();
  }

  menuEventSource = new EventSource('/api/menu/stream');
  menuEventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.sections) {
      updateMenuSections(payload.sections);
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
  if (!addButton) {
    return;
  }

  const added = addToCart(addButton.dataset.id);
  addButton.textContent = added ? 'Added' : 'Sold out';
  setTimeout(() => {
    const freshItem = findItem(addButton.dataset.id);
    addButton.textContent = freshItem && freshItem.available > 0 ? 'Add to cart' : 'Sold out';
  }, 900);
});

loadMenu();
connectMenuStream();
