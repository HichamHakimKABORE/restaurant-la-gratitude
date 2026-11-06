'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { INITIAL_DISHES, type Dish } from '@/lib/db';
import { CheckIcon, CloseIcon } from './Icons';

export interface CartItem extends Dish {
  cartKey: string;
  selectedOption?: string;
  qty: number;
}

interface CartContextType {
  dishes: Dish[];
  setDishes: React.Dispatch<React.SetStateAction<Dish[]>>;
  refreshDishes: () => Promise<void>;
  cart: CartItem[];
  addToCart: (dish: Dish, chosenOption?: string) => void;
  openDishSelector: (dish: Dish) => void;
  updateQty: (cartKey: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  toast: string | null;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextType>({
  dishes: INITIAL_DISHES,
  setDishes: () => {},
  refreshDishes: async () => {},
  cart: [],
  addToCart: () => {},
  openDishSelector: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
  toast: null,
  showToast: () => {}
});

export function formatCFA(price: number) {
  if (price === undefined || price === null || isNaN(price)) return '0\u00A0F';
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + '\u00A0F';
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Instant zero-latency initial state with INITIAL_DISHES, then synced in background with Neon
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [modalDish, setModalDish] = useState<Dish | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);

  const refreshDishes = async () => {
    try {
      const res = await fetch('/api/dishes', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.dishes) && data.dishes.length > 0) {
        setDishes(data.dishes);
        try {
          sessionStorage.setItem('gratitude_dishes_cache', JSON.stringify(data.dishes));
        } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('gratitude_cart_v2');
      if (savedCart) setCart(JSON.parse(savedCart));
      const cachedDishes = sessionStorage.getItem('gratitude_dishes_cache');
      if (cachedDishes) setDishes(JSON.parse(cachedDishes));
    } catch {}
    refreshDishes();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('gratitude_cart_v2', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const addToCart = (dish: Dish, chosenOption?: string, qtyToAdd = 1) => {
    if (!dish.is_available_today || dish.stock_status === 'soldout') {
      showToast(`Désolé, ${dish.name} est en rupture aujourd'hui.`);
      return;
    }

    const opt =
      chosenOption ||
      (Array.isArray(dish.options_json) && dish.options_json.length > 0
        ? dish.options_json[0]
        : undefined);
    const cartKey = `${dish.id}__${opt || 'default'}`;

    setCart(prev => {
      const found = prev.find(i => i.cartKey === cartKey);
      if (found) {
        return prev.map(i =>
          i.cartKey === cartKey ? { ...i, qty: i.qty + qtyToAdd } : i
        );
      }
      return [
        ...prev,
        {
          ...dish,
          cartKey,
          selectedOption: opt,
          qty: qtyToAdd
        }
      ];
    });

    showToast(
      `${dish.name}${opt ? ` (${opt})` : ''} ajouté au panier !`
    );
  };

  const openDishSelector = (dish: Dish) => {
    if (!dish.is_available_today || dish.stock_status === 'soldout') {
      showToast(`Ce plat (${dish.name}) est épuisé pour le moment.`);
      return;
    }
    const opts = Array.isArray(dish.options_json) ? dish.options_json : [];
    if (opts.length > 0) {
      setModalDish(dish);
      setSelectedOpt(opts[0]);
      setModalQty(1);
    } else {
      addToCart(dish);
    }
  };

  const updateQty = (cartKey: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => (i.cartKey === cartKey ? { ...i, qty: i.qty + delta } : i))
        .filter(i => i.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalPrice = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        dishes,
        setDishes,
        refreshDishes,
        cart,
        addToCart,
        openDishSelector,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
        toast,
        showToast
      }}
    >
      {children}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-50 bg-[#16a34a] text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs border border-white/20">
          {toast}
        </div>
      )}

      {/* DISH OPTION SELECTOR MODAL (Ex: Poulet Flambé / Rabilé / Sauté, accompagnement...) */}
      {modalDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#fffcf7] text-[#2b1810] border-2 border-[#881313] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="relative h-44 bg-stone-900">
              <div
                className={`w-full h-full dish-photo ${modalDish.image_quadrant}`}
                style={{ backgroundImage: `url('${modalDish.image_url}')` }}
              />
              <button
                onClick={() => setModalDish(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white font-bold flex items-center justify-center"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 text-[#facc15] font-extrabold text-sm">
                {formatCFA(modalDish.price)}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs font-extrabold uppercase text-[#881313]">
                  {modalDish.category}
                </span>
                <h3 className="text-lg font-extrabold text-[#2b1810]">
                  {modalDish.name}
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  {modalDish.description}
                </p>
              </div>

              {/* Options Radio Pills */}
              {Array.isArray(modalDish.options_json) &&
                modalDish.options_json.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-[#2b1810]">
                      Choisissez votre préférence / préparation :
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {modalDish.options_json.map(opt => (
                        <label
                          key={opt}
                          onClick={() => setSelectedOpt(opt)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border-2 cursor-pointer text-xs font-bold transition ${
                            selectedOpt === opt
                              ? 'bg-amber-50 border-[#881313] text-[#881313]'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{opt}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selectedOpt === opt
                                ? 'border-[#881313] bg-[#881313] text-white'
                                : 'border-stone-400'
                            }`}
                          >
                            {selectedOpt === opt ? <CheckIcon className="w-2.5 h-2.5" /> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              {/* Quantity & Add Button */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
                <div className="flex items-center gap-3 bg-[#fdf5e8] px-3 py-2 rounded-xl border border-[#dec6a7]">
                  <button
                    type="button"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="font-extrabold text-base px-1 text-stone-700"
                  >
                    −
                  </button>
                  <span className="font-extrabold text-sm">{modalQty}</span>
                  <button
                    type="button"
                    onClick={() => setModalQty(q => q + 1)}
                    className="font-extrabold text-base px-1 text-[#881313]"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(modalDish, selectedOpt, modalQty);
                    setModalDish(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs shadow-lg"
                >
                  Ajouter au panier ({formatCFA(modalDish.price * modalQty)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
