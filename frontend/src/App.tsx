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
  const userId = "user123";
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);

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
    try {
      const response = await fetch(`${API_URL}/cart/${userId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const data = await response.json();
      if (data.success) {
        setCart(data.cart);
      } else {
        console.error("Error adding to cart:", data.message);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
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
        console.log("Cart cleared");
        fetchCart();
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-blue-600 text-white p-4 shadow">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Unibox store</h1>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto py-8 px-4">
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
    </>
  );
}

export default App;
