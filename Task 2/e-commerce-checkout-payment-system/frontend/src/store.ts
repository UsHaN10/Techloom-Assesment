import { create } from 'zustand';

export interface ProductType {
    _id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    imageUrl: string;
}

export interface CartItem extends ProductType {
    quantity: number;
}

interface AppState {
    cart: CartItem[];
    addToCart: (product: ProductType, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    cart: [],
    addToCart: (product, quantity = 1) => set((state) => {
        const existing = state.cart.find(item => item._id === product._id);
        if (existing) {
            if (existing.quantity + quantity > product.stock) {
                // Enforce max stock in frontend cart (optimistic)
                return state;
            }
            return {
                cart: state.cart.map(item =>
                    item._id === product._id ? { ...item, quantity: item.quantity + quantity } : item
                )
            };
        }
        return { cart: [...state.cart, { ...product, quantity }] };
    }),
    removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item._id !== productId)
    })),
    clearCart: () => set({ cart: [] }),
}));
