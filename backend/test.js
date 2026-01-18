const test = require('node:test');
const assert = require('node:assert');
const request = require('node:http').request;

// Simple test helper to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test suite
test('API Tests', async (t) => {
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  await t.test('Health check endpoint', async () => {
    const res = await makeRequest('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  await t.test('Get products', async () => {
    const res = await makeRequest('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert(res.body.data.length > 0);
  });

  await t.test('Add item to cart', async () => {
    const res = await makeRequest('POST', '/api/cart/user1/add', {
      productId: 1,
      quantity: 2,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.cart.itemCount, 1);
  });

  await t.test('Get cart', async () => {
    const res = await makeRequest('GET', '/api/cart/user1');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.items.length > 0);
  });

  await t.test('Add multiple items to cart', async () => {
    const res1 = await makeRequest('POST', '/api/cart/user2/add', {
      productId: 2,
      quantity: 1,
    });
    assert.strictEqual(res1.status, 200);

    const res2 = await makeRequest('POST', '/api/cart/user2/add', {
      productId: 3,
      quantity: 1,
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.cart.itemCount, 2);
  });

  await t.test('Checkout without discount', async () => {
    const res = await makeRequest('POST', '/api/checkout', {
      userId: 'user2',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.order.total);
    assert.strictEqual(res.body.order.discountCode, null);
  });

  await t.test('Checkout with invalid discount code', async () => {
    // Add item first
    await makeRequest('POST', '/api/cart/user3/add', {
      productId: 1,
      quantity: 1,
    });

    const res = await makeRequest('POST', '/api/checkout', {
      userId: 'user3',
      discountCode: 'INVALID-CODE',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Admin stats endpoint', async () => {
    const res = await makeRequest('GET', '/api/admin/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.stats.totalOrders >= 0);
    assert(res.body.stats.totalItemsPurchased >= 0);
    assert(res.body.stats.discountCodes);
  });

  await t.test('Admin orders endpoint', async () => {
    const res = await makeRequest('GET', '/api/admin/orders');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.orders));
  });

  await t.test('Validation: empty cart checkout', async () => {
    const res = await makeRequest('POST', '/api/checkout', {
      userId: 'newuser',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Validation: invalid quantity', async () => {
    const res = await makeRequest('POST', '/api/cart/user4/add', {
      productId: 1,
      quantity: 0,
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Validation: non-existent product', async () => {
    const res = await makeRequest('POST', '/api/cart/user4/add', {
      productId: 999,
      quantity: 1,
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Clear cart', async () => {
    // Add item first
    await makeRequest('POST', '/api/cart/user5/add', {
      productId: 1,
      quantity: 1,
    });

    // Clear cart
    const res = await makeRequest('DELETE', '/api/cart/user5/clear');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify cart is empty
    const cartRes = await makeRequest('GET', '/api/cart/user5');
    assert.strictEqual(cartRes.body.data.items.length, 0);
  });

  console.log('\n✓ All tests completed!\n');
  process.exit(0);
});
