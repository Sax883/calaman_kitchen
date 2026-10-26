'use strict';

const CART_KEY = 'calamans-kitchen-cart';

const menuSections = {
  rice: [],
  proteins: [],
  soups: [],
  swallow: [],
  drinks: [],
  special: []
};

const riceGrid = document.getElementById('rice-grid');
const proteinGrid = document.getElementById('protein-grid');
const specialGrid = document.getElementById('special-grid');
const soupGrid = document.getElementById('soup-grid');
const swallowGrid = document.getElementById('swallow-grid');
const drinksGrid = document.getElementById('drinks-grid');
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

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

function getAllItems() {
  return Object.values(menuSections).flat();
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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
  section.className = 'mb-5';
  section.id = `menu-category-${category}`;

  const title = document.createElement('h2');
  title.className = 'menu-section-title mb-3';
  title.textContent = menuCategoryTitle(category);

  const grid = document.createElement('div');
  grid.className = 'row g-4';
  grid.id = `menu-grid-${category}`;

  section.append(title, grid);
  const menuCta = document.querySelector('.menu-only-cta');
  if (menuCta && menuCta.parentNode) {
    menuCta.parentNode.insertBefore(section, menuCta);
  } else {
    document.querySelector('main .container')?.appendChild(section);
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
