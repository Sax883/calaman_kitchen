const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(rootDir, 'data');
const ordersFile = path.join(dataDir, 'orders.json');
const inventoryFile = path.join(dataDir, 'inventory.json');
const menuFile = path.join(dataDir, 'menu.json');
const CRYPTO_WEBHOOK_SECRET = process.env.CRYPTO_WEBHOOK_SECRET || 'calaman-crypto-demo-secret';
const ADMIN_USERNAME = "calaman's_kitchen";
const ADMIN_PASSWORD = '@calaman081';
const ADMIN_TOKEN = Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64');

const paymentDetails = {
  bankTransfer: {
    accountName: "Calaman's Kitchen",
    bankName: 'Moniepoint Microfinance Bank',
    accountNumber: '08159462435',
    note: 'Upload your proof of payment or enter your transfer reference after placing the order.'
  },
  crypto: {
    network: 'USDT (TRC20)',
    walletAddress: 'TRC20-DEMO-WALLET-ADDRESS',
    confirmationWindowMinutes: 15,
    note: 'Send the exact amount, then submit the transaction hash while the blockchain confirms the payment.'
  }
};

const defaultInventory = {
  'rice-1': { name: 'Smoky Party Jollof Rice', available: 40 },
  'rice-2': { name: 'Premium Fried Rice', available: 35 },
  'rice-3': { name: 'Coconut Rice', available: 28 },
  'rice-4': { name: 'Native Rice', available: 24 },
  'rice-5': { name: 'Basmati Special Rice', available: 22 },
  'rice-6': { name: 'Designer Spaghetti', available: 32 },
  'protein-1': { name: 'Peppered Chicken', available: 30 },
  'protein-2': { name: 'Turkey Wings', available: 24 },
  'protein-3': { name: 'Beef', available: 40 },
  'protein-4': { name: 'Goat Meat', available: 18 },
  'protein-5': { name: 'Assorted Meat', available: 20 },
  'protein-6': { name: 'Catfish', available: 16 },
  'protein-7': { name: 'Croaker Fish', available: 14 },
  'protein-8': { name: 'Grilled Prawn', available: 12 },
  'protein-9': { name: 'Boiled Egg', available: 50 },
  'protein-10': { name: 'Snail', available: 10 },
  'soup-1': { name: 'Egusi Soup', available: 26 },
  'soup-2': { name: 'Afang Soup', available: 20 },
  'soup-3': { name: 'Ogbono Soup', available: 24 },
  'soup-4': { name: 'Vegetable Soup', available: 24 },
  'soup-5': { name: 'Bitterleaf Soup', available: 18 },
  'soup-6': { name: 'Okra Soup', available: 26 },
  'swallow-1': { name: 'Garri', available: 35 },
  'swallow-2': { name: 'Semovita', available: 28 },
  'swallow-3': { name: 'Loi-loi', available: 20 },
  'swallow-4': { name: 'Poundo Yam', available: 25 }
};

const sseClients = new Set();
const customerOrderStreams = new Map();
const menuStreams = new Set();

paymentDetails.crypto.wallets = {
  btc: 'BTC-DEMO-WALLET-ADDRESS',
  usdt: paymentDetails.crypto.walletAddress,
  eth: 'ETH-DEMO-WALLET-ADDRESS'
};

function ensureJsonFile(filePath, fallbackValue) {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2), 'utf8');
  }
}

function readJson(filePath, fallbackValue) {
  ensureJsonFile(filePath, fallbackValue);

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
}

function writeJson(filePath, value) {
  ensureJsonFile(filePath, Array.isArray(value) ? [] : {});
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function ensureInventoryShape(inventory) {
  const merged = { ...defaultInventory };

  for (const [itemId, itemValue] of Object.entries(inventory || {})) {
    merged[itemId] = {
      ...(defaultInventory[itemId] || { name: itemId, available: 0 }),
      ...itemValue
    };
  }

  return merged;
}

function ensureMenuShape(menu) {
  const fallbackMenu = readJson(menuFile, {});
  const merged = { ...fallbackMenu };

  for (const [itemId, itemValue] of Object.entries(menu || {})) {
    merged[itemId] = {
      ...(merged[itemId] || {}),
      ...itemValue
    };
  }

  return merged;
}

function readOrders() {
  const orders = readJson(ordersFile, []);
  return Array.isArray(orders) ? orders : [];
}

function writeOrders(orders) {
  writeJson(ordersFile, orders);
}

function readMenuConfig() {
  return ensureMenuShape(readJson(menuFile, {}));
}

function writeMenuConfig(menu) {
  writeJson(menuFile, ensureMenuShape(menu));
}

function readInventory() {
  const inventory = ensureInventoryShape(readJson(inventoryFile, defaultInventory));
  writeJson(inventoryFile, inventory);
  return inventory;
}

function writeInventory(inventory) {
  writeJson(inventoryFile, ensureInventoryShape(inventory));
}

function sanitizeUploadBaseName(value) {
  const base = String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base || 'menu-image';
}

function saveMenuImageFromDataUrl(itemId, imageDataUrl, fileName) {
  const match = String(imageDataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp));base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) {
    throw new Error('Unsupported image format. Use PNG, JPG, or WEBP.');
  }

  const mimeType = match[1].toLowerCase();
  const extensionByMime = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp'
  };
  const extension = extensionByMime[mimeType];
  if (!extension) {
    throw new Error('Unsupported image format.');
  }

  const buffer = Buffer.from(match[3], 'base64');
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
    throw new Error('Image is empty or too large. Max size is 6MB.');
  }

  const uploadsDir = path.join(publicDir, 'assets', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const safeBase = sanitizeUploadBaseName(fileName || itemId);
  const savedName = `${safeBase}-${Date.now()}.${extension}`;
  fs.writeFileSync(path.join(uploadsDir, savedName), buffer);

  return `assets/uploads/${savedName}`;
}

function buildMenuSections() {
  const menuConfig = readMenuConfig();
  const inventory = readInventory();
  const sections = {
    rice: [],
    proteins: [],
    soups: [],
    swallow: []
  };

  for (const [itemId, itemValue] of Object.entries(menuConfig)) {
    const category = itemValue.category;
    if (!sections[category]) {
      continue;
    }

    const stock = inventory[itemId] || { available: 0, name: itemValue.name };
    sections[category].push({
      id: itemId,
      name: itemValue.name,
      price: Number(itemValue.price || 0),
      image: itemValue.image,
      description: itemValue.description,
      available: Number(stock.available || 0)
    });
  }

  return sections;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 8e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, Authorization'
  });
  res.end(JSON.stringify(payload));
}

function requireAdmin(req, res, url) {
  const authorization = req.headers.authorization;
  const bearer = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  const token = url.searchParams.get('token');

  if (bearer === ADMIN_TOKEN || token === ADMIN_TOKEN) {
    return true;
  }

  sendJson(res, 401, { error: 'Unauthorized' });
  return false;
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };

    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function normalizePaymentMethod(paymentMethod) {
  const value = String(paymentMethod || '').trim().toLowerCase();

  if (value === 'bank transfer' || value === 'bank_transfer') {
    return 'bank_transfer';
  }

  if (value === 'crypto payment' || value === 'crypto') {
    return 'crypto';
  }

  return 'cod';
}

function paymentMethodLabel(paymentMethod) {
  if (paymentMethod === 'bank_transfer') {
    return 'Bank transfer';
  }

  if (paymentMethod === 'crypto') {
    return 'Crypto payment';
  }

  return 'Payment on delivery';
}

function createTimelineEntry(label, detail) {
  return {
    at: new Date().toISOString(),
    label,
    detail: detail || ''
  };
}

function computeDisplayStatus(order) {
  if (order.orderState === 'completed') {
    return 'Delivered';
  }

  if (order.orderState === 'out_for_delivery') {
    return 'Food on the way';
  }

  if (order.orderState === 'ready') {
    return 'Ready for dispatch';
  }

  if (order.orderState === 'preparing') {
    return 'Preparing meal';
  }

  if (order.orderState === 'accepted') {
    return 'Kitchen accepted';
  }

  if (order.paymentStatus === 'Pending manual confirmation') {
    return 'Payment under review';
  }

  if (order.paymentStatus === 'Blockchain confirmation pending') {
    return 'Crypto confirmation pending';
  }

  if (order.orderState === 'processing') {
    return 'Processing queue';
  }

  return 'Awaiting payment';
}

function computeCustomerMessage(order) {
  if (order.orderState === 'awaiting_payment') {
    if (order.paymentMethod === 'bank_transfer') {
      return 'We are waiting for your transfer proof. Once verified, the kitchen will review capacity and accept the meal.';
    }

    if (order.paymentMethod === 'crypto') {
      return 'Send the crypto payment and submit the transaction hash. The order will move forward once the blockchain confirms it.';
    }

    return 'Your order has been created and is awaiting payment.';
  }

  if (order.orderState === 'processing') {
    return 'Your order is in the processing queue. The kitchen will confirm capacity and start preparation shortly.';
  }

  if (order.orderState === 'accepted') {
    return 'Your order has been accepted by the kitchen. Preparation can begin immediately.';
  }

  if (order.orderState === 'preparing') {
    return 'Your meal is being prepared right now.';
  }

  if (order.orderState === 'ready') {
    return 'Your order is ready for pickup or dispatch.';
  }

  if (order.orderState === 'out_for_delivery') {
    return 'Your order is on the way.';
  }

  if (order.orderState === 'completed') {
    return 'Your order has been delivered successfully.';
  }

  return 'Your order is being reviewed.';
}

function getPaymentInstructions(order) {
  if (order.paymentMethod === 'bank_transfer') {
    return {
      type: 'bank-transfer',
      accountName: paymentDetails.bankTransfer.accountName,
      bankName: paymentDetails.bankTransfer.bankName,
      accountNumber: paymentDetails.bankTransfer.accountNumber,
      note: paymentDetails.bankTransfer.note
    };
  }

  if (order.paymentMethod === 'crypto') {
    return {
      type: 'crypto',
      network: paymentDetails.crypto.network,
      walletAddress: paymentDetails.crypto.walletAddress,
      wallets: paymentDetails.crypto.wallets,
      confirmationWindowMinutes: paymentDetails.crypto.confirmationWindowMinutes,
      expiresAt: order.cryptoExpiresAt,
      note: paymentDetails.crypto.note
    };
  }

  return {
    type: 'cod',
    note: 'Your order moves directly to kitchen review. Payment stays unpaid until cash is collected after delivery.'
  };
}

function reserveInventory(items) {
  const inventory = readInventory();
  const reservation = [];

  for (const item of items) {
    const stockItem = inventory[item.id];
    const quantity = Number(item.quantity || 0);

    if (!stockItem) {
      throw new Error(`Inventory is not configured for ${item.name}.`);
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.name}.`);
    }

    if (stockItem.available < quantity) {
      throw new Error(`${item.name} is low in stock. Available quantity: ${stockItem.available}.`);
    }
  }

  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    inventory[item.id].available -= quantity;
    reservation.push({
      itemId: item.id,
      name: inventory[item.id].name,
      reserved: quantity,
      remaining: inventory[item.id].available
    });
  }

  writeInventory(inventory);
  broadcastMenuUpdate();
  return reservation;
}

function validateOrder(order) {
  if (!order || typeof order !== 'object') {
    return 'Order payload is missing.';
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    return 'Add at least one menu item before placing your order.';
  }

  const requiredFields = ['name', 'phone', 'address'];
  for (const field of requiredFields) {
    if (!order.customer || !String(order.customer[field] || '').trim()) {
      return `Customer ${field} is required.`;
    }
  }

  if (!Number.isFinite(Number(order.total)) || Number(order.total) <= 0) {
    return 'Order total must be valid.';
  }

  return null;
}

function createOrder(body) {
  const paymentMethod = normalizePaymentMethod(body.paymentMethod);
  const createdAt = new Date().toISOString();
  const reservation = reserveInventory(body.items);
  const isCod = paymentMethod === 'cod';
  const order = {
    id: `CK-${String(Date.now()).slice(-8)}`,
    createdAt,
    updatedAt: createdAt,
    customer: {
      name: String(body.customer.name || '').trim(),
      phone: String(body.customer.phone || '').trim(),
      address: String(body.customer.address || '').trim()
    },
    deliveryTime: String(body.deliveryTime || 'As soon as possible').trim(),
    paymentMethod,
    paymentMethodLabel: paymentMethodLabel(paymentMethod),
    notes: String(body.notes || '').trim(),
    items: body.items,
    total: Number(body.total),
    transactionReference: '',
    proofOfPaymentDataUrl: '',
    proofOfPaymentName: '',
    inventoryReservation: reservation,
    readyInMinutes: '',
    acceptedAt: '',
    paidAt: '',
    paymentCollectedAt: '',
    paymentSubmittedAt: '',
    cryptoExpiresAt: paymentMethod === 'crypto'
      ? new Date(Date.now() + paymentDetails.crypto.confirmationWindowMinutes * 60 * 1000).toISOString()
      : '',
    cryptoConfirmations: 0,
    paymentStatus: isCod ? 'Unpaid - collect on delivery' : paymentMethod === 'crypto' ? 'Awaiting crypto transfer' : 'Awaiting bank transfer',
    fulfillmentStatus: isCod ? 'Pending kitchen acceptance' : 'Awaiting payment confirmation',
    orderState: isCod ? 'processing' : 'awaiting_payment',
    timeline: [
      createTimelineEntry('Order placed', 'Customer submitted checkout details.'),
      createTimelineEntry(
        isCod ? 'Queued for kitchen review' : 'Awaiting payment',
        isCod ? 'Payment will be collected after delivery.' : `Waiting for ${paymentMethodLabel(paymentMethod).toLowerCase()} confirmation.`
      )
    ]
  };

  order.status = computeDisplayStatus(order);
  order.customerMessage = computeCustomerMessage(order);
  return order;
}

function getPublicOrder(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.customer,
    deliveryTime: order.deliveryTime,
    paymentMethod: order.paymentMethodLabel,
    paymentMethodKey: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    orderState: order.orderState,
    status: order.status,
    customerMessage: order.customerMessage,
    readyInMinutes: order.readyInMinutes,
    total: order.total,
    notes: order.notes,
    items: order.items,
    transactionReference: order.transactionReference,
    paymentSubmittedAt: order.paymentSubmittedAt,
    paidAt: order.paidAt,
    acceptedAt: order.acceptedAt,
    paymentCollectedAt: order.paymentCollectedAt,
    proofOfPaymentName: order.proofOfPaymentName,
    proofOfPaymentProvided: Boolean(order.proofOfPaymentDataUrl),
    proofOfPaymentDataUrl: order.proofOfPaymentDataUrl,
    cryptoExpiresAt: order.cryptoExpiresAt,
    cryptoConfirmations: order.cryptoConfirmations,
    timeline: order.timeline || []
  };
}

function broadcast(type, order) {
  const payload = `data: ${JSON.stringify({ type, order: getPublicOrder(order) })}\n\n`;
  const publicOrder = getPublicOrder(order);

  io.to('admins').emit('order:event', {
    type,
    order: publicOrder
  });

  for (const client of sseClients) {
    client.write(payload);
  }

  const orderClients = customerOrderStreams.get(order.id);
  if (orderClients) {
    for (const client of orderClients) {
      client.write(payload);
    }
  }
}

function broadcastDeleted(orderId) {
  const payload = `data: ${JSON.stringify({ type: 'order-deleted', orderId })}\n\n`;

  io.to('admins').emit('order:event', {
    type: 'order-deleted',
    orderId
  });

  for (const client of sseClients) {
    client.write(payload);
  }

  const orderClients = customerOrderStreams.get(orderId);
  if (orderClients) {
    for (const client of orderClients) {
      client.write(payload);
    }
    customerOrderStreams.delete(orderId);
  }
}

function broadcastMenuUpdate() {
  const payload = `data: ${JSON.stringify({ type: 'menu-updated', sections: buildMenuSections() })}\n\n`;
  for (const client of menuStreams) {
    client.write(payload);
  }
}

function serveStatic(reqPath, res) {
  if (reqPath === '/') {
    sendFile(res, path.join(publicDir, 'index.html'));
    return true;
  }

  if (reqPath === '/admin' || reqPath === '/admin/') {
    sendFile(res, path.join(publicDir, 'admin.html'));
    return true;
  }

  if (reqPath === '/checkout' || reqPath === '/checkout/') {
    sendFile(res, path.join(publicDir, 'checkout.html'));
    return true;
  }

  const safePath = path.normalize(reqPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (filePath.startsWith(publicDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return true;
  }

  return false;
}

function findOrderIndex(orderId) {
  const orders = readOrders();
  const index = orders.findIndex((entry) => entry.id === orderId);
  return { orders, index };
}

function updateDerivedFields(order) {
  order.updatedAt = new Date().toISOString();
  order.status = computeDisplayStatus(order);
  order.customerMessage = computeCustomerMessage(order);
}

function pushTimeline(order, label, detail) {
  order.timeline = Array.isArray(order.timeline) ? order.timeline : [];
  order.timeline.push(createTimelineEntry(label, detail));
}

function applyAdminAction(order, action, body) {
  if (typeof body.readyInMinutes !== 'undefined') {
    order.readyInMinutes = String(body.readyInMinutes || '').trim();
  }

  if (action === 'mark_paid') {
    order.paymentStatus = 'Paid';
    order.paidAt = new Date().toISOString();
    if (order.paymentMethod === 'cod') {
      order.paymentCollectedAt = order.paidAt;
    }
    if (order.orderState === 'awaiting_payment') {
      order.orderState = 'processing';
      order.fulfillmentStatus = 'Pending kitchen acceptance';
    }
    pushTimeline(
      order,
      'Payment confirmed',
      order.paymentMethod === 'cod'
        ? 'Admin marked the payment on delivery order as paid.'
        : 'Admin confirmed the customer payment.'
    );
  }

  if (action === 'accept_order') {
    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'Paid') {
      throw new Error('Confirm payment before accepting this order into the kitchen.');
    }

    order.orderState = 'accepted';
    order.fulfillmentStatus = 'Accepted by kitchen';
    order.acceptedAt = new Date().toISOString();
    pushTimeline(order, 'Kitchen accepted order', 'Kitchen capacity has been confirmed.');
  }

  if (action === 'start_preparing') {
    order.orderState = 'preparing';
    order.fulfillmentStatus = 'Preparing';
    pushTimeline(order, 'Preparation started', 'Chefs have started cooking the order.');
  }

  if (action === 'mark_ready') {
    order.orderState = 'ready';
    order.fulfillmentStatus = 'Ready for dispatch';
    pushTimeline(order, 'Order ready', 'Meal is packed and ready for dispatch.');
  }

  if (action === 'dispatch_order') {
    order.orderState = 'out_for_delivery';
    order.fulfillmentStatus = 'Out for delivery';
    pushTimeline(order, 'Dispatched', 'Rider has picked up the order.');
  }

  if (action === 'complete_order') {
    order.orderState = 'completed';
    order.fulfillmentStatus = 'Delivered';
    pushTimeline(order, 'Order completed', 'Delivery has been completed successfully.');
  }

  if (action === 'collect_cod') {
    if (order.paymentMethod !== 'cod') {
      throw new Error('Cash collection only applies to payment on delivery orders.');
    }

    order.paymentStatus = 'Cash collected';
    order.paymentCollectedAt = new Date().toISOString();
    pushTimeline(order, 'Cash collected', 'Delivery payment has been collected.');
  }

  updateDerivedFields(order);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret, Authorization'
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const normalizedUsername = String(body.username || '').trim().toLowerCase();
      const allowedUsernames = new Set([
        ADMIN_USERNAME.toLowerCase(),
        ADMIN_USERNAME.replace("'", '').toLowerCase(),
        ADMIN_USERNAME.replace("'", '-').toLowerCase(),
        ADMIN_USERNAME.replace("'", '_').toLowerCase()
      ]);
      const providedPassword = String(body.password || '').trim();

      if (allowedUsernames.has(normalizedUsername) && providedPassword === ADMIN_PASSWORD) {
        sendJson(res, 200, {
          token: ADMIN_TOKEN,
          username: ADMIN_USERNAME
        });
        return;
      }

      sendJson(res, 401, { error: 'Invalid username or password.' });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to sign in.' });
    }
    return;
  }

  if (url.pathname === '/api/payment-details' && req.method === 'GET') {
    sendJson(res, 200, paymentDetails);
    return;
  }

  if (url.pathname === '/api/menu' && req.method === 'GET') {
    sendJson(res, 200, { sections: buildMenuSections() });
    return;
  }

  if (url.pathname === '/api/menu/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', sections: buildMenuSections() })}\n\n`);
    menuStreams.add(res);
    req.on('close', () => {
      menuStreams.delete(res);
    });
    return;
  }

  if (url.pathname === '/api/inventory' && req.method === 'GET') {
    sendJson(res, 200, { inventory: readInventory() });
    return;
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const validationError = validateOrder(body);

      if (validationError) {
        sendJson(res, 400, { error: validationError });
        return;
      }

      const orders = readOrders();
      const order = createOrder(body);
      orders.push(order);
      writeOrders(orders);
      broadcast('new-order', order);

      sendJson(res, 201, {
        message: 'Order received successfully.',
        order: getPublicOrder(order),
        paymentInstructions: getPaymentInstructions(order)
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to process order.' });
    }
    return;
  }

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    if (!requireAdmin(req, res, url)) {
      return;
    }

    const orders = readOrders().sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    sendJson(res, 200, { orders });
    return;
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (orderMatch && req.method === 'GET') {
    const orderId = decodeURIComponent(orderMatch[1]);
    const orders = readOrders();
    const order = orders.find((entry) => entry.id === orderId);

    if (!order) {
      sendJson(res, 404, { error: 'Order not found.' });
      return;
    }

    sendJson(res, 200, {
      order: getPublicOrder(order),
      paymentInstructions: getPaymentInstructions(order)
    });
    return;
  }

  const customerStreamMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/stream$/);
  if (customerStreamMatch && req.method === 'GET') {
    const orderId = decodeURIComponent(customerStreamMatch[1]);
    const orders = readOrders();
    const order = orders.find((entry) => entry.id === orderId);

    if (!order) {
      sendJson(res, 404, { error: 'Order not found.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const payload = `data: ${JSON.stringify({ type: 'connected', order: getPublicOrder(order) })}\n\n`;
    res.write(payload);

    if (!customerOrderStreams.has(orderId)) {
      customerOrderStreams.set(orderId, new Set());
    }

    const bucket = customerOrderStreams.get(orderId);
    bucket.add(res);

    req.on('close', () => {
      const clients = customerOrderStreams.get(orderId);
      if (!clients) {
        return;
      }
      clients.delete(res);
      if (clients.size === 0) {
        customerOrderStreams.delete(orderId);
      }
    });

    return;
  }

  const paymentSubmittedMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/payment-submitted$/);
  if (paymentSubmittedMatch && req.method === 'POST') {
    try {
      const orderId = decodeURIComponent(paymentSubmittedMatch[1]);
      const body = await parseBody(req);
      const { orders, index } = findOrderIndex(orderId);

      if (index === -1) {
        sendJson(res, 404, { error: 'Order not found.' });
        return;
      }

      const order = orders[index];
      if (order.paymentMethod === 'cod') {
        sendJson(res, 400, { error: 'Payment submission is not required for payment on delivery.' });
        return;
      }

      const transactionReference = String(body.transactionReference || '').trim();
      const proofOfPaymentDataUrl = String(body.proofOfPaymentDataUrl || '').trim();
      const proofOfPaymentName = String(body.proofOfPaymentName || '').trim();

      if (order.paymentMethod === 'bank_transfer' && !transactionReference && !proofOfPaymentDataUrl) {
        sendJson(res, 400, { error: 'Add a transfer reference or upload proof of payment.' });
        return;
      }

      if (order.paymentMethod === 'crypto' && !transactionReference) {
        sendJson(res, 400, { error: 'Enter the crypto transaction hash before submitting.' });
        return;
      }

      order.transactionReference = transactionReference;
      order.paymentSubmittedAt = new Date().toISOString();
      order.proofOfPaymentDataUrl = proofOfPaymentDataUrl;
      order.proofOfPaymentName = proofOfPaymentName;
      order.paymentStatus = order.paymentMethod === 'bank_transfer'
        ? 'Pending manual confirmation'
        : 'Blockchain confirmation pending';
      pushTimeline(
        order,
        order.paymentMethod === 'bank_transfer' ? 'Transfer submitted' : 'Crypto submitted',
        transactionReference || proofOfPaymentName || 'Customer submitted payment evidence.'
      );
      updateDerivedFields(order);

      writeOrders(orders);
      broadcast('order-updated', order);
      sendJson(res, 200, {
        order: getPublicOrder(order),
        paymentInstructions: getPaymentInstructions(order)
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to save payment submission.' });
    }
    return;
  }

  if (url.pathname === '/api/crypto-webhook' && req.method === 'POST') {
    try {
      const secret = req.headers['x-webhook-secret'];
      if (secret !== CRYPTO_WEBHOOK_SECRET) {
        sendJson(res, 401, { error: 'Invalid webhook secret.' });
        return;
      }

      const body = await parseBody(req);
      const orderId = String(body.orderId || '').trim();
      const transactionId = String(body.transactionId || '').trim();
      const status = String(body.status || '').trim().toLowerCase();
      const confirmations = Number(body.confirmations || 0);
      const { orders, index } = findOrderIndex(orderId);

      if (index === -1) {
        sendJson(res, 404, { error: 'Order not found.' });
        return;
      }

      const order = orders[index];
      if (order.paymentMethod !== 'crypto') {
        sendJson(res, 400, { error: 'Webhook target is not a crypto order.' });
        return;
      }

      order.transactionReference = transactionId || order.transactionReference;
      order.cryptoConfirmations = confirmations;

      if (status !== 'confirmed' && status !== 'paid') {
        updateDerivedFields(order);
        writeOrders(orders);
        sendJson(res, 202, { order: getPublicOrder(order), message: 'Confirmation not final yet.' });
        return;
      }

      order.paymentStatus = 'Paid';
      order.paidAt = new Date().toISOString();
      if (order.orderState === 'awaiting_payment') {
        order.orderState = 'processing';
        order.fulfillmentStatus = 'Pending kitchen acceptance';
      }
      pushTimeline(order, 'Crypto confirmed', `Blockchain confirmation received with ${confirmations} confirmations.`);
      updateDerivedFields(order);

      writeOrders(orders);
      broadcast('order-updated', order);
      sendJson(res, 200, { order: getPublicOrder(order) });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to process webhook.' });
    }
    return;
  }

  const adminUpdateMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (adminUpdateMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res, url)) {
      return;
    }

    try {
      const body = await parseBody(req);
      const orderId = decodeURIComponent(adminUpdateMatch[1]);
      const { orders, index } = findOrderIndex(orderId);

      if (index === -1) {
        sendJson(res, 404, { error: 'Order not found.' });
        return;
      }

      const action = String(body.action || '').trim();
      if (action === 'delete_order') {
        const [removedOrder] = orders.splice(index, 1);
        writeOrders(orders);
        broadcastDeleted(orderId);
        sendJson(res, 200, { deletedId: removedOrder.id });
        return;
      }

      const order = orders[index];
      applyAdminAction(order, action, body);
      writeOrders(orders);
      broadcast('order-updated', order);
      sendJson(res, 200, { order });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to update order.' });
    }
    return;
  }

  const adminMenuMatch = url.pathname.match(/^\/api\/admin\/menu\/([^/]+)$/);
  if (adminMenuMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res, url)) {
      return;
    }

    try {
      const body = await parseBody(req);
      const itemId = decodeURIComponent(adminMenuMatch[1]);
      const menu = readMenuConfig();
      const inventory = readInventory();

      if (!menu[itemId]) {
        sendJson(res, 404, { error: 'Menu item not found.' });
        return;
      }

      const price = Number(body.price);
      const available = Number(body.available);
      const image = typeof body.image === 'string' ? body.image.trim() : '';

      if (!Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: 'Price must be a valid number.' });
        return;
      }

      if (!Number.isFinite(available) || available < 0) {
        sendJson(res, 400, { error: 'Available stock must be a valid number.' });
        return;
      }

      if (!image) {
        sendJson(res, 400, { error: 'Image path is required.' });
        return;
      }

      menu[itemId].price = price;
      menu[itemId].image = image;
      if (!inventory[itemId]) {
        inventory[itemId] = { name: menu[itemId].name, available };
      } else {
        inventory[itemId].available = available;
        inventory[itemId].name = menu[itemId].name;
      }

      writeMenuConfig(menu);
      writeInventory(inventory);
      broadcastMenuUpdate();

      sendJson(res, 200, {
        item: {
          id: itemId,
          name: menu[itemId].name,
          category: menu[itemId].category,
          price: menu[itemId].price,
          available: inventory[itemId].available,
          image: menu[itemId].image
        }
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to update menu item.' });
    }
    return;
  }

  const adminMenuImageMatch = url.pathname.match(/^\/api\/admin\/menu\/([^/]+)\/image$/);
  if (adminMenuImageMatch && req.method === 'POST') {
    if (!requireAdmin(req, res, url)) {
      return;
    }

    try {
      const body = await parseBody(req);
      const itemId = decodeURIComponent(adminMenuImageMatch[1]);
      const menu = readMenuConfig();

      if (!menu[itemId]) {
        sendJson(res, 404, { error: 'Menu item not found.' });
        return;
      }

      const imagePath = saveMenuImageFromDataUrl(itemId, body.imageDataUrl, body.fileName);
      menu[itemId].image = imagePath;
      writeMenuConfig(menu);
      broadcastMenuUpdate();

      sendJson(res, 200, {
        item: {
          id: itemId,
          image: imagePath
        }
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Unable to upload menu image.' });
    }
    return;
  }

  if (url.pathname === '/api/orders/stream' && req.method === 'GET') {
    if (!requireAdmin(req, res, url)) {
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (serveStatic(url.pathname, res)) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('admin:join', ({ token }) => {
    if (token !== ADMIN_TOKEN) {
      socket.emit('admin:error', { error: 'Unauthorized' });
      return;
    }

    socket.join('admins');
    socket.emit('admin:joined', {
      message: 'Realtime order channel connected.'
    });
  });
});

server.listen(PORT, () => {
  console.log(`Calaman's Kitchen running on http://localhost:${PORT}`);
});