'use strict';

const ACTIVE_ORDER_KEY = 'ck-active-order-id';
const LAST_ORDER_KEY = 'ck-last-order-id';
function resolveApiBase() {
  const host = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const isLanIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const shouldUseDedicatedApiPort = window.location.port && window.location.port !== '3000';

  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000';
  }

  if ((isLocalHost || isLanIp) && shouldUseDedicatedApiPort) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return '';
}

const API_BASE = resolveApiBase();

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

const emptyOrderSection = document.getElementById('empty-order-section');
const statusContent = document.getElementById('status-content');
const orderIdDisplay = document.getElementById('order-id-display');
const paymentStatusDisplay = document.getElementById('payment-status-display');
const kitchenStatusDisplay = document.getElementById('kitchen-status-display');
const readyTimeDisplay = document.getElementById('ready-time-display');
const orderTimeline = document.getElementById('order-timeline');
const newOrderBtn = document.getElementById('new-order-btn');

let pollHandle = 0;
let customerStream = null;

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function displayPaymentStatus(status, methodKey, orderState) {
  const value = String(status || '').toLowerCase();
  const codStatesConfirmed = ['accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'];

  if (value.includes('pending manual confirmation') || value.includes('blockchain confirmation pending')) {
    return 'Confirm payment';
  }

  if (value === 'paid' || value === 'cash collected' || (methodKey === 'cod' && codStatesConfirmed.includes(orderState))) {
    return 'Payment/order confirmed';
  }

  if (methodKey === 'cod' && value.includes('unpaid')) {
    return 'Pending confirmation';
  }

  if (value.includes('awaiting')) {
    return 'Pending confirmation';
  }

  return status || 'Pending confirmation';
}

function renderOrder(order) {
  orderIdDisplay.textContent = order.id || '—';
  paymentStatusDisplay.textContent = displayPaymentStatus(order.paymentStatus, order.paymentMethodKey, order.orderState);
  kitchenStatusDisplay.textContent = order.fulfillmentStatus || '—';
  readyTimeDisplay.textContent = order.readyInMinutes ? `${order.readyInMinutes} minutes` : 'Awaiting kitchen update';

  const timeline = Array.isArray(order.timeline) ? order.timeline.slice().reverse() : [];
  orderTimeline.innerHTML = timeline.map((entry, idx) => `
    <div class="timeline-entry ${idx === 0 ? 'is-current' : ''}">
      <strong>${entry.label}</strong>
      <div class="tl-detail">${entry.detail || ''}</div>
      <div class="tl-time">${formatDateTime(entry.at)}</div>
    </div>
  `).join('');

  emptyOrderSection.classList.add('d-none');
  statusContent.classList.remove('d-none');
}

async function fetchOrder(orderId) {
  const res = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}`));
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error((data && data.error) || `Unable to load order (${res.status}).`);
  }
  if (!data) {
    throw new Error('Server returned an invalid response while loading order.');
  }
  return data;
}

function startPolling(orderId) {
  if (pollHandle) {
    clearInterval(pollHandle);
  }

  pollHandle = setInterval(async () => {
    try {
      const data = await fetchOrder(orderId);
      renderOrder(data.order);
      if (data.order.orderState === 'completed') {
        clearInterval(pollHandle);
        pollHandle = 0;
      }
    } catch (_) {
      clearInterval(pollHandle);
      pollHandle = 0;
    }
  }, 12000);
}

function connectCustomerStream(orderId) {
  if (customerStream) {
    customerStream.close();
    customerStream = null;
  }

  customerStream = new EventSource(apiUrl(`/api/orders/${encodeURIComponent(orderId)}/stream`));
  customerStream.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'order-updated' && message.order) {
        renderOrder(message.order);
      }
      if (message.type === 'order-deleted') {
        clearSession();
        showEmptyState();
      }
    } catch (_) {
      // Ignore malformed events.
    }
  };
}

function clearSession() {
  sessionStorage.removeItem(ACTIVE_ORDER_KEY);
  sessionStorage.removeItem(LAST_ORDER_KEY);
}

function showEmptyState() {
  if (customerStream) {
    customerStream.close();
    customerStream = null;
  }
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = 0;
  }
  statusContent.classList.add('d-none');
  emptyOrderSection.classList.remove('d-none');
}

async function initializeStatusPage() {
  const orderId = sessionStorage.getItem(ACTIVE_ORDER_KEY) || sessionStorage.getItem(LAST_ORDER_KEY);
  if (!orderId) {
    showEmptyState();
    return;
  }

  try {
    const data = await fetchOrder(orderId);
    renderOrder(data.order);
    connectCustomerStream(orderId);
    startPolling(orderId);
  } catch (_) {
    clearSession();
    showEmptyState();
  }
}

newOrderBtn.addEventListener('click', () => {
  clearSession();
  window.location.href = 'index.html#checkout';
});

initializeStatusPage();
