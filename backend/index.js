const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

const dbStore = {
  products: [
    { id: 1, name: "Laptop", price: 999.99 },
    { id: 2, name: "Mouse", price: 29.99 },
    { id: 3, name: "Keyboard", price: 79.99 },
    { id: 4, name: "Monitor", price: 299.99 },
    { id: 5, name: "Headphones", price: 149.99 },
  ],
};

app.get("/api/products", (req, res) => {
  res.json({
    success: true,
    data: dbStore.products,
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
