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
      <div className="App">
        <h1>Product List</h1>
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} - ${product.price}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default App;
