const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

const dbStore = {
  carts: {},

  products: [
    { id: 1, name: "Laptop", price: 999.99 },
    { id: 2, name: "Mouse", price: 29.99 },
    { id: 3, name: "Keyboard", price: 79.99 },
    { id: 4, name: "Monitor", price: 299.99 },
    { id: 5, name: "Headphones", price: 149.99 },
  ],
};

const getCart = (userId) => {
  if (!dbStore.carts[userId]) {
    dbStore.carts[userId] = {
      userId,
      items: [],
      createdAt: new Date().toISOString(),
    };
  }
  return dbStore.carts[userId];
};

function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

app.get("/api/products", (req, res) => {
  res.json({
    success: true,
    data: dbStore.products,
  });
});

app.post("/api/cart/:userId/add", (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  // Validation
  if (!userId || !productId || !quantity) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: userId, productId, quantity",
    });
  }

  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      error: "Quantity must be at least 1",
    });
  }

  // Find product
  const product = dbStore.products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      error: "Product not found",
    });
  }

  // Get or create cart
  const cart = getCart(userId);

  // Check if product already in cart
  const existingItem = cart.items.find((item) => item.id === productId);

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

app.get("/api/cart/:userId", (req, res) => {
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

app.delete("/api/cart/:userId/clear", (req, res) => {
  const { userId } = req.params;

  if (dbStore.carts[userId]) {
    dbStore.carts[userId].items = [];
  }

  res.json({
    success: true,
    message: "Cart cleared",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
