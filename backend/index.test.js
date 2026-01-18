const request = require("supertest");
const { app, dbStore } = require("./index");

describe("API Tests", () => {
  let userId = "test-user-1";

  beforeEach(() => {
    // Reset store before each test
    dbStore.orders = [];
    dbStore.carts = {};
    dbStore.discountCodes = {};
    dbStore.discountCodeCounter = 0;
  });

  describe("Products API", () => {
    test("GET /api/products - should return all products", async () => {
      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(5);
      expect(response.body.data[0]).toHaveProperty("id");
      expect(response.body.data[0]).toHaveProperty("name");
      expect(response.body.data[0]).toHaveProperty("price");
    });

    test("GET /api/products - products should have correct structure", async () => {
      const response = await request(app).get("/api/products");

      const product = response.body.data[0];
      expect(product.id).toBe(1);
      expect(product.name).toBe("Laptop");
      expect(product.price).toBe(999.99);
    });
  });

  describe("Shopping Cart API", () => {
    test("POST /api/cart/:userId/add - should add item to cart", async () => {
      const response = await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cart.itemCount).toBe(1);
      expect(response.body.cart.items[0].id).toBe(1);
      expect(response.body.cart.items[0].quantity).toBe(1);
    });

    test("POST /api/cart/:userId/add - should increase quantity if item exists", async () => {
      // Add item twice
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 2 });

      expect(response.status).toBe(200);
      expect(response.body.cart.items[0].quantity).toBe(3);
    });

    test("POST /api/cart/:userId/add - should return error for missing fields", async () => {
      const response = await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1 }); // missing quantity

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("required");
    });

    test("POST /api/cart/:userId/add - should return error for invalid quantity", async () => {
      const response = await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("POST /api/cart/:userId/add - should return error for non-existent product", async () => {
      const response = await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 999, quantity: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Product not found");
    });

    test("GET /api/cart/:userId - should retrieve user cart", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app).get(`/api/cart/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.total).toBe(999.99);
    });

    test("GET /api/cart/:userId - should return empty cart for new user", async () => {
      const response = await request(app).get("/api/cart/new-user");

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(0);
      expect(response.body.data.total).toBe(0);
    });

    test("DELETE /api/cart/:userId/clear - should clear cart", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app).delete(`/api/cart/${userId}/clear`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const cartResponse = await request(app).get(`/api/cart/${userId}`);
      expect(cartResponse.body.data.items.length).toBe(0);
    });
  });

  describe("Checkout API", () => {
    test("POST /api/checkout - should place order without discount", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app)
        .post("/api/checkout")
        .send({ userId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.order.subtotal).toBe("999.99");
      expect(response.body.order.discountAmount).toBe("0.00");
      expect(response.body.order.total).toBe("999.99");
    });

    test("POST /api/checkout - should calculate total with discount", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 2, quantity: 1 });

      // Generate a discount code manually for testing
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: false,
        discountPercent: 10,
      };

      const response = await request(app)
        .post("/api/checkout")
        .send({ userId, discountCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.order.discountCode).toBe(discountCode);
      // 29.99 * 0.10 = 2.999 ≈ 3.00
      expect(parseFloat(response.body.order.discountAmount)).toBeCloseTo(
        3.0,
        1,
      );
    });

    test("POST /api/checkout - should reject invalid discount code", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app)
        .post("/api/checkout")
        .send({ userId, discountCode: "INVALID-CODE" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid");
    });

    test("POST /api/checkout - should reject used discount code", async () => {
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: true,
        discountPercent: 10,
      };

      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      const response = await request(app)
        .post("/api/checkout")
        .send({ userId, discountCode });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid or already used");
    });

    test("POST /api/checkout - should mark discount code as used", async () => {
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: false,
        discountPercent: 10,
      };

      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      await request(app).post("/api/checkout").send({ userId, discountCode });

      expect(dbStore.discountCodes[1].isUsed).toBe(true);
    });

    test("POST /api/checkout - should clear cart after order", async () => {
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      await request(app).post("/api/checkout").send({ userId });

      const cartResponse = await request(app).get(`/api/cart/${userId}`);
      expect(cartResponse.body.data.items.length).toBe(0);
    });

    test("POST /api/checkout - should return error for empty cart", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .send({ userId });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Cart is empty");
    });

    test("POST /api/checkout - should return error for missing userId", async () => {
      const response = await request(app).post("/api/checkout").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("userId");
    });
  });

  describe("Discount Code Generation", () => {
    test("should generate discount code after 3rd order", async () => {
      // Place 3 orders
      for (let i = 0; i < 3; i++) {
        const currentUserId = `user-${i}`;
        await request(app)
          .post(`/api/cart/${currentUserId}/add`)
          .send({ productId: 1, quantity: 1 });

        await request(app)
          .post("/api/checkout")
          .send({ userId: currentUserId });
      }

      expect(dbStore.discountCodeCounter).toBe(1);
      expect(Object.keys(dbStore.discountCodes).length).toBe(1);
    });

    test("should not generate discount code before 3rd order", async () => {
      // Place 2 orders
      for (let i = 0; i < 2; i++) {
        const currentUserId = `user-${i}`;
        await request(app)
          .post(`/api/cart/${currentUserId}/add`)
          .send({ productId: 1, quantity: 1 });

        await request(app)
          .post("/api/checkout")
          .send({ userId: currentUserId });
      }

      expect(dbStore.discountCodeCounter).toBe(0);
    });

    test("POST /api/admin/discount-codes/generate - should generate code when condition met", async () => {
      // Place 3 orders to trigger discount code generation
      for (let i = 0; i < 3; i++) {
        const currentUserId = `user-${i}`;
        await request(app)
          .post(`/api/cart/${currentUserId}/add`)
          .send({ productId: 1, quantity: 1 });

        await request(app)
          .post("/api/checkout")
          .send({ userId: currentUserId });
      }

      const response = await request(app).post(
        "/api/admin/discount-codes/generate",
      );

      expect(response.status).toBe(200);
      expect(response.body.code).toBeDefined();
      expect(response.body.code).toMatch(/UNIBLOX-\d+/);
    });

    test("POST /api/admin/discount-codes/generate - should reject when condition not met", async () => {
      const response = await request(app).post(
        "/api/admin/discount-codes/generate",
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("Admin Stats API", () => {
    test("GET /api/admin/stats - should return initial stats", async () => {
      const response = await request(app).get("/api/admin/stats");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.totalOrders).toBe(0);
      expect(response.body.stats.totalItemsPurchased).toBe(0);
      expect(response.body.stats.totalPurchaseAmount).toBe("0.00");
    });

    test("GET /api/admin/stats - should calculate stats correctly", async () => {
      // Place orders
      for (let i = 0; i < 2; i++) {
        const currentUserId = `user-${i}`;
        await request(app)
          .post(`/api/cart/${currentUserId}/add`)
          .send({ productId: 1, quantity: 2 });

        await request(app)
          .post("/api/checkout")
          .send({ userId: currentUserId });
      }

      const response = await request(app).get("/api/admin/stats");

      expect(response.body.stats.totalOrders).toBe(2);
      expect(response.body.stats.totalItemsPurchased).toBe(4);
      // Each order: 999.99 * 2 = 1999.98, for 2 orders = 3999.96
      expect(parseFloat(response.body.stats.totalPurchaseAmount)).toBe(3999.96);
    });

    test("GET /api/admin/stats - should track discount codes", async () => {
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: false,
        discountPercent: 10,
      };

      const response = await request(app).get("/api/admin/stats");

      expect(response.body.stats.discountCodes.total).toBe(1);
      expect(response.body.stats.discountCodes.available).toBe(1);
    });

    test("GET /api/admin/stats - should track discount amounts", async () => {
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: false,
        discountPercent: 10,
      };

      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 2, quantity: 1 });

      await request(app).post("/api/checkout").send({ userId, discountCode });

      const response = await request(app).get("/api/admin/stats");

      expect(response.body.stats.totalOrders).toBe(1);
      expect(parseFloat(response.body.stats.totalDiscountAmount)).toBeCloseTo(
        3.0,
        1,
      );
    });
  });

  describe("Health Check", () => {
    test("GET /health - should return ok status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });

  describe("Integration Tests", () => {
    test("full shopping flow: add items, apply discount, checkout", async () => {
      // Step 1: Add items to cart
      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 1, quantity: 1 });

      await request(app)
        .post(`/api/cart/${userId}/add`)
        .send({ productId: 2, quantity: 2 });

      // Step 2: Get cart
      let cartResponse = await request(app).get(`/api/cart/${userId}`);
      expect(cartResponse.body.data.items.length).toBe(2);

      // Step 3: Create a discount code
      const discountCode = "UNIBLOX-0001";
      dbStore.discountCodes[1] = {
        id: 1,
        code: discountCode,
        isUsed: false,
        discountPercent: 10,
      };

      // Step 4: Checkout with discount
      const checkoutResponse = await request(app)
        .post("/api/checkout")
        .send({ userId, discountCode });

      expect(checkoutResponse.body.success).toBe(true);
      expect(checkoutResponse.body.order.discountCode).toBe(discountCode);

      // Step 5: Verify cart is cleared
      cartResponse = await request(app).get(`/api/cart/${userId}`);
      expect(cartResponse.body.data.items.length).toBe(0);

      // Step 6: Verify order is in stats
      const statsResponse = await request(app).get("/api/admin/stats");
      expect(statsResponse.body.stats.totalOrders).toBe(1);
    });

    test("multiple users independent carts", async () => {
      const user1 = "user-1";
      const user2 = "user-2";

      // User 1 adds items
      await request(app)
        .post(`/api/cart/${user1}/add`)
        .send({ productId: 1, quantity: 1 });

      // User 2 adds items
      await request(app)
        .post(`/api/cart/${user2}/add`)
        .send({ productId: 2, quantity: 2 });

      // Check each user's cart
      const cart1 = await request(app).get(`/api/cart/${user1}`);
      const cart2 = await request(app).get(`/api/cart/${user2}`);

      expect(cart1.body.data.items[0].id).toBe(1);
      expect(cart2.body.data.items[0].id).toBe(2);
    });
  });
});
