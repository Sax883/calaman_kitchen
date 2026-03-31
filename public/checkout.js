/* checkout.js — Calaman's Kitchen checkout page logic */
'use strict';

const CART_KEY = 'calamans-kitchen-cart';
const ACTIVE_ORDER_KEY = 'ck-active-order-id';
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

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

// ── DOM refs ──────────────────────────────────────────────────────────────────
const emptySec       = document.getElementById('empty-cart-section');
const checkoutSec    = document.getElementById('checkout-section');
const formPanel      = document.getElementById('form-panel');
const paymentPanel   = document.getElementById('payment-panel');
const trackerPanel   = document.getElementById('tracker-panel');
const formEl         = document.getElementById('checkout-form');
const formMsg        = document.getElementById('form-message');
const placeBtn       = document.getElementById('place-order-btn');
const placeBtnText   = document.getElementById('place-order-text');
const placeBtnSpinner= document.getElementById('place-order-spinner');
const cartItemsEl    = document.getElementById('cart-items');
const cartTotalEl    = document.getElementById('cart-total');
const paymentPanelText = document.getElementById('payment-panel-text');
const orderSuccessPopup = document.getElementById('order-success-popup');
const orderSuccessPopupText = document.getElementById('order-success-popup-text');
const orderSuccessPopupOrder = document.getElementById('order-success-popup-order');
const orderSuccessPopupId = document.getElementById('order-success-popup-id');
const orderSuccessPopupClose = document.getElementById('order-success-popup-close');

// Bank refs
const bankTransferBlock = document.getElementById('bank-transfer-block');
const bankSubmitBtn  = document.getElementById('bank-submit-btn');
const bankSubmitMsg  = document.getElementById('bank-submit-msg');
const bankAmountDisplay = document.getElementById('bank-amount-display');

// Crypto refs
const cryptoBlock    = document.getElementById('crypto-block');
const cryptoSubmitBtn= document.getElementById('crypto-submit-btn');
const cryptoSubmitMsg= document.getElementById('crypto-submit-msg');
const cryptoCountdown= document.getElementById('crypto-countdown');
const cryptoExpiresLabel = document.getElementById('crypto-expires-label');
const cryptoAmountDisplay = document.getElementById('crypto-amount-display');

// COD refs
const codBlock       = document.getElementById('cod-block');

// Tracker refs
const orderIdDisplay       = document.getElementById('order-id-display');
const paymentStatusDisplay = document.getElementById('payment-status-display');
const kitchenStatusDisplay = document.getElementById('kitchen-status-display');
const readyTimeDisplay     = document.getElementById('ready-time-display');
const orderTimeline        = document.getElementById('order-timeline');
const newOrderBtn          = document.getElementById('new-order-btn');

// Step bar
const stepEls = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3')
];

// ── State ─────────────────────────────────────────────────────────────────────
let cart = [];
let activeOrderId  = '';
let activeOrder    = null;
let pollHandle     = 0;
let countdownHandle = 0;
let customerStream = null;

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

function displayPaymentStatus(status, methodKey) {
  const value = String(status || '').toLowerCase();

  if (value.includes('pending manual confirmation') || value.includes('blockchain confirmation pending')) {
    return 'Confirm payment';
  }

  if (value === 'paid' || value === 'cash collected') {
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

function showFormAlert(msg, type) {
  formMsg.className = `alert alert-${type}`;
  formMsg.textContent = msg;
  formMsg.classList.remove('d-none');
}

function hideFormAlert() {
  formMsg.classList.add('d-none');
}

function setPlaceBtnLoading(loading) {
  placeBtn.disabled = loading;
  placeBtnText.textContent = loading ? 'Placing order…' : 'Place Order';
  placeBtnSpinner.classList.toggle('d-none', !loading);
}

function setStep(stepIndex) {
  stepEls.forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < stepIndex)  el.classList.add('done');
    if (i === stepIndex) el.classList.add('active');
  });
}

function playCustomerOrderTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const now = audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const start = now + index * 0.14;
      const end = start + 0.18;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0.0001, start);
      gainNode.gain.exponentialRampToValueAtTime(0.15, start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.start(start);
      oscillator.stop(end);
    });

    window.setTimeout(() => {
      audioContext.close().catch(() => {});
    }, 900);
  } catch (_) {
    // Ignore audio playback failures on restricted browsers.
  }
}

function triggerOrderSuccessFeedback() {
  playCustomerOrderTone();
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([120, 70, 120]);
  }
}

function showOrderSuccessPopup(order) {
  if (!orderSuccessPopup || !orderSuccessPopupText || !orderSuccessPopupOrder || !orderSuccessPopupId) {
    return;
  }

  const methodLabel = order.paymentMethodKey === 'cod'
    ? 'Your order is now in the kitchen queue and you can pay on delivery.'
    : 'Your order is now waiting for payment confirmation. Follow the next step on this page.';

  orderSuccessPopupText.textContent = methodLabel;
  orderSuccessPopupId.textContent = order.id || '-';
  orderSuccessPopupOrder.classList.toggle('d-none', !order.id);
  orderSuccessPopup.classList.remove('d-none');
  document.body.style.overflow = 'hidden';
  triggerOrderSuccessFeedback();
}

function hideOrderSuccessPopup() {
  if (!orderSuccessPopup) {
    return;
  }

  orderSuccessPopup.classList.add('d-none');
  document.body.style.overflow = '';
}

window.copyText = function(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = btn.querySelector('i');
    icon.className = 'bi bi-check2';
    setTimeout(() => { icon.className = 'bi bi-copy'; }, 1800);
  });
};

// ── Cart ──────────────────────────────────────────────────────────────────────
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cart)) cart = [];
  } catch (_) {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function clearCart() {
  cart = [];
  saveCart();
}

function renderCart() {
  if (!cartItemsEl || !cartTotalEl) {
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<div class="text-muted small">No items in cart.</div>';
    cartTotalEl.textContent = formatCurrency(0);
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-row">
      <div>
        <h4>${item.name}</h4>
        <div class="text-muted small">${formatCurrency(item.price)} × ${item.quantity}</div>
      </div>
      <strong>${formatCurrency(item.price * item.quantity)}</strong>
    </div>
  `).join('');
  cartTotalEl.textContent = formatCurrency(total);
}

function checkCartEmpty() {
  if (cart.length === 0) {
    emptySec.classList.remove('d-none');
    checkoutSec.classList.add('d-none');
    return true;
  }
  emptySec.classList.add('d-none');
  checkoutSec.classList.remove('d-none');
  return false;
}

// ── Payment method preview ────────────────────────────────────────────────────
function updatePaymentMethodPreview() {
  // No live preview needed on step 1 — this is shown after order placed
}

// ── Countdown timer ───────────────────────────────────────────────────────────
function startCountdown(expiresAt) {
  if (countdownHandle) clearInterval(countdownHandle);

  function tick() {
    const ms = new Date(expiresAt) - Date.now();
    if (ms <= 0) {
      clearInterval(countdownHandle);
      cryptoCountdown.textContent = '00:00';
      cryptoCountdown.className = 'urgent';
      return;
    }
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    cryptoCountdown.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    if (ms < 180000) cryptoCountdown.classList.add('urgent');
    else cryptoCountdown.classList.remove('urgent');
  }

  tick();
  countdownHandle = setInterval(tick, 1000);
}

// ── Show payment panel after order placed ────────────────────────────────────
function showPaymentPanel(order, instructions) {
  const method = order.paymentMethodKey;
  const total  = formatCurrency(order.total);

  bankTransferBlock.classList.remove('is-visible');
  cryptoBlock.classList.remove('is-visible');
  codBlock.classList.remove('is-visible');

  if (method === 'bank_transfer') {
    paymentPanelText.textContent = `Send ${total} to Calaman's Kitchen via bank transfer, then click \"I have sent my payment\".`;
    bankAmountDisplay.textContent = total;
    bankTransferBlock.classList.add('is-visible');
  } else if (method === 'crypto') {
    paymentPanelText.textContent = `Send your crypto payment, then click \"I have sent my payment\" so admin can confirm.`;
    cryptoAmountDisplay.textContent = `≈ ${(order.total / 1500).toFixed(2)} USDT`;
    cryptoExpiresLabel.textContent = instructions.expiresAt ? `Expires: ${formatDateTime(instructions.expiresAt)}` : '';
    if (instructions.walletAddress) {
      document.getElementById('crypto-wallet-display').textContent = instructions.walletAddress;
    }
    if (instructions.wallets && instructions.wallets.btc) {
      document.getElementById('crypto-wallet-btc').textContent = instructions.wallets.btc;
    }
    if (instructions.wallets && instructions.wallets.eth) {
      document.getElementById('crypto-wallet-eth').textContent = instructions.wallets.eth;
    }
    cryptoBlock.classList.add('is-visible');
    if (instructions.expiresAt) startCountdown(instructions.expiresAt);
  } else {
    paymentPanelText.textContent = 'Your order is pending admin confirmation. Payment will be made on delivery.';
    codBlock.classList.add('is-visible');
  }

  bankSubmitMsg.textContent = '';
  cryptoSubmitMsg.textContent = '';
  paymentPanel.classList.remove('d-none');
  formPanel.classList.add('d-none');
  setStep(1);
}

// ── Render order tracker ──────────────────────────────────────────────────────
function renderTracker(order) {
  orderIdDisplay.textContent       = order.id || '—';
  paymentStatusDisplay.textContent = displayPaymentStatus(order.paymentStatus, order.paymentMethodKey);
  kitchenStatusDisplay.textContent = order.fulfillmentStatus || '—';
  readyTimeDisplay.textContent     = order.readyInMinutes ? `${order.readyInMinutes} minutes` : 'Awaiting kitchen update';

  const status = String(order.paymentStatus || '').toLowerCase();
  const codStatesConfirmed = ['accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'];
  const isConfirmed = status === 'paid'
    || status === 'cash collected'
    || (order.paymentMethodKey === 'cod' && codStatesConfirmed.includes(order.orderState));

  if (isConfirmed) {
    setStep(2);
  } else {
    setStep(1);
  }

  const timeline = Array.isArray(order.timeline) ? order.timeline.slice().reverse() : [];
  orderTimeline.innerHTML = timeline.map((entry, idx) => `
    <div class="timeline-entry ${idx === 0 ? 'is-current' : ''}">
      <strong>${entry.label}</strong>
      <div class="tl-detail">${entry.detail || ''}</div>
      <div class="tl-time">${formatDateTime(entry.at)}</div>
    </div>
  `).join('');

  trackerPanel.classList.remove('d-none');
}

function showTrackerAfterCOD(order) {
  paymentPanel.classList.add('d-none');
  renderTracker(order);
}

async function restoreActiveOrder() {
  const orderId = sessionStorage.getItem(ACTIVE_ORDER_KEY) || sessionStorage.getItem('ck-last-order-id');
  if (!orderId) {
    return false;
  }

  try {
    const data = await fetchOrder(orderId);
    const order = data.order;
    const instructions = data.paymentInstructions || {};
    const status = String(order.paymentStatus || '').toLowerCase();
    const paymentSubmitted = Boolean(order.paymentSubmittedAt)
      || status.includes('pending manual confirmation')
      || status.includes('blockchain confirmation pending')
      || status === 'paid'
      || status === 'cash collected';

    activeOrderId = order.id;
    activeOrder = order;

    emptySec.classList.add('d-none');
    checkoutSec.classList.remove('d-none');
    formPanel.classList.add('d-none');

    if (order.paymentMethodKey === 'cod') {
      showTrackerAfterCOD(order);
    } else if (paymentSubmitted) {
      window.location.href = 'order-status.html';
      return true;
    } else {
      trackerPanel.classList.add('d-none');
      showPaymentPanel(order, instructions);
    }

    connectCustomerStream(order.id);
    startPolling(order.id);
    sessionStorage.setItem(ACTIVE_ORDER_KEY, order.id);
    return true;
  } catch (_) {
    sessionStorage.removeItem(ACTIVE_ORDER_KEY);
    return false;
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function fetchOrder(orderId) {
  const res = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderId)}`));
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error((data && data.error) || `Unable to load order (${res.status}).`);
  if (!data) throw new Error('Server returned an invalid response while loading order.');
  return data;
}

async function submitPaymentEvidence(type) {
  if (!activeOrderId) return;

  const btn = type === 'bank' ? bankSubmitBtn : cryptoSubmitBtn;
  const msgEl = type === 'bank' ? bankSubmitMsg : cryptoSubmitMsg;

  btn.disabled = true;
  msgEl.textContent = 'Submitting...';

  try {
    const res = await fetch(apiUrl(`/api/orders/${encodeURIComponent(activeOrderId)}/payment-submitted`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionReference: `${type.toUpperCase()}-CUSTOMER-SUBMITTED`,
        paymentIntentDeclared: true
      })
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error((data && data.error) || `Failed to submit payment (${res.status}).`);
    if (!data) throw new Error('Server returned an invalid response while submitting payment.');

    msgEl.textContent = 'Confirm payment submitted. Waiting for admin confirmation.';
    activeOrder = data.order;
    sessionStorage.setItem(ACTIVE_ORDER_KEY, activeOrderId);
    sessionStorage.setItem('ck-last-order-id', activeOrderId);
    window.location.href = 'order-status.html';
  } catch (err) {
    msgEl.textContent = err.message || 'Failed to submit.';
  } finally {
    btn.disabled = false;
  }
}

// ── Polling ───────────────────────────────────────────────────────────────────
function startPolling(orderId) {
  if (pollHandle) clearInterval(pollHandle);
  pollHandle = setInterval(async () => {
    try {
      const data = await fetchOrder(orderId);
      activeOrder = data.order;
      renderTracker(data.order);
      // If order is completed stop polling
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
        activeOrder = message.order;
        renderTracker(message.order);
        if (message.order.orderState === 'completed') {
          customerStream.close();
          customerStream = null;
        }
      }
    } catch (_) {
      // Ignore malformed SSE payloads.
    }
  };

  customerStream.onerror = () => {
    // Polling remains as fallback.
  };
}

// ── Place order ───────────────────────────────────────────────────────────────
async function handlePlaceOrder(event) {
  event.preventDefault();
  hideFormAlert();

  if (cart.length === 0) {
    showFormAlert('Your cart is empty. Go back to the menu and add items.', 'warning');
    return;
  }

  setPlaceBtnLoading(true);

  const data = new FormData(formEl);
  const payload = {
    customer: {
      name:    (data.get('name')    || '').trim(),
      phone:   (data.get('phone')   || '').trim(),
      address: (data.get('address') || '').trim()
    },
    deliveryTime:  data.get('deliveryTime')  || 'As soon as possible',
    paymentMethod: data.get('paymentMethod') || 'Bank transfer',
    notes:         (data.get('notes')        || '').trim(),
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.price * item.quantity
    })),
    total: cart.reduce((s, i) => s + i.price * i.quantity, 0)
  };

  try {
    const res = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error((result && result.error) || `Unable to place order (${res.status}).`);
    }

    if (!result) {
      throw new Error('Server returned an invalid response while placing order.');
    }

    activeOrderId = result.order.id;
    activeOrder   = result.order;

    // Save order ID so user can find it if they refresh
    sessionStorage.setItem('ck-last-order-id', activeOrderId);
    sessionStorage.setItem(ACTIVE_ORDER_KEY, activeOrderId);

    clearCart();
    renderCart();
    showPaymentPanel(result.order, result.paymentInstructions);

    // COD: skip payment panel, go straight to tracker
    if (result.order.paymentMethodKey === 'cod') {
      showTrackerAfterCOD(result.order);
    }

    showOrderSuccessPopup(result.order);

    connectCustomerStream(result.order.id);
    startPolling(result.order.id);
  } catch (err) {
    showFormAlert(err.message || 'Something went wrong. Please try again.', 'danger');
  } finally {
    setPlaceBtnLoading(false);
  }
}

// ── New order ─────────────────────────────────────────────────────────────────
function handleNewOrder() {
  if (pollHandle) clearInterval(pollHandle);
  if (countdownHandle) clearInterval(countdownHandle);
  if (customerStream) {
    customerStream.close();
    customerStream = null;
  }
  activeOrderId = '';
  activeOrder   = null;
  sessionStorage.removeItem(ACTIVE_ORDER_KEY);
  sessionStorage.removeItem('ck-last-order-id');

  formEl.reset();
  hideFormAlert();
  formPanel.classList.remove('d-none');
  paymentPanel.classList.add('d-none');
  trackerPanel.classList.add('d-none');
  setStep(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  checkCartEmpty();
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function initializeCheckout() {
  loadCart();
  renderCart();

  const restored = await restoreActiveOrder();
  if (!restored && !checkCartEmpty()) {
    setStep(0);
  }

  formEl.addEventListener('submit', handlePlaceOrder);
  bankSubmitBtn.addEventListener('click', () => submitPaymentEvidence('bank'));
  cryptoSubmitBtn.addEventListener('click', () => submitPaymentEvidence('crypto'));
  newOrderBtn.addEventListener('click', handleNewOrder);
  if (orderSuccessPopupClose) {
    orderSuccessPopupClose.addEventListener('click', hideOrderSuccessPopup);
  }
  if (orderSuccessPopup) {
    orderSuccessPopup.addEventListener('click', (event) => {
      if (event.target === orderSuccessPopup) {
        hideOrderSuccessPopup();
      }
    });
  }
}

initializeCheckout();
