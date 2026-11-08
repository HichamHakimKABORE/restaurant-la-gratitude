'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { INITIAL_DISHES, type Dish } from '@/lib/db';
import { CheckIcon, CloseIcon, PhoneIcon, WhatsAppIcon } from './Icons';
import { RESTAURANT_PHONE_DISPLAY, RESTAURANT_PHONE_TEL, RESTAURANT_WHATSAPP } from '@/lib/constants';

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
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
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
    // Isolation stricte : nettoyage de toute donnée personnelle ou commande stockée localement
    // pour garantir que chaque utilisateur dispose d'un espace 100% propre et isolé.
    try {
      localStorage.removeItem('gratitude_cart_v2');
      localStorage.removeItem('gratitude_my_orders');
      localStorage.removeItem('gratitude_my_orders_v2');
      const cachedDishes = sessionStorage.getItem('gratitude_dishes_cache');
      if (cachedDishes) setDishes(JSON.parse(cachedDishes));
    } catch {}
    refreshDishes();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const openDishSelector = (dish: Dish) => {
    if (!dish.is_available_today || dish.stock_status === 'soldout') {
      showToast(`Ce plat (${dish.name}) n'est pas disponible pour le moment.`);
      return;
    }
    const opts = Array.isArray(dish.options_json) ? dish.options_json : [];
    setModalDish(dish);
    setSelectedOpt(opts.length > 0 ? opts[0] : '');
    setModalQty(1);
  };

  const addToCart = (dish: Dish) => {
    openDishSelector(dish);
  };

  const updateQty = () => {};
  const clearCart = () => {};

  const getWhatsAppDirectUrl = (dish: Dish, opt: string, qty: number) => {
    const modeLabel =
      dish.availability_mode === 'daily'
        ? 'Menu du Jour'
        : 'Plat sur Commande';
    const text = [
      `Bonjour *Restaurant La Gratitude*,`,
      `Je souhaite commander :`,
      `- *${qty}x ${dish.name}*${opt ? ` (${opt})` : ''} — ${formatCFA(dish.price * qty)} [${modeLabel}]`,
      `Merci de me confirmer la disponibilité.`
    ].join('\n');
    return `https://wa.me/${RESTAURANT_WHATSAPP}?text=${encodeURIComponent(text)}`;
  };

  return (
    <CartContext.Provider
      value={{
        dishes,
        setDishes,
        refreshDishes,
        cart: [],
        addToCart,
        openDishSelector,
        updateQty,
        clearCart,
        totalItems: 0,
        totalPrice: 0,
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

      {/* FENÊTRE DE COMMANDE PAR TÉLÉPHONE DU PLAT CHOISI */}
      {modalDish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setModalDish(null)}
        >
          <div
            className="bg-[#fffcf7] text-[#2b1810] border-2 border-[#881313] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
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
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-xs shadow">
                {modalDish.availability_mode === 'daily'
                  ? 'Menu du Jour'
                  : 'Sur Commande'}
              </div>
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 text-[#facc15] font-extrabold text-sm whitespace-nowrap">
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
                      Préférence / accompagnement disponible :
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                      {modalDish.options_json.map(opt => (
                        <label
                          key={opt}
                          onClick={() => setSelectedOpt(opt)}
                          className={`flex items-center justify-between p-2 rounded-xl border-2 cursor-pointer text-xs font-bold transition ${
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

              {/* Quantité indicative */}
              <div className="flex items-center justify-between bg-[#fdf5e8] px-3.5 py-2 rounded-xl border border-[#dec6a7] text-xs">
                <span className="font-bold text-stone-700">Quantité souhaitée :</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="font-extrabold text-base px-1.5 text-stone-700"
                  >
                    −
                  </button>
                  <span className="font-extrabold text-sm">{modalQty}</span>
                  <button
                    type="button"
                    onClick={() => setModalQty(q => q + 1)}
                    className="font-extrabold text-base px-1.5 text-[#881313]"
                  >
                    +
                  </button>
                  <span className="font-extrabold text-[#881313] ml-1 whitespace-nowrap">
                    ({formatCFA(modalDish.price * modalQty)})
                  </span>
                </div>
              </div>

              {/* Appel Direct au Restaurant */}
              <div className="space-y-2 pt-1 border-t border-stone-200">
                <p className="text-[11px] text-center font-bold text-stone-600">
                  Pour commander ce plat, appelez directement le restaurant :
                </p>
                <a
                  href={`tel:${RESTAURANT_PHONE_TEL}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 whitespace-nowrap transition"
                >
                  <PhoneIcon className="w-4 h-4 shrink-0" />
                  <span>Appeler le {RESTAURANT_PHONE_DISPLAY}</span>
                </a>
                <a
                  href={getWhatsAppDirectUrl(modalDish, selectedOpt, modalQty)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2 whitespace-nowrap transition"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>Écrire au {RESTAURANT_PHONE_DISPLAY} (WhatsApp)</span>
                </a>
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
