import "./App.css";
import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
}

function App() {
  const API_URL = "http://localhost:3001/api";
  const [products, setProducts] = useState<Product[]>([]);

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

  useEffect(() => {
    fetchProducts();
  }, []);

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
                  <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50 hover:cursor-pointer">
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
