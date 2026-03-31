const ADMIN_TOKEN_KEY = 'calamans-kitchen-admin-token';

const adminLoginShell = document.getElementById('admin-login-shell');
const adminDashboardShell = document.getElementById('admin-dashboard-shell');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginMessage = document.getElementById('admin-login-message');
const adminLogoutButton = document.getElementById('admin-logout-button');
const ordersList = document.getElementById('orders-list');
const totalOrders = document.getElementById('total-orders');
const latestOrder = document.getElementById('latest-order');
const liveBadge = document.getElementById('live-badge');
const notificationStatus = document.getElementById('notification-status');
const adminMessage = document.getElementById('admin-message');
const menuEditorList = document.getElementById('menu-editor-list');
const menuSearchInput = document.getElementById('menu-search-input');
const menuSearchMeta = document.getElementById('menu-search-meta');
const soundToggle = document.getElementById('sound-toggle');
const vibrationToggle = document.getElementById('vibration-toggle');

let adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
let adminSocket = null;
const ADMIN_ALERT_SETTINGS_KEY = 'calamans-admin-alert-settings';
let menuSections = {
  rice: [],
  proteins: [],
  soups: [],
  swallow: []
};
let menuFilterQuery = '';
let alertSettings = {
  soundEnabled: true,
  vibrationEnabled: true
};

function loadAlertSettings() {
  try {
    const raw = localStorage.getItem(ADMIN_ALERT_SETTINGS_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    alertSettings.soundEnabled = parsed.soundEnabled !== false;
    alertSettings.vibrationEnabled = parsed.vibrationEnabled !== false;
  } catch (_) {
    alertSettings = {
      soundEnabled: true,
      vibrationEnabled: true
    };
  }
}

function syncAlertToggleInputs() {
  if (soundToggle) {
    soundToggle.checked = alertSettings.soundEnabled;
  }

  if (vibrationToggle) {
    vibrationToggle.checked = alertSettings.vibrationEnabled;
  }
}

function persistAlertSettings() {
  localStorage.setItem(ADMIN_ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
}

function setDashboardVisible(isVisible) {
  adminLoginShell.classList.toggle('is-visible', !isVisible);
  adminDashboardShell.classList.toggle('is-visible', isVisible);
}

function authHeaders() {
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return {};
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function itemCategory(itemId) {
  if (String(itemId || '').startsWith('swallow-')) {
    return 'Swallow';
  }

  if (String(itemId || '').startsWith('soup-')) {
    return 'Soup';
  }

  if (String(itemId || '').startsWith('protein-')) {
    return 'Protein';
  }

  if (String(itemId || '').startsWith('rice-')) {
    return 'Rice';
  }

  return 'Menu';
}

function categoryLabel(category) {
  if (category === 'proteins') {
    return 'Protein';
  }

  if (category === 'soups') {
    return 'Soup';
  }

  if (category === 'swallow') {
    return 'Swallow';
  }

  return 'Rice';
}

function orderActions(order) {
  const actions = [];

  if (!['Paid', 'Cash collected'].includes(order.paymentStatus)) {
    actions.push({ action: 'mark_paid', label: 'Mark as paid', tone: 'btn-outline-success' });
  }

  if (order.orderState === 'processing') {
    actions.push({ action: 'accept_order', label: 'Accept order', tone: 'btn-dark' });
  }

  if (order.orderState === 'accepted') {
    actions.push({ action: 'start_preparing', label: 'Start preparing', tone: 'btn-outline-dark' });
  }

  if (order.orderState === 'preparing') {
    actions.push({ action: 'mark_ready', label: 'Mark ready', tone: 'btn-outline-primary' });
  }

  if (order.orderState === 'ready') {
    actions.push({ action: 'dispatch_order', label: 'Dispatch order', tone: 'btn-outline-warning' });
  }

  if (order.orderState === 'out_for_delivery') {
    actions.push({ action: 'complete_order', label: 'Complete order', tone: 'btn-outline-success' });
  }

  actions.push({ action: 'delete_order', label: 'Delete order', tone: 'btn-outline-danger' });

  return actions;
}

function renderOrders(orders) {
  totalOrders.textContent = String(orders.length);
  latestOrder.textContent = orders[0] ? orders[0].id : 'No orders yet';

  if (orders.length === 0) {
    ordersList.innerHTML = '<div class="col-12"><div class="order-card">No customer orders have been placed yet.</div></div>';
    return;
  }

  ordersList.innerHTML = orders
    .map((order) => {
      const actions = orderActions(order)
        .map(
          (entry) => `
            <button class="btn ${entry.tone} btn-sm rounded-pill admin-action" data-id="${order.id}" data-action="${entry.action}">
              ${entry.label}
            </button>
          `
        )
        .join('');

      const timeline = (order.timeline || [])
        .slice(-3)
        .reverse()
        .map(
          (entry) => `
            <li>
              <strong>${escapeHtml(entry.label)}</strong>
              <div class="small text-muted">${escapeHtml(entry.detail || '')}</div>
              <div class="small text-muted">${formatDate(entry.at)}</div>
            </li>
          `
        )
        .join('');

      return `
        <div class="col-xl-6">
          <article class="order-card admin-order-card" data-order-id="${escapeHtml(order.id)}">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <span class="badge rounded-pill px-3 py-2">${escapeHtml(order.status)}</span>
                <h2 class="h4 mt-3 mb-1">${escapeHtml(order.id)}</h2>
                <div class="text-muted small">${formatDate(order.createdAt)}</div>
              </div>
              <strong>${formatCurrency(order.total)}</strong>
            </div>
            <div class="admin-order-grid mb-3">
              <div>
                <span>Customer</span>
                <strong>${escapeHtml(order.customer.name)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>${escapeHtml(order.customer.phone)}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong>${escapeHtml(order.paymentMethod)}</strong>
              </div>
              <div>
                <span>Payment status</span>
                <strong>${escapeHtml(order.paymentStatus)}</strong>
              </div>
              <div>
                <span>Kitchen</span>
                <strong>${escapeHtml(order.fulfillmentStatus)}</strong>
              </div>
              <div>
                <span>Ready in</span>
                <strong>${escapeHtml(order.readyInMinutes || 'Not set')}</strong>
              </div>
            </div>
            <div class="mb-3">
              <strong>Delivery address</strong>
              <div>${escapeHtml(order.customer.address)}</div>
              <div class="small text-muted mt-1">${escapeHtml(order.deliveryTime)}</div>
            </div>
            <div class="mb-3">
              <div><strong>Transaction ref:</strong> ${escapeHtml(order.transactionReference || 'Not submitted')}</div>
              <div><strong>Notes:</strong> ${escapeHtml(order.notes || 'No extra notes')}</div>
            </div>
            ${order.proofOfPaymentProvided ? `<div class="proof-preview mb-3"><img src="${order.proofOfPaymentDataUrl}" alt="Proof of payment for ${escapeHtml(order.id)}" /></div>` : ''}
            <div class="mb-3">
              <strong>Items</strong>
              <ul class="mb-0 mt-2">
                ${order.items.map((item) => `<li>${item.quantity} x ${escapeHtml(item.name)} <span class="badge text-bg-light border">${itemCategory(item.id)}</span> - ${formatCurrency(item.lineTotal)}</li>`).join('')}
              </ul>
            </div>
            <div class="admin-update-panel">
              <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                <input class="form-control form-control-sm ready-time-input" style="max-width: 140px;" type="text" value="${escapeHtml(order.readyInMinutes || '')}" placeholder="Ready in mins" data-id="${order.id}" />
                <button class="btn btn-sm btn-outline-dark rounded-pill save-ready-time" data-id="${order.id}" data-action="save_ready_time">Save ETA</button>
              </div>
              <div class="d-flex flex-wrap gap-2">${actions || '<span class="text-muted small">No action required.</span>'}</div>
            </div>
            <div class="mt-3">
              <strong>Recent timeline</strong>
              <ul class="timeline-list mt-2 mb-0">${timeline}</ul>
            </div>
          </article>
        </div>
      `;
    })
    .join('');
}

function renderMenuEditor(sections) {
  const categoryOrder = ['rice', 'proteins', 'soups', 'swallow'];
  const items = categoryOrder.flatMap((category) =>
    (sections[category] || []).map((item) => ({ ...item, category }))
  );

  const normalizedQuery = menuFilterQuery.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter((item) => {
      const category = categoryLabel(item.category).toLowerCase();
      return [item.id, item.name, category].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
    })
    : items;

  if (menuSearchMeta) {
    menuSearchMeta.textContent = normalizedQuery
      ? `${filteredItems.length} of ${items.length} items shown`
      : `${items.length} menu items`;
  }

  if (filteredItems.length === 0) {
    menuEditorList.innerHTML = `<div class="col-12"><div class="order-card">${normalizedQuery ? 'No menu items match your search.' : 'No menu items available.'}</div></div>`;
    return;
  }

  menuEditorList.innerHTML = filteredItems
    .map(
      (item) => `
        <div class="col-xl-6">
          <div class="status-tile h-100">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div class="small text-muted mt-1">${escapeHtml(categoryLabel(item.category))}</div>
                <div class="small text-muted">${escapeHtml(item.id)}</div>
              </div>
              <button
                type="button"
                class="btn btn-sm rounded-pill toggle-stock-state ${item.available > 0 ? 'btn-outline-success' : 'btn-outline-danger'}"
                data-id="${item.id}"
                data-available="${item.available}"
              >
                ${item.available > 0 ? 'In stock' : 'Out of stock'}
              </button>
            </div>
            <div class="menu-editor-image mb-3">
              <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="menu-editor-preview" data-preview-id="${item.id}" />
            </div>
            <div class="row g-2 align-items-end">
              <div class="col-sm-6">
                <label class="form-label small">Image path</label>
                <input class="form-control form-control-sm menu-image-input" data-id="${item.id}" type="text" value="${escapeHtml(item.image)}" placeholder="assets/food-name.jpeg" />
              </div>
              <div class="col-sm-3">
                <label class="form-label small">Price (NGN)</label>
                <input class="form-control form-control-sm menu-price-input" data-id="${item.id}" type="number" min="0" step="100" value="${item.price}" />
              </div>
              <div class="col-sm-3">
                <label class="form-label small">Available stock</label>
                <input class="form-control form-control-sm menu-stock-input" data-id="${item.id}" type="number" min="0" step="1" value="${item.available}" />
              </div>
              <div class="col-sm-8">
                <label class="form-label small">Upload new image</label>
                <input class="form-control form-control-sm menu-image-file-input" data-id="${item.id}" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
              <div class="col-sm-4 d-grid">
                <button class="btn btn-sm btn-outline-dark rounded-pill upload-menu-image" data-id="${item.id}">Upload image</button>
              </div>
              <div class="col-sm-12 d-grid mt-2">
                <button class="btn btn-sm btn-accent rounded-pill save-menu-item" data-id="${item.id}">Save</button>
              </div>
            </div>
          </div>
        </div>
      `
    )
    .join('');
}

function showSessionExpired() {
  adminMessage.className = 'alert alert-danger border-0';
  adminMessage.textContent = 'Your admin session expired. Sign in again.';
  clearSession();
}

async function loadOrders() {
  try {
    const response = await fetch('/api/orders', {
      headers: authHeaders()
    });

    if (response.status === 401) {
      showSessionExpired();
      return;
    }

    const result = await readJsonResponse(response);
    renderOrders(result.orders || []);
    adminMessage.className = 'alert alert-success border-0';
    adminMessage.textContent = 'Dashboard connected. Orders update automatically.';
  } catch (_) {
    adminMessage.className = 'alert alert-danger border-0';
    adminMessage.textContent = 'Unable to load orders.';
  }
}

async function loadMenuEditor() {
  try {
    const response = await fetch('/api/menu', {
      headers: authHeaders()
    });
    const result = await readJsonResponse(response);
    menuSections = result.sections || {
      rice: [],
      proteins: [],
      soups: [],
      swallow: []
    };
    renderMenuEditor(menuSections);
  } catch (_) {
    menuEditorList.innerHTML = '<div class="col-12"><div class="order-card">Unable to load menu editor.</div></div>';
  }
}

function triggerBrowserNotice(order) {
  notificationStatus.textContent = 'New order received';
  liveBadge.textContent = 'Live: new order';
  liveBadge.className = 'badge text-bg-danger fs-6 px-3 py-2 rounded-pill';

  playOrderAlertTone();
  triggerDeviceVibration();
  showOrderToast(order);

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification("Calaman's Kitchen", {
        body: `${order.customer.name} placed ${order.id} for ${formatCurrency(order.total)}`
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}

function playOrderAlertTone() {
  if (!alertSettings.soundEnabled) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const now = audioContext.currentTime;
    const frequencies = [880, 660, 990];

    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const start = now + index * 0.12;
      const end = start + 0.1;
      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.start(start);
      oscillator.stop(end);
    });

    window.setTimeout(() => {
      audioContext.close().catch(() => {});
    }, 900);
  } catch (_) {
    // Ignore sound errors in browsers that restrict autoplay.
  }
}

function triggerDeviceVibration() {
  if (!alertSettings.vibrationEnabled) {
    return;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([180, 120, 180]);
  }
}

function createToastStack() {
  let stack = document.getElementById('admin-order-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'admin-order-toast-stack';
    stack.className = 'admin-order-toast-stack';
    document.body.appendChild(stack);
  }

  return stack;
}

function getToastActions(order) {
  const actions = ['view_order'];

  if (!['Paid', 'Cash collected'].includes(order.paymentStatus)) {
    actions.push('mark_paid');
  }

  if (order.orderState === 'processing') {
    actions.push('accept_order');
  }

  if (order.orderState === 'accepted') {
    actions.push('start_preparing');
  }

  return actions;
}

function actionLabel(action) {
  if (action === 'view_order') return 'View';
  if (action === 'mark_paid') return 'Mark paid';
  if (action === 'accept_order') return 'Accept';
  if (action === 'start_preparing') return 'Start prep';
  return action;
}

async function handleToastQuickAction(orderId, action) {
  if (action === 'view_order') {
    const cards = document.querySelectorAll('[data-order-id]');
    for (const card of cards) {
      if (card.getAttribute('data-order-id') === orderId) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('order-highlight-flash');
        window.setTimeout(() => card.classList.remove('order-highlight-flash'), 1300);
        break;
      }
    }
    return;
  }

  await sendAdminAction(orderId, action);
  await loadOrders();
  adminMessage.className = 'alert alert-success border-0';
  adminMessage.textContent = `Quick action applied: ${actionLabel(action)}.`;
}

function showOrderToast(order) {
  const stack = createToastStack();
  const toast = document.createElement('div');
  toast.className = 'admin-order-toast';
  const itemsPreview = (order.items || [])
    .slice(0, 3)
    .map((item) => `<li>${item.quantity} x ${escapeHtml(item.name)}</li>`)
    .join('');
  const actions = getToastActions(order)
    .map((action) => `<button type="button" class="btn btn-sm btn-light toast-order-action" data-order-id="${escapeHtml(order.id)}" data-action="${action}">${actionLabel(action)}</button>`)
    .join('');

  toast.innerHTML = `
    <div class="admin-order-toast-top">
      <div>
        <div class="admin-order-toast-caption">New customer order</div>
        <strong class="admin-order-toast-id">${escapeHtml(order.id)}</strong>
        <div class="admin-order-toast-meta">${escapeHtml(order.customer.name)} • ${formatCurrency(order.total)}</div>
        <div class="admin-order-toast-meta muted">${escapeHtml(order.customer.phone)}</div>
      </div>
      <button type="button" class="dismiss-admin-order-toast" aria-label="Dismiss">×</button>
    </div>
    <ul class="admin-order-toast-items">${itemsPreview || '<li>No item details</li>'}</ul>
    <div class="admin-order-toast-actions">${actions}</div>
  `;

  stack.prepend(toast);

  const dismiss = toast.querySelector('.dismiss-admin-order-toast');
  dismiss?.addEventListener('click', () => toast.remove());

  window.setTimeout(() => {
    toast.remove();
  }, 9000);
}

async function sendAdminAction(orderId, action) {
  const readyTimeInput = document.querySelector(`.ready-time-input[data-id="${orderId}"]`);
  const readyInMinutes = readyTimeInput ? readyTimeInput.value : '';

  const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({
      action,
      readyInMinutes
    })
  });

  if (response.status === 401) {
    showSessionExpired();
    throw new Error('Unauthorized');
  }

  const result = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(result.error || 'Unable to update order.');
  }

  return result;
}

async function saveMenuItem(itemId, overrides = {}) {
  const imageInput = document.querySelector(`.menu-image-input[data-id="${itemId}"]`);
  const priceInput = document.querySelector(`.menu-price-input[data-id="${itemId}"]`);
  const stockInput = document.querySelector(`.menu-stock-input[data-id="${itemId}"]`);

  const payload = {
    image: imageInput ? imageInput.value.trim() : '',
    price: Number(priceInput ? priceInput.value : 0),
    available: Number(stockInput ? stockInput.value : 0),
    ...overrides
  };

  const response = await fetch(`/api/admin/menu/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 401) {
    showSessionExpired();
    throw new Error('Unauthorized');
  }

  const result = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(result.error || 'Unable to update menu item.');
  }

  return result;
}

async function uploadMenuImage(itemId, file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch(`/api/admin/menu/${encodeURIComponent(itemId)}/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({
      fileName: file.name,
      imageDataUrl: dataUrl
    })
  });

  if (response.status === 401) {
    showSessionExpired();
    throw new Error('Unauthorized');
  }

  const result = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(result.error || 'Unable to upload image.');
  }

  return result;
}

function disconnectStream() {
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
}

function connectStream() {
  disconnectStream();

  if (!adminToken) {
    return;
  }

  if (typeof io !== 'function') {
    liveBadge.textContent = 'Live: unavailable';
    liveBadge.className = 'badge text-bg-secondary fs-6 px-3 py-2 rounded-pill';
    notificationStatus.textContent = 'Socket unavailable';
    return;
  }

  adminSocket = io({
    transports: ['websocket', 'polling']
  });

  adminSocket.on('connect', () => {
    adminSocket.emit('admin:join', { token: adminToken });
  });

  adminSocket.on('admin:joined', () => {
    liveBadge.textContent = 'Live: connected';
    liveBadge.className = 'badge text-bg-success fs-6 px-3 py-2 rounded-pill';
    notificationStatus.textContent = 'Listening';
  });

  adminSocket.on('order:event', (message) => {
    if (message.type === 'new-order') {
      triggerBrowserNotice(message.order);
      loadOrders();
      return;
    }

    if (message.type === 'order-updated') {
      notificationStatus.textContent = 'Order updated';
      loadOrders();
      return;
    }

    if (message.type === 'order-deleted') {
      notificationStatus.textContent = 'Order deleted';
      loadOrders();
    }
  });

  adminSocket.on('admin:error', () => {
    liveBadge.textContent = 'Live: unauthorized';
    liveBadge.className = 'badge text-bg-danger fs-6 px-3 py-2 rounded-pill';
    notificationStatus.textContent = 'Unauthorized';
    clearSession();
  });

  adminSocket.on('disconnect', () => {
    liveBadge.textContent = 'Live: reconnecting';
    liveBadge.className = 'badge text-bg-warning fs-6 px-3 py-2 rounded-pill';
    notificationStatus.textContent = 'Reconnecting';
  });

  adminSocket.on('connect_error', () => {
    liveBadge.textContent = 'Live: reconnecting';
    liveBadge.className = 'badge text-bg-warning fs-6 px-3 py-2 rounded-pill';
    notificationStatus.textContent = 'Reconnecting';
  });

  adminSocket.io.on('reconnect', () => {
    if (adminSocket) {
      adminSocket.emit('admin:join', { token: adminToken });
    }
  });
}

function clearSession() {
  adminToken = '';
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  disconnectStream();
  setDashboardVisible(false);
}

async function initializeDashboard() {
  setDashboardVisible(true);
  await loadOrders();
  await loadMenuEditor();
  connectStream();
}

adminLoginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminLoginMessage.textContent = '';

  const formData = new FormData(adminLoginForm);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password')
  };

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.error || 'Unable to sign in.');
    }

    adminToken = result.token;
    localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    adminLoginForm.reset();
    await initializeDashboard();
  } catch (error) {
    adminLoginMessage.textContent = error.message;
  }
});

adminLogoutButton.addEventListener('click', () => {
  clearSession();
});

if (menuSearchInput) {
  menuSearchInput.addEventListener('input', (event) => {
    menuFilterQuery = event.target.value || '';
    renderMenuEditor(menuSections);
  });
}

soundToggle?.addEventListener('change', () => {
  alertSettings.soundEnabled = Boolean(soundToggle.checked);
  persistAlertSettings();
});

vibrationToggle?.addEventListener('change', () => {
  alertSettings.vibrationEnabled = Boolean(vibrationToggle.checked);
  persistAlertSettings();
});

document.addEventListener('click', async (event) => {
  const toastActionButton = event.target.closest('.toast-order-action');
  if (toastActionButton) {
    toastActionButton.disabled = true;
    try {
      await handleToastQuickAction(toastActionButton.dataset.orderId, toastActionButton.dataset.action);
      toastActionButton.closest('.admin-order-toast')?.remove();
    } catch (error) {
      adminMessage.className = 'alert alert-danger border-0';
      adminMessage.textContent = error.message || 'Unable to run quick action.';
      toastActionButton.disabled = false;
    }
    return;
  }

  const stockToggleButton = event.target.closest('.toggle-stock-state');
  if (stockToggleButton) {
    stockToggleButton.disabled = true;
    const itemId = stockToggleButton.dataset.id;
    const availableNow = Number(stockToggleButton.dataset.available || 0);

    try {
      if (availableNow > 0) {
        const confirmed = window.confirm('Switch this item to Out of stock?');
        if (!confirmed) {
          stockToggleButton.disabled = false;
          return;
        }

        await saveMenuItem(itemId, { available: 0 });
      } else {
        const restored = window.prompt('Item is Out of stock. Enter stock quantity to mark it In stock:', '10');
        if (restored === null) {
          stockToggleButton.disabled = false;
          return;
        }

        const quantity = Number(restored);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error('Enter a valid stock quantity greater than zero.');
        }

        await saveMenuItem(itemId, { available: Math.floor(quantity) });
      }

      await loadMenuEditor();
      adminMessage.className = 'alert alert-success border-0';
      adminMessage.textContent = 'Stock status updated successfully.';
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        adminMessage.className = 'alert alert-danger border-0';
        adminMessage.textContent = error.message;
      }
    } finally {
      stockToggleButton.disabled = false;
    }

    return;
  }

  const uploadButton = event.target.closest('.upload-menu-image');
  if (uploadButton) {
    uploadButton.disabled = true;
    const itemId = uploadButton.dataset.id;
    const fileInput = document.querySelector(`.menu-image-file-input[data-id="${itemId}"]`);
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    adminMessage.className = 'alert alert-dark border-0';
    adminMessage.textContent = 'Uploading image...';

    try {
      if (!file) {
        throw new Error('Select an image file first.');
      }

      await uploadMenuImage(itemId, file);
      await loadMenuEditor();
      adminMessage.className = 'alert alert-success border-0';
      adminMessage.textContent = 'Image uploaded and menu updated successfully.';
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        adminMessage.className = 'alert alert-danger border-0';
        adminMessage.textContent = error.message;
      }
    } finally {
      uploadButton.disabled = false;
    }

    return;
  }

  const menuButton = event.target.closest('.save-menu-item');
  if (menuButton) {
    menuButton.disabled = true;
    adminMessage.className = 'alert alert-dark border-0';
    adminMessage.textContent = 'Saving menu update...';

    try {
      await saveMenuItem(menuButton.dataset.id);
      await loadMenuEditor();
      adminMessage.className = 'alert alert-success border-0';
      adminMessage.textContent = 'Menu item updated successfully.';
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        adminMessage.className = 'alert alert-danger border-0';
        adminMessage.textContent = error.message;
      }
    } finally {
      menuButton.disabled = false;
    }

    return;
  }

  const actionButton = event.target.closest('.admin-action, .save-ready-time');
  if (!actionButton) {
    return;
  }

  actionButton.disabled = true;
  adminMessage.className = 'alert alert-dark border-0';
  adminMessage.textContent = 'Updating order...';

  try {
    const action = actionButton.dataset.action === 'save_ready_time' ? '' : actionButton.dataset.action;
    if (action === 'delete_order') {
      const confirmed = window.confirm('Delete this order permanently? This cannot be undone.');
      if (!confirmed) {
        actionButton.disabled = false;
        adminMessage.className = 'alert alert-dark border-0';
        adminMessage.textContent = 'Deletion cancelled.';
        return;
      }
    }

    const result = await sendAdminAction(actionButton.dataset.id, action);
    adminMessage.className = 'alert alert-success border-0';
    adminMessage.textContent = result.deletedId ? 'Order deleted successfully.' : 'Order updated successfully.';
    await loadOrders();
  } catch (error) {
    if (error.message !== 'Unauthorized') {
      adminMessage.className = 'alert alert-danger border-0';
      adminMessage.textContent = error.message;
    }
  } finally {
    actionButton.disabled = false;
  }
});

document.addEventListener('input', (event) => {
  const imageInput = event.target.closest('.menu-image-input');
  if (!imageInput) {
    return;
  }

  const preview = document.querySelector(`.menu-editor-preview[data-preview-id="${imageInput.dataset.id}"]`);
  if (preview) {
    preview.src = imageInput.value.trim() || preview.src;
  }
});

loadAlertSettings();
syncAlertToggleInputs();

if (adminToken) {
  initializeDashboard();
} else {
  setDashboardVisible(false);
}
