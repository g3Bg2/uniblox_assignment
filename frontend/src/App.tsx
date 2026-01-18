import "./App.css";
import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Cart {
  userId: string;
  items: CartItem[];
  itemCount: number;
  total: number;
}

function App() {
  const API_URL = "http://localhost:3001/api";
  const [userId] = useState("user-" + Math.random().toString(36).substr(2, 9));
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );
  const [loading, setLoading] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchCart();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_URL}/cart/${userId}`);
      const data = await response.json();
      if (data.success) {
        setCart(data.data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const handleAddToCart = async (productId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/cart/${userId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
        setMessage(`${data.message}!`);
        setMessageType("success");
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error adding to cart");
      setMessageType("error");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      setMessage("Cart is empty");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          discountCode: discountCode || undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage(
          `Order placed! Order ID: ${data.order.orderId}. Total: $${data.order.total}${
            data.newDiscountCodeGenerated
              ? ` New discount code available!`
              : ""
          }`,
        );
        setMessageType("success");
        setCart(null);
        setDiscountCode("");
        setDiscountCodeInput("");
        fetchCart();
      } else {
        setMessage(data.error);
        setMessageType("error");
      }
    } catch (error) {
      setMessage("Error during checkout");
      setMessageType("error");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleClearCart = async () => {
    try {
      const response = await fetch(`${API_URL}/cart/${userId}/clear`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setCart(null);
        setDiscountCode("");
        setDiscountCodeInput("");
        setMessage("Cart cleared");
        setMessageType("success");
        fetchCart();
      }
    } catch (error) {
      setMessage("Error clearing cart");
      setMessageType("error");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleApplyDiscount = () => {
    if (!discountCodeInput.trim()) {
      setMessage("Please enter a discount code");
      setMessageType("error");
      return;
    }
    setDiscountCode(discountCodeInput);
    setMessage("Discount code will be applied at checkout");
    setMessageType("success");
    setTimeout(() => setMessage(""), 3000);
  };

  const calculateDiscount = () => {
    if (!cart || !discountCode) return 0;
    return (parseFloat(String(cart.total)) * 10) / 100;
  };

  const finalTotal = cart
    ? (parseFloat(String(cart.total)) - calculateDiscount()).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">🛒 EStore</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">User: {userId.substring(0, 5)}...</span>
          </div>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div
          className={`${
            messageType === "success"
              ? "bg-green-100 text-green-700 border-green-400"
              : "bg-red-100 text-red-700 border-red-400"
          } border-l-4 p-4 my-4 mx-auto max-w-6xl`}
        >
          {message}
        </div>
      )}

      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition"
              >
                <div className="bg-gray-200 h-32 rounded mb-3 flex items-center justify-center">
                  <span className="text-4xl">📦</span>
                </div>
                <h3 className="font-semibold text-sm mb-2">{product.name}</h3>
                <p className="text-lg font-bold text-blue-600 mb-3">
                  ${product.price.toFixed(2)}
                </p>
                <button
                  onClick={() => handleAddToCart(product.id)}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        {cart && cart.items.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>

            <div className="mb-6">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center border-b pb-3 mb-3"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-gray-600 text-sm">
                      Qty: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Discount Code Section */}
            <div className="bg-gray-50 p-4 rounded mb-6">
              <h3 className="font-semibold mb-2">Apply Discount Code</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter discount code (e.g., DISCOUNT-0001)"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  className="flex-1 border px-3 py-2 rounded text-sm"
                />
                <button
                  onClick={handleApplyDiscount}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                >
                  Apply
                </button>
              </div>
              {discountCode && (
                <p className="text-green-600 text-sm mt-2">
                  ✓ Discount code "{discountCode}" will be applied
                </p>
              )}
            </div>

            {/* Price Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              {discountCode && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount (10%):</span>
                  <span>-${calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">${finalTotal}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 font-bold disabled:opacity-50"
              >
                {loading ? "Processing..." : "✓ Checkout"}
              </button>
              <button
                onClick={handleClearCart}
                className="flex-1 bg-gray-400 text-white py-3 rounded hover:bg-gray-500 font-bold"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}

        {(!cart || cart.items.length === 0) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">
              Your cart is empty. Add some products to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
