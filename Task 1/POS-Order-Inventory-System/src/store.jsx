import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored && stored !== 'undefined' ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem('token');
    return t && t !== 'undefined' ? t : null;
  });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [currentCheckoutId, setCurrentCheckoutId] = useState(null);

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const reqEject = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const resEject = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqEject);
      axios.interceptors.response.eject(resEject);
    };
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    setToken(res.data.token);
    setCurrentUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
      // Maps _id to id for seamless UI integration
      const formatted = res.data.map(p => ({ ...p, id: p._id }));
      setProducts(formatted);
    } catch (e) {
      console.error(e);
      message.error('Failed to load products');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders`);
      const formatted = res.data.map(o => ({ ...o, id: o._id }));
      setOrders(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  // Product CRUD
  const addProduct = async (product) => {
    try {
      await axios.post(`${API_URL}/products`, product);
      fetchProducts();
      message.success('Product added');
    } catch {
      message.error('Error adding product');
    }
  };

  const updateProduct = async (id, updatedFields) => {
    try {
      await axios.put(`${API_URL}/products/${id}`, updatedFields);
      fetchProducts();
      message.success('Product updated');
    } catch {
      message.error('Error updating product');
    }
  };

  const deleteProduct = async (id) => {
    try {
      await axios.delete(`${API_URL}/products/${id}`);
      fetchProducts();
      message.success('Product deleted');
    } catch {
      message.error('Error deleting product');
    }
  };

  // Cart operations
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty < product.stock) {
        setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, { ...product, qty: 1 }]);
      }
    }
  };

  const updateCartQty = (id, qty) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const product = products.find(p => p.id === id);
    if (product && qty <= product.stock) {
      setCart(cart.map(item => item.id === id ? { ...item, qty } : item));
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Orders and Checkout flow
  // We break checkout into initialization (Reserved) and payment outcome resolution.

  const initiateCheckout = async () => {
    if (cart.length === 0) return null;
    try {
      const res = await axios.post(`${API_URL}/orders/checkout`, { items: cart });
      setCurrentCheckoutId(res.data._id);
      fetchProducts(); // refreshing stock to reflect reservations
      return res.data;
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to checkout');
      throw error;
    }
  };

  const finalizePayment = async (outcome) => {
    // outcome should be 'success' | 'failure' | 'timeout'
    if (!currentCheckoutId) return;
    try {
      await axios.post(`${API_URL}/orders/${currentCheckoutId}/payment`, { outcome });
      fetchProducts();
      fetchOrders();
      if (outcome === 'success') clearCart();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed payment resolution');
      throw error;
    } finally {
      setCurrentCheckoutId(null);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await axios.post(`${API_URL}/orders/${orderId}/cancel`);
      fetchProducts();
      fetchOrders();
      message.success('Order cancelled');
    } catch (error) {
      message.error(error.response?.data?.message || 'Cannot cancel order');
    }
  };


  return (
    <StoreContext.Provider value={{
      currentUser, token, login, logout, isAuthenticated: !!token,
      products, fetchProducts, setProducts, addProduct, updateProduct, deleteProduct,
      cart, addToCart, updateCartQty, removeFromCart, clearCart,
      orders, initiateCheckout, finalizePayment, cancelOrder, fetchOrders
    }}>
      {children}
    </StoreContext.Provider>
  );
};
