const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * In-memory store
 * Tracks orders, carts, discount codes, and configuration
 */
const dbStore = {
  // Configuration: Every nth order gets a discount code
  nthOrderForDiscount: 3,
  
  // All orders placed
  orders: [],
  
  // Current shopping carts (userId -> cart)
  carts: {},
  
  // Discount codes available (codeId -> { code, isUsed, discountPercent })
  discountCodes: {},
  
  // Track used discount codes (codeId -> true if used)
  usedDiscountCodes: {},
  
  // Counter for discount code generation
  discountCodeCounter: 0,
  
  // Sample products available in store
  products: [
    { id: 1, name: 'Laptop', price: 999.99 },
    { id: 2, name: 'Mouse', price: 29.99 },
    { id: 3, name: 'Keyboard', price: 79.99 },
    { id: 4, name: 'Monitor', price: 299.99 },
    { id: 5, name: 'Headphones', price: 149.99 },
  ],
};

/**
 * Generate a unique discount code
 * Format: UNIBLOX-XXXX where XXXX is a number
 */
function generateDiscountCode() {
  dbStore.discountCodeCounter++;
  const codeId = dbStore.discountCodeCounter;
  const code = `UNIBLOX-${String(codeId).padStart(4, '0')}`;
  
  dbStore.discountCodes[codeId] = {
    id: codeId,
    code,
    isUsed: false,
    discountPercent: 10,
    createdAt: new Date().toISOString(),
  };
  
  return code;
}

/**
 * Check if a discount code is valid and available for use
 */
function isValidDiscountCode(code) {
  for (const [, discountObj] of Object.entries(dbStore.discountCodes)) {
    if (discountObj.code === code && !discountObj.isUsed) {
      return true;
    }
  }
  return false;
}

/**
 * Get discount code details
 */
function getDiscountCodeDetails(code) {
  for (const [, discountObj] of Object.entries(dbStore.discountCodes)) {
    if (discountObj.code === code) {
      return discountObj;
    }
  }
  return null;
}

/**
 * Mark a discount code as used
 */
function markDiscountCodeAsUsed(code) {
  for (const [, discountObj] of Object.entries(dbStore.discountCodes)) {
    if (discountObj.code === code) {
      discountObj.isUsed = true;
      break;
    }
  }
}

/**
 * Check if a new discount code should be generated
 * Generate one after every nth order
 */
function checkAndGenerateNewDiscountCode() {
  const orderCount = dbStore.orders.length;
  
  // If this is the nth order, generate a new discount code
  if (orderCount > 0 && orderCount % dbStore.nthOrderForDiscount === 0) {
    const code = generateDiscountCode();
    console.log(`New discount code generated after order ${orderCount}: ${code}`);
    return code;
  }
  
  return null;
}

/**
 * Get or create a cart for a user
 */
function getCart(userId) {
  if (!dbStore.carts[userId]) {
    dbStore.carts[userId] = {
      userId,
      items: [],
      createdAt: new Date().toISOString(),
    };
  }
  return dbStore.carts[userId];
}

/**
 * Calculate cart total
 */
function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * GET /api/products
 * Get all available products
 */
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    data: dbStore.products,
  });
});

/**
 * POST /api/cart/:userId/add
 * Add item to cart
 * Body: { productId: number, quantity: number }
 */
app.post('/api/cart/:userId/add', (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;
  
  // Validation
  if (!userId || !productId || !quantity) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId, productId, quantity',
    });
  }
  
  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      error: 'Quantity must be at least 1',
    });
  }
  
  // Find product
  const product = dbStore.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
    });
  }
  
  // Get or create cart
  const cart = getCart(userId);
  
  // Check if product already in cart
  const existingItem = cart.items.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      id: productId,
      name: product.name,
      price: product.price,
      quantity,
    });
  }
  
  const total = calculateCartTotal(cart.items);
  
  res.json({
    success: true,
    message: `${product.name} added to cart`,
    cart: {
      userId,
      itemCount: cart.items.length,
      total,
      items: cart.items,
    },
  });
});

/**
 * GET /api/cart/:userId
 * Get user's cart
 */
app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const cart = getCart(userId);
  const total = calculateCartTotal(cart.items);
  
  res.json({
    success: true,
    data: {
      userId,
      items: cart.items,
      itemCount: cart.items.length,
      total,
    },
  });
});

/**
 * DELETE /api/cart/:userId/clear
 * Clear user's cart
 */
app.delete('/api/cart/:userId/clear', (req, res) => {
  const { userId } = req.params;
  
  if (dbStore.carts[userId]) {
    dbStore.carts[userId].items = [];
  }
  
  res.json({
    success: true,
    message: 'Cart cleared',
  });
});

/**
 * POST /api/checkout
 * Checkout and place order
 * Body: { userId: string, discountCode?: string }
 */
app.post('/api/checkout', (req, res) => {
  const { userId, discountCode } = req.body;
  
  // Validation
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: userId',
    });
  }
  
  const cart = getCart(userId);
  
  if (cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Cart is empty',
    });
  }
  
  let discountAmount = 0;
  let discountPercent = 0;
  let appliedDiscountCode = null;
  
  // Validate discount code if provided
  if (discountCode) {
    if (!isValidDiscountCode(discountCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or already used discount code',
      });
    }
    
    const discountDetails = getDiscountCodeDetails(discountCode);
    discountPercent = discountDetails.discountPercent;
    appliedDiscountCode = discountCode;
  }
  
  // Calculate totals
  const subtotal = calculateCartTotal(cart.items);
  discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;
  
  // Create order
  const order = {
    orderId: `ORDER-${Date.now()}`,
    userId,
    items: [...cart.items],
    subtotal,
    discountCode: appliedDiscountCode,
    discountPercent,
    discountAmount,
    total,
    createdAt: new Date().toISOString(),
  };
  
  // Store order
  dbStore.orders.push(order);
  
  // Mark discount code as used
  if (appliedDiscountCode) {
    markDiscountCodeAsUsed(appliedDiscountCode);
  }
  
  // Check if new discount code should be generated
  const newDiscountCode = checkAndGenerateNewDiscountCode();
  
  // Clear cart
  cart.items = [];
  
  res.json({
    success: true,
    message: 'Order placed successfully',
    order: {
      orderId: order.orderId,
      userId,
      itemCount: order.items.length,
      subtotal: order.subtotal.toFixed(2),
      discountCode: order.discountCode,
      discountAmount: order.discountAmount.toFixed(2),
      total: order.total.toFixed(2),
      createdAt: order.createdAt,
    },
    newDiscountCodeGenerated: newDiscountCode,
  });
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
