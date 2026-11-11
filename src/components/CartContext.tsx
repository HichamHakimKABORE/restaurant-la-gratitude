'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { INITIAL_DISHES, INITIAL_SETTINGS, type Dish, type RestaurantSettings } from '@/lib/db';
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
  loadingDishes: boolean;
  refreshDishes: () => Promise<void>;
  settings: RestaurantSettings;
  setSettings: React.Dispatch<React.SetStateAction<RestaurantSettings>>;
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
  loadingDishes: true,
  refreshDishes: async () => {},
  settings: INITIAL_SETTINGS,
  setSettings: () => {},
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
  const [dishes, setDishesState] = useState<Dish[]>(INITIAL_DISHES);
  const [loadingDishes, setLoadingDishes] = useState<boolean>(true);
  const [settings, setSettings] = useState<RestaurantSettings>(INITIAL_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [modalDish, setModalDish] = useState<Dish | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);
  const [selectionList, setSelectionList] = useState<CartItem[]>([]);
  const lastLocalWriteRef = useRef<number>(0);

  // Toute modification locale (Admin) marque l'heure d'écriture pour qu'un ancien
  // rafraîchissement automatique en cours n'écrase pas les cases cochées à l'instant.
  const setDishes: React.Dispatch<React.SetStateAction<Dish[]>> = value => {
    lastLocalWriteRef.current = Date.now();
    setDishesState(value);
  };

  // Cache léger : les photos Base64 (très lourdes) ne sont pas stockées dans sessionStorage
  // pour éviter de saturer la mémoire du navigateur (limite d'environ 5 Mo).
  useEffect(() => {
    try {
      const lightCache = dishes.map(d => ({
        ...d,
        image_url: d.image_url?.startsWith('data:') ? '/images/dishes_grid_1.jpg' : d.image_url,
        image_quadrant: d.image_url?.startsWith('data:') ? 'quad-tl' : d.image_quadrant
      }));
      sessionStorage.setItem('gratitude_dishes_cache_v3', JSON.stringify(lightCache));
    } catch {}
  }, [dishes]);

  const refreshDishes = async () => {
    const startedAt = Date.now();
    try {
      const res = await fetch('/api/dishes', { cache: 'no-store' });
      const data = await res.json();
      // Ignore une réponse partie avant (ou juste autour) d'une modification Admin locale
      if (lastLocalWriteRef.current >= startedAt - 3000) return;
      if (Array.isArray(data.dishes) && data.dishes.length > 0) {
        setDishesState(data.dishes);
      }
    } catch {} finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    // Isolation stricte : nettoyage de toute donnée personnelle ou ancien cache stocké localement
    try {
      localStorage.removeItem('gratitude_cart_v2');
      localStorage.removeItem('gratitude_my_orders');
      localStorage.removeItem('gratitude_my_orders_v2');
      sessionStorage.removeItem('gratitude_dishes_cache');
      const cachedDishes = sessionStorage.getItem('gratitude_dishes_cache_v3');
      if (cachedDishes) {
        setDishesState(JSON.parse(cachedDishes));
        setLoadingDishes(false);
      }
    } catch {}

    refreshDishes();

    // Rafraîchissement automatique silencieux quand le client revient sur l'onglet ou toutes les 30 secondes
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshDishes();
      }
    };
    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshDishes();
      }
    }, 30000);

    // Chargement des paramètres dynamiques du restaurant (/api/settings)
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.settings) {
          setSettings(d.settings);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      clearInterval(pollTimer);
    };
  }, []);

  useEffect(() => {
    if (!modalDish) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalDish(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalDish]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const openDishSelector = (dish: Dish) => {
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

  const activePhoneDisplay = settings.phone || RESTAURANT_PHONE_DISPLAY;
  const activePhoneTel = activePhoneDisplay.replace(/\s+/g, '');
  const activeWhatsApp = (settings.whatsapp || RESTAURANT_WHATSAPP).replace(/[^0-9]/g, '') || RESTAURANT_WHATSAPP;

  const addCurrentDishToSelection = (dish: Dish, opt: string, qty: number) => {
    const key = `${dish.id}::${opt || ''}`;
    setSelectionList(prev => {
      const existing = prev.find(item => item.cartKey === key);
      if (existing) {
        return prev.map(item =>
          item.cartKey === key ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { ...dish, cartKey: key, selectedOption: opt, qty }];
    });
    setModalDish(null);
    showToast(`${qty}x ${dish.name} ajouté à votre sélection d’appel !`);
  };

  const removeSelectionItem = (cartKey: string) => {
    setSelectionList(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const clearSelectionList = () => {
    setSelectionList([]);
  };

  const getWhatsAppDirectUrl = (dish: Dish, opt: string, qty: number) => {
    const modeLabel =
      dish.availability_mode === 'daily'
        ? 'Menu du Jour'
        : 'Plat sur Commande';
    const itemsToSend: Array<{ name: string; opt?: string; qty: number; price: number; mode: string }> = [
      ...selectionList.map(it => ({
        name: it.name,
        opt: it.selectedOption,
        qty: it.qty,
        price: it.price,
        mode: it.availability_mode === 'daily' ? 'Menu du Jour' : 'Plat sur Commande'
      })),
      {
        name: dish.name,
        opt,
        qty,
        price: dish.price,
        mode: modeLabel
      }
    ];
    const grandTotal = itemsToSend.reduce((acc, it) => acc + it.price * it.qty, 0);
    const lines = [
      `Bonjour *${settings.restaurant_name || 'Restaurant La Gratitude'}*,`,
      `Je souhaite commander :`,
      ...itemsToSend.map(
        it =>
          `- *${it.qty}x ${it.name}*${it.opt ? ` (${it.opt})` : ''} — ${formatCFA(it.price * it.qty)} [${it.mode}]`
      ),
      `*Total estimé : ${formatCFA(grandTotal)}*`,
      `Merci de me confirmer la disponibilité.`
    ];
    return `https://wa.me/${activeWhatsApp}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const getSelectionOnlyWhatsAppUrl = () => {
    const grandTotal = selectionList.reduce((acc, it) => acc + it.price * it.qty, 0);
    const lines = [
      `Bonjour *${settings.restaurant_name || 'Restaurant La Gratitude'}*,`,
      `Je souhaite commander :`,
      ...selectionList.map(
        it =>
          `- *${it.qty}x ${it.name}*${it.selectedOption ? ` (${it.selectedOption})` : ''} — ${formatCFA(it.price * it.qty)} [${
            it.availability_mode === 'daily' ? 'Menu du Jour' : 'Plat sur Commande'
          }]`
      ),
      `*Total estimé : ${formatCFA(grandTotal)}*`,
      `Merci de me confirmer la disponibilité.`
    ];
    return `https://wa.me/${activeWhatsApp}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const selectionTotalItems = selectionList.reduce((acc, it) => acc + it.qty, 0);
  const selectionTotalPrice = selectionList.reduce((acc, it) => acc + it.price * it.qty, 0);

  return (
    <CartContext.Provider
      value={{
        dishes,
        setDishes,
        loadingDishes,
        refreshDishes,
        settings,
        setSettings,
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
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-[100000] bg-[#16a34a] text-white px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs border border-white/20">
          {toast}
        </div>
      )}

      {/* BARRE FLOTTANTE DE SÉLECTION MULTI-PLATS (Visible quand le client a retenu des plats et fermé la fenêtre) */}
      {!modalDish && selectionList.length > 0 && (
        <div className="fixed bottom-[58px] sm:bottom-[64px] left-2 right-2 z-[90] max-w-xl mx-auto bg-gradient-to-r from-[#2b1810] via-[#431407] to-[#2b1810] text-white border-2 border-[#eab308] rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#eab308] text-[#2b1810] font-extrabold text-[11px] whitespace-nowrap">
                {selectionTotalItems} {selectionTotalItems > 1 ? 'plats choisis' : 'plat choisi'}
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-[#facc15] whitespace-nowrap">
                {formatCFA(selectionTotalPrice)}
              </span>
              <button
                type="button"
                onClick={clearSelectionList}
                className="text-[10px] text-rose-300 hover:text-rose-200 underline ml-1"
              >
                Vider
              </button>
            </div>
            <p className="text-[11px] text-amber-100 truncate mt-0.5">
              {selectionList.map(it => `${it.qty}x ${it.name}`).join(' + ')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={getSelectionOnlyWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs shadow inline-flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp</span>
            </a>
            <a
              href={`tel:${activePhoneTel}`}
              className="px-3 py-2 rounded-xl bg-[#881313] hover:bg-[#a81c1c] text-white font-extrabold text-xs shadow inline-flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Appeler</span>
            </a>
          </div>
        </div>
      )}

      {/* FENÊTRE DE COMMANDE PAR TÉLÉPHONE DU PLAT CHOISI */}
      {modalDish && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setModalDish(null)}
        >
          <div
            className="bg-[#fffcf7] text-[#2b1810] border-2 border-[#881313] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
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
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedOpt(opt)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl border-2 cursor-pointer text-xs font-bold transition text-left ${
                            selectedOpt === opt
                              ? 'bg-amber-50 border-[#881313] text-[#881313]'
                              : 'bg-white border-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{opt}</span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedOpt === opt
                                ? 'border-[#881313] bg-[#881313] text-white'
                                : 'border-stone-400'
                            }`}
                          >
                            {selectedOpt === opt ? <CheckIcon className="w-2.5 h-2.5" /> : null}
                          </span>
                        </button>
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

              {/* Liste des autres plats déjà retenus par le client (si multi-plats) */}
              {selectionList.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#881313]">
                      Déjà dans votre liste ({selectionList.length}) :
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectionList}
                      className="text-[10px] font-bold text-rose-700 underline"
                    >
                      Vider
                    </button>
                  </div>
                  {selectionList.map(item => (
                    <div key={item.cartKey} className="flex items-center justify-between text-[11px]">
                      <span className="truncate font-semibold">
                        {item.qty}x {item.name} {item.selectedOption ? `(${item.selectedOption})` : ''}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-[#881313]">{formatCFA(item.price * item.qty)}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectionItem(item.cartKey)}
                          className="text-rose-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Appel Direct au Restaurant */}
              <div className="space-y-2 pt-1 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => addCurrentDishToSelection(modalDish, selectedOpt, modalQty)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-[#2b1810] border border-amber-400 font-extrabold text-xs transition"
                >
                  + Choisir un autre plat avant d’appeler / WhatsApp
                </button>
                <p className="text-[11px] text-center font-bold text-stone-600">
                  Pour commander, appelez directement le restaurant :
                </p>
                <a
                  href={`tel:${activePhoneTel}`}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#881313] to-[#680e0e] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 whitespace-nowrap transition"
                >
                  <PhoneIcon className="w-4 h-4 shrink-0" />
                  <span>Appeler le {activePhoneDisplay}</span>
                </a>
                <a
                  href={getWhatsAppDirectUrl(modalDish, selectedOpt, modalQty)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2 whitespace-nowrap transition"
                >
                  <WhatsAppIcon className="w-4 h-4 shrink-0" />
                  <span>Écrire au {activePhoneDisplay} (WhatsApp)</span>
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
