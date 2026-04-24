import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Cookie, Settings, User, Phone, MapPin, ClipboardList, Trash2, CheckCircle, LogOut, Package, TrendingUp, DollarSign, ArrowLeft, Home, Truck, Key, LayoutDashboard, BadgeDollarSign, Lock, X, History, Clock, Sparkles, Check, CreditCard, AlertTriangle, QrCode, Mail } from 'lucide-react';
import { Product, CartItem, Order, StockLevels, AppSettings, UserProfile } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocFromServer,
  increment,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe((import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const INSTALLMENT_OPTIONS = [
  { value: 1, label: '1x sem juros' },
  { value: 2, label: '2x (taxa 3%)' },
  { value: 3, label: '3x (taxa 5%)' },
  { value: 4, label: '4x (taxa 7%)' },
  { value: 5, label: '5x (taxa 9%)' },
  { value: 6, label: '6x (taxa 11%)' }
];

const StripePaymentModal = ({ clientSecret, method, onSuccess, onCancel, amount }: { clientSecret: string, method: string, onSuccess: (id: string) => void, onCancel: () => void, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixQRCode, setPixQRCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);

  useEffect(() => {
    if (method === 'pix' && stripe && clientSecret) {
      handlePixPayment();
    }
  }, [method, stripe, clientSecret]);

  const handlePixPayment = async () => {
    if (!stripe) return;
    
    const { paymentIntent, error } = await stripe.confirmPixPayment(clientSecret, {
      payment_method: {
        billing_details: {
          name: 'Cliente Cookie Shop',
        },
      },
    });

    if (error) {
      console.error("Pix Payment Error:", error);
      alert("Erro ao processar Pix: " + error.message);
    } else if (paymentIntent && (paymentIntent.next_action as any)?.pix_display_qr_code) {
      const pixAction = (paymentIntent.next_action as any).pix_display_qr_code;
      setPixQRCode(pixAction.image_url_svg);
      setPixCopyPaste(pixAction.data);
    }
  };

  const handleSubmitCard = async (e: any) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const cardElement = elements.getElement(CardElement);

    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement as any,
      },
    });

    if (error) {
      alert(error.message);
      setIsProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <div className="text-center space-y-6 bg-white p-6 rounded-3xl">
      {method === 'pix' ? (
        <div className="space-y-4">
          <p className="text-sm font-bold text-brown-500">Pague com PIX</p>
          {pixQRCode ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl shadow-inner border border-pink-100 inline-block mx-auto">
                <img src={pixQRCode} alt="PIX QR Code" className="w-[220px] h-[220px]" />
              </div>
              <div className="space-y-2 text-left">
                <p className="text-[10px] font-black text-brown-300 uppercase tracking-widest text-center">Código Copia e Cola</p>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={pixCopyPaste || ''}
                    className="flex-1 bg-pink-50/50 border border-pink-100 rounded-xl px-3 py-2 text-[10px] font-mono text-brown-500 outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pixCopyPaste || '');
                      alert('Copiado! 🍪');
                    }}
                    className="bg-pink-400 text-white p-2.5 rounded-xl transition-all hover:bg-pink-500 active:scale-90"
                  >
                    <ClipboardList size={18} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => onSuccess('stripe_pix_pending')}
                className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-pink-200 active:scale-95 transition-all"
              >
                Já paguei! ✨
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
              <p className="text-xs text-brown-400 font-bold">Gerando QR Code...</p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmitCard} className="space-y-6 py-4">
          <div className="text-left space-y-2">
            <label className="text-[10px] font-black text-brown-300 uppercase tracking-widest">Detalhes do Cartão</label>
            <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-2xl">
              <CardElement options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#431407',
                    '::placeholder': { color: '#9d174d80' },
                  },
                },
              }} />
            </div>
          </div>
          
          <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
             <p className="text-xs text-brown-500 font-bold">Total a pagar: R$ {amount.toFixed(2).replace('.', ',')}</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border-2 border-pink-200 text-pink-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-pink-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !stripe}
              className="flex-[2] bg-pink-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-pink-200 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Processando...' : 'Confirmar e Pagar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const INITIAL_SETTINGS: AppSettings = {
  whatsappNumber: '5591984657021',
  deliveryFee: 15.00,
  messageTemplate1: "*01-Pedido nº {orderNum}*\n\n*Itens:*\n{detailedItems}\n\n{deliveryInfo}Total Geral: *R$ {total}*\n\nObrigado pela preferência! 🍪✨",
  messageTemplate2: "*02-{client}*, o pedido *Nº {orderNum}* está em produção. 🍪✨",
  messageTemplate3: "*03- Tô chegando!* Seu pedido já está na rota de *entrega* 🛵🍪",
  messageTemplate4: "*04- Obaa!* Seu pedido já está pronto para *retirada* 🏪🍪✨",
  messageTemplate5: "*05- Poxa!* Seu pedido *Nº {orderNum}* foi cancelado. Se tiver dúvidas, entre em contato conosco. 🍪💔",
  loyaltyEnabled: true,
  pointsPerReal: 1,
  realPerPoint: 0.1
};

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, emoji: '🍫', name: 'Chocolate Chip', desc: 'Gotas de chocolate ao leite belga', price: 8.50, isNew: true, stock: 20, category: 'Clássicos', image: 'https://picsum.photos/seed/cookies1/400/500' },
  { id: 2, emoji: '🥜', name: 'Nutella Recheado', desc: 'Recheio cremoso e irresistível', price: 10.00, isNew: true, stock: 15, category: 'Recheados', image: 'https://picsum.photos/seed/cookies2/400/500' },
  { id: 3, emoji: '🍓', name: 'Morango Branco', desc: 'Chocolate branco + pedaços de morango', price: 9.50, isNew: false, stock: 18, category: 'Especiais', image: 'https://picsum.photos/seed/cookies3/400/500' },
  { id: 4, emoji: '🧁', name: 'Red Velvet', desc: 'Massa vermelha, veludada, recheio cream cheese', price: 10.50, isNew: false, stock: 12, category: 'Especiais', image: 'https://picsum.photos/seed/cookies4/400/500' },
  { id: 5, emoji: '🍪', name: 'Tradicional', desc: 'A receita secreta que você já ama', price: 7.00, isNew: false, stock: 25, category: 'Clássicos', image: 'https://picsum.photos/seed/cookies5/400/500' },
  { id: 6, emoji: '🍋', name: 'Limão Siciliano', desc: 'Sabor refrescante com toque cítrico', price: 9.00, isNew: true, stock: 10, category: 'Recheados', image: 'https://picsum.photos/seed/cookies6/400/500' },
];

const CATEGORIES = ['Tudo', 'Clássicos', 'Recheados', 'Especiais'];

function CookieApp() {
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [currentPage, setCurrentPage] = useState<'cardapio' | 'pedido' | 'admin' | 'perfil' | 'login'>('cardapio');
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  // Sync admin path if needed
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setIsAdminPath(true);
      setCurrentPage('admin');
    }
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('Tudo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockLevels>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [adminPass, setAdminPass] = useState('');
  const [adminTab, setAdminTab] = useState<'pedidos' | 'estoque' | 'financeiro' | 'config'>('pedidos');
  const [isOrderFormVisible, setIsOrderFormVisible] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | number | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | number | null>(null);
  const [viewingHistory, setViewingHistory] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isNew: boolean, productId?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        showToast('⚠️ Imagem muito grande! Use até 700KB para garantir que salve no banco.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isNew) {
          setNewProduct(prev => ({ ...prev, image: base64String }));
        } else if (productId) {
          updateDoc(doc(db, 'products', String(productId)), { image: base64String })
            .catch(err => console.error("Erro ao atualizar imagem:", err));
          showToast('📸 Imagem atualizada!');
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    emoji: '🍪',
    name: '',
    desc: '',
    category: 'Clássicos',
    price: '',
    stock: '',
    image: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    deliveryType: 'retirada' as 'retirada' | 'delivery',
    address: '',
    obs: '',
    paymentMethod: 'pix' as 'pix' | 'card_credit' | 'card_debit',
    cardholderName: '',
    installments: 1,
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  });

  const [pagBankOrder, setPagBankOrder] = useState<any>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Sync user profile to form and admin state
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name,
        phone: userProfile.phone
      }));
      if (userProfile.isAdmin) {
        setIsAdmin(true);
      }
    } else {
      setIsAdmin(false);
    }
  }, [userProfile]);

  // Load Data
  useEffect(() => {
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch User Profile
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const isAdmin = firebaseUser.email === 'jumonteiro2901@gmail.com';
        
        if (userDoc.exists()) {
          const profileData = userDoc.data() as Omit<UserProfile, 'uid'>;
          setUserProfile({ uid: firebaseUser.uid, ...profileData, isAdmin: profileData.isAdmin || isAdmin });
        } else if (isAdmin) {
          // Admin bootstrap without doc
          setUserProfile({ 
            uid: firebaseUser.uid, 
            name: 'Administrador', 
            email: firebaseUser.email || '', 
            phone: '', 
            points: 0, 
            isAdmin: true 
          });
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    // Test Firestore Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Fetch Orders (Admin sees all, User sees own)
    // We'll manage this in a better way: 
    // Admin gets a listener for all orders
    // Users get a listener for THEIR orders
  }, []);

  useEffect(() => {
    if (!authLoading) {
      let q;
      if (userProfile?.isAdmin) {
        q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      } else if (user) {
        q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
      } else {
        return;
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
        setOrders(ordersData);
      });

      return () => unsubscribe();
    }
  }, [user, userProfile, authLoading]);

  // Fetch Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      }
    });

    // Fetch Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Product[];
      
      // If Firestore is empty, we show INITIAL_PRODUCTS while the first admin doesn't seed them
      // This ensures customers see something even if the DB is fresh
      if (snapshot.empty) {
        setProducts(INITIAL_PRODUCTS);
      } else {
        setProducts(prods);
      }
      
      // Sync stock state
      const newStock: StockLevels = {};
      (snapshot.empty ? INITIAL_PRODUCTS : prods).forEach((p: any) => {
        newStock[p.id] = p.stock;
      });
      setStock(newStock);
    }, (error) => {
      console.error("Erro ao buscar produtos:", error);
      setProducts(INITIAL_PRODUCTS); // Fallback on error
    });

    return () => {
      unsubscribe();
      unsubProducts();
    };
  }, []);

  // Seeding Logic (Triggered only when Admin logs in and data is missing)
  useEffect(() => {
    const seed = async () => {
      if (userProfile?.isAdmin) {
        // Seed Settings
        if (!settings.whatsappNumber) {
          const snap = await getDoc(doc(db, 'settings', 'main'));
          if (!snap.exists()) {
            await setDoc(doc(db, 'settings', 'main'), INITIAL_SETTINGS);
          }
        }
        
        // Seed Products if none exist
        const productsSnap = await getDoc(doc(db, 'settings', 'seeded_products'));
        if (!productsSnap.exists()) {
          for (const p of INITIAL_PRODUCTS) {
            const productRef = doc(collection(db, 'products'));
            await setDoc(productRef, p);
          }
          await setDoc(doc(db, 'settings', 'seeded_products'), { done: true });
        }
      }
    };
    seed();
  }, [userProfile, settings.whatsappNumber]);

  // Validation Helpers
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pass: string) => pass.length >= 6;

  const handleAuth = async () => {
    if (isSubmitting) return;

    const email = authForm.email.trim();
    const password = authForm.password; // Don't trim password as spaces might be intentional (though blocked by regex)
    const name = authForm.name.trim();
    const phone = authForm.phone.trim();

    const confirmPassword = authForm.confirmPassword;

    if (!validateEmail(email)) {
      showToast('❌ E-mail inválido!');
      return;
    }
    if (!validatePassword(password)) {
      showToast('❌ A senha deve ter no mínimo 6 caracteres!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (loginMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        showToast('📧 Link de redefinição enviado para seu e-mail!');
        setLoginMode('login');
        setIsSubmitting(false);
        return;
      }

      if (loginMode === 'register') {
        if (!name || !phone || !confirmPassword) {
          showToast('⚠️ Preencha todos os campos!');
          setIsSubmitting(false);
          return;
        }
        if (name.length < 3) {
          showToast('⚠️ Nome deve ter pelo menos 3 letras!');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          showToast('❌ As senhas não coincidem!');
          setIsSubmitting(false);
          return;
        }
        
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
        
        // Enviar verificação de e-mail
        await sendEmailVerification(newUser);
        showToast('📧 Link de verificação enviado para seu e-mail!');

        // Create profile in Firestore
        const profile = {
          name: name,
          email: email,
          phone: phone.replace(/\D/g, ''),
          points: 0,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', newUser.uid), profile);

        // Envío automático de email de boas vindas via API backend
        try {
          await fetch('/api/welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
        } catch (e) {
          console.error('Falha ao enviar email de boas-vindas:', e);
        }

        setUserProfile({ 
          uid: newUser.uid, 
          ...profile, 
          isAdmin: newUser.email === 'jumonteiro2901@gmail.com' 
        });
        showToast('✨ Conta criada com sucesso!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('👋 Bem-vindo(a) de volta!');
      }
      setTimeout(() => setCurrentPage('cardapio'), 500); // Small delay to let user see the success toast
    } catch (error: any) {
      console.error('Erro detalhado na autenticação:', error);
      let msg = '❌ Erro: ' + (error.code || 'Erro desconhecido');
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = '❌ E-mail ou senha incorretos!';
      } else if (error.code === 'auth/email-already-in-use') {
        msg = '❌ Este e-mail já está em uso!';
      } else if (error.code === 'auth/weak-password') {
        msg = '❌ Senha muito fraca! (mínimo 6 caracteres)';
      } else if (error.code === 'auth/invalid-email') {
        msg = '❌ Formato de e-mail inválido!';
      } else if (error.code === 'auth/operation-not-allowed') {
        msg = '❌ Erro: Login com e-mail não habilitado no Firebase Console.';
      } else if (error.code === 'permission-denied') {
        msg = '❌ Erro de permissão: Firestore bloqueou o cadastro.';
      } else {
        msg = '❌ ' + (error.message || 'Erro ao processar cadastro.');
      }
      
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast('🚪 Até logo!');
    setCurrentPage('cardapio');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addToCart = (product: Product) => {
    const currentStock = stock[product.id] !== undefined ? stock[product.id] : product.stock;
    const inCart = cart.find(i => i.id === product.id)?.qty || 0;

    if (currentStock <= inCart) {
      showToast(`❌ Desculpe, ${product.name} esgotado!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    showToast(`${product.emoji} ${product.name} adicionado!`);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 1000);
  };

  const handleReorder = (order: Order) => {
    let checkAnyAdded = false;
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return;

      const currentStock = stock[product.id] !== undefined ? stock[product.id] : product.stock;
      const inCart = (cart.find(i => i.id === product.id)?.qty || 0);
      
      const qtyToAdd = Math.min(item.qty, currentStock - inCart);
      
      if (qtyToAdd > 0) {
        checkAnyAdded = true;
        setCart(prev => {
          const existing = prev.find(i => i.id === product.id);
          if (existing) {
            return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qtyToAdd } : i);
          }
          return [...prev, { ...product, qty: qtyToAdd }];
        });
      }
    });

    if (checkAnyAdded) {
      showToast('🛒 Itens adicionados ao seu carrinho!');
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 1000);
      setCurrentPage('pedido');
    } else {
      showToast('⚠️ Desculpe, os itens deste pedido estão esgotados.');
    }
  };

  const changeQty = (id: number, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (delta > 0) {
      const currentStock = stock[id] !== undefined ? stock[id] : product.stock;
      const inCart = cart.find(i => i.id === id)?.qty || 0;
      if (currentStock <= inCart) {
        showToast('❌ Limite de estoque atingido!');
        return;
      }
    }

    setCart(prev => {
      return prev.map(i => {
        if (i.id === id) {
          const newQty = i.qty + delta;
          return newQty > 0 ? { ...i, qty: newQty } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  const getWhatsAppMessage = (order: Order, type: 1 | 2 | 3 | 4 | 5) => {
    const orderNum = order.id.toString().slice(-5);
    const itemsText = order.items.map(i => `➡ \`\`\`${i.qty}x ${i.name} R$ ${(i.price * i.qty).toFixed(2).replace('.', ',')}\`\`\``).join('\n');
    const detailedItems = order.items.map(i => 
      `🍪 *${i.name}*\n   ${i.qty} un x R$ ${i.price.toFixed(2).replace('.', ',')} = *R$ ${(i.price * i.qty).toFixed(2).replace('.', ',')}*`
    ).join('\n\n');
    
    const hasDelivery = order.delivery === 'delivery';
    const discount = order.discountValue || 0;
    const finalTotal = order.total + (hasDelivery ? settings.deliveryFee : 0) - discount;
    
    const deliveryInfo = hasDelivery 
    ? `🛵 *Delivery* (taxa de: *R$ ${settings.deliveryFee.toFixed(2).replace('.', ',')}*)\n🏠 ${order.address}\n(Estimativa: *entre 25~70 minutos*)\n\n`
    : `🏪 *Retirada no local*\n\n`;

    const discountInfo = discount > 0 
      ? `🎁 *Fidelidade:* -R$ ${discount.toFixed(2).replace('.', ',')}\n`
      : '';

    const schedulingInfo = order.isScheduled 
      ? `📅 *ENCOMENDA AGENDADA*\n🗓️ Data: *${order.scheduledDate}*\n⏰ Horário: *${order.scheduledTime}*\n💰 *PAGO (50%):* R$ ${order.paidAmount?.toFixed(2).replace('.', ',')}\n💳 *FALTA PAGAR:* R$ ${order.remainingAmount?.toFixed(2).replace('.', ',')}\n\n`
      : '';

    let template = "";
    if (type === 1) template = settings.messageTemplate1;
    if (type === 2) template = settings.messageTemplate2;
    if (type === 3) template = settings.messageTemplate3;
    if (type === 4) template = settings.messageTemplate4;
    if (type === 5) template = settings.messageTemplate5;

    return template
      .replace('{orderNum}', orderNum)
      .replace('{itemsText}', itemsText)
      .replace('{detailedItems}', detailedItems)
      .replace('{client}', order.client)
      .replace('{deliveryFee}', settings.deliveryFee.toFixed(2).replace('.', ','))
      .replace('{deliveryInfo}', deliveryInfo + discountInfo + schedulingInfo)
      .replace('{address}', order.address)
      .replace('{total}', finalTotal.toFixed(2).replace('.', ','));
  };

  const handleUpdateStatus = async (order: Order, newStatus: Order['status'], messageType?: 1 | 2 | 3 | 4 | 5) => {
    try {
      // Update Firestore
      await updateDoc(doc(db, 'orders', order.id.toString()), { status: newStatus });

      // Handle Points if completed (Add points only if they weren't added before)
      if (newStatus === 'completed' && order.status !== 'completed' && settings.loyaltyEnabled) {
        const pointsEarned = Math.floor(order.total * settings.pointsPerReal);
        if (order.userId) {
          const userRef = doc(db, 'users', order.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            await updateDoc(userRef, { points: increment(pointsEarned) });
            showToast(`🎁 +${pointsEarned} pontos ganhos por ${order.client}!`);
          }
        }
      }

      // Restore Points if canceled (Only if points were used in this order)
      if (newStatus === 'canceled' && order.status !== 'canceled' && order.userId && (order.pointsRedeemed || 0) > 0) {
          await updateDoc(doc(db, 'users', order.userId), {
              points: increment(order.pointsRedeemed || 0)
          });
          showToast(`♻️ ${order.pointsRedeemed} pontos devolvidos ao cliente!`);
      }

      // Send Signal/Message
      if (messageType) {
        const automatedMsg = getWhatsAppMessage(order, messageType);
        fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: order.phone, message: automatedMsg })
        }).catch(err => console.error('Erro ao enviar WA automático:', err));
      }

      showToast(`✅ Status: ${newStatus.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      showToast('❌ Erro ao atualizar status');
    }
  };

  const handleSendOrder = async () => {
    if (user && !user.emailVerified) {
      showToast('📧 Por favor, verifique seu e-mail para continuar.');
      return;
    }

    if (!formData.name || !formData.phone) {
      showToast('⚠️ Preencha nome e WhatsApp!');
      return;
    }

    if (formData.deliveryType === 'delivery' && (formData.address.trim().length < 10 || !/\d/.test(formData.address))) {
      showToast('⚠️ Endereço incompleto! Inclua rua, nº e bairro.');
      return;
    }

    if (formData.isScheduled && (!formData.scheduledDate || !formData.scheduledTime)) {
      showToast('⚠️ Informe a data e horário para o agendamento!');
      return;
    }

    const userPhone = formData.phone.replace(/\D/g, '').replace(/^55/, '');
    const userPoints = userProfile?.points || 0;
    
    // Calculate accurate discount and points to be deducted
    const potentialDiscount = userPoints * settings.realPerPoint;
    const actualDiscountValue = (usePoints && settings.loyaltyEnabled) ? Math.min(cartTotal, potentialDiscount) : 0;
    
    // For scheduled orders, delivery fee is 'to be combined' later
    const currentDeliveryFee = (formData.deliveryType === 'delivery' && !formData.isScheduled) ? settings.deliveryFee : 0;
    const totalBeforePartial = cartTotal + currentDeliveryFee - actualDiscountValue;
    
    // 50% for scheduled orders
    const amountToPayNow = formData.isScheduled ? (totalBeforePartial / 2) : totalBeforePartial;

    // Apply installment fees for credit card
    let feeMultiplier = 1;
    if (formData.paymentMethod === 'card_credit' && formData.installments > 1) {
      if (formData.installments === 2) feeMultiplier = 1.03;
      else if (formData.installments === 3) feeMultiplier = 1.05;
      else if (formData.installments === 4) feeMultiplier = 1.07;
      else if (formData.installments === 5) feeMultiplier = 1.09;
      else if (formData.installments === 6) feeMultiplier = 1.11;
    }
    const finalAmount = amountToPayNow * feeMultiplier;

    if (finalAmount <= 0) {
      // Free order (loyalty)? Just finalize
      finalizeOrder(actualDiscountValue, 0);
      return;
    }

    if (['card_credit', 'card_debit'].includes(formData.paymentMethod) && !formData.cardholderName.trim()) {
      showToast('⚠️ Informe o nome impresso no cartão!');
      return;
    }

    if (formData.paymentMethod === 'card_credit' && (formData.installments < 1 || formData.installments > 6)) {
      showToast('⚠️ Opção de parcelamento inválida! Selecione entre 1x e 6x.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/create-stripe-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          customer: {
            name: formData.name,
            email: user?.email || 'cliente@cookieshop.com',
            phone: formData.phone.replace(/\D/g, ""),
          },
          paymentMethod: formData.paymentMethod === 'pix' ? 'pix' : 'card'
        })
      });

      const intentData = await response.json();
      if (!response.ok) {
        throw new Error(intentData.error || 'Erro ao processar com Stripe');
      }

      setPagBankOrder(intentData); 
      setPaymentVisible(true);
    } catch (error: any) {
      console.error('Payment Error:', error);
      showToast('❌ Erro no pagamento: ' + error.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const finalizeOrder = async (actualDiscountValue: number, pointsRedeemed: number, stripePaymentId?: string) => {
    const userPhone = formData.phone.replace(/\D/g, '').replace(/^55/, '');
    const userPoints = userProfile?.points || 0;

    const potentialDiscount = userPoints * settings.realPerPoint;
    const currentDeliveryFee = (formData.deliveryType === 'delivery' && !formData.isScheduled) ? settings.deliveryFee : 0;
    const totalBeforePartial = cartTotal + currentDeliveryFee - actualDiscountValue;

    // Apply installment fees for credit card in the final record
    let feeMultiplier = 1;
    if (formData.paymentMethod === 'card_credit' && formData.installments > 1) {
      if (formData.installments === 2) feeMultiplier = 1.03;
      else if (formData.installments === 3) feeMultiplier = 1.05;
      else if (formData.installments === 4) feeMultiplier = 1.07;
      else if (formData.installments === 5) feeMultiplier = 1.09;
      else if (formData.installments === 6) feeMultiplier = 1.11;
    }
    const totalWithFees = totalBeforePartial * feeMultiplier;
    const amountPaid = formData.isScheduled ? (totalWithFees / 2) : totalWithFees;
    const remaining = totalWithFees - amountPaid;

    const orderData = {
      client: formData.name,
      phone: userPhone,
      delivery: formData.deliveryType,
      address: formData.deliveryType === 'delivery' ? formData.address : '',
      items: [...cart],
      total: cartTotal,
      obs: formData.obs,
      status: 'pending',
      date: new Date().toLocaleDateString('pt-BR'),
      timestamp: serverTimestamp(),
      userId: user?.uid || null,
      pointsRedeemed: pointsRedeemed,
      discountValue: actualDiscountValue,
      paymentId: stripePaymentId || 'loyalty_redemption',
      paymentMethod: formData.paymentMethod,
      installments: formData.installments,
      isScheduled: formData.isScheduled,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      paidAmount: amountPaid,
      remainingAmount: remaining
    };

    try {
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      if (user && pointsRedeemed > 0) {
        await updateDoc(doc(db, 'users', user.uid), {
          points: increment(-pointsRedeemed)
        });
        setUserProfile(prev => prev ? { ...prev, points: Math.max(0, userPoints - pointsRedeemed) } : null);
      }

      // Firestore stock update
      cart.forEach(async (item) => {
          await updateDoc(doc(db, 'products', String(item.id)), {
              stock: increment(-item.qty)
          });
      });
      
      const msg = getWhatsAppMessage({ id: orderRef.id, ...orderData } as Order, 1);
      
      // Automated Confirmation Message
      fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: orderData.phone, message: msg })
      }).catch(err => console.error('Erro ao enviar WA confirmação:', err));

      setCart([]);
      setIsOrderFormVisible(false);
      setPaymentVisible(false);
      setPagBankOrder(null);
      showToast('✅ Pedido enviado! Obrigada 💕');
      setCurrentPage('cardapio');
    } catch (error) {
      console.error(error);
      showToast('❌ Erro ao salvar pedido.');
    }
  };

  return (
    <div className="max-w-[430px] mx-auto bg-pink-50 min-h-screen relative overflow-x-hidden pb-24 selection:bg-pink-100 selection:text-pink-700">
      {/* Background Sparkles */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20 transition-opacity duration-1000">
        <div className="absolute top-[10%] left-[5%] animate-pulse text-pink-300">✦</div>
        <div className="absolute top-[20%] right-[10%] animate-bounce text-pink-400 delay-300">✧</div>
        <div className="absolute bottom-[30%] left-[15%] animate-pulse text-pink-200 delay-500">✦</div>
        <div className="absolute top-[50%] right-[20%] animate-bounce text-pink-300 delay-700">✧</div>
        <div className="absolute bottom-[10%] right-[15%] animate-pulse text-pink-400 delay-1000">✦</div>
      </div>

      {/* Header */}
      <header className="glass-header px-4 py-5 text-center flex flex-col items-center">
        <div className="relative group">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="Doce&Magia Cookies" 
              className="h-32 w-auto drop-shadow-xl mb-2 object-contain transition-transform group-hover:scale-110 duration-500"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-pacifico text-4xl text-pink-700 drop-shadow-sm">Doce</span>
                <div className="relative">
                  <Cookie className="text-brown-400 rotate-12" size={40} />
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    <div className="w-1 h-1 bg-gold rounded-full animate-pulse" />
                    <div className="w-1 h-1 bg-pink-300 rounded-full animate-pulse delay-75" />
                  </div>
                </div>
                <span className="font-pacifico text-4xl text-pink-700 drop-shadow-sm">Magia</span>
              </div>
              <div className="text-[10px] font-black tracking-[0.5em] text-brown-300 uppercase opacity-80 mt-1">
                ✦ Cookies Artesanais ✦
              </div>
              <div className="mt-2 text-[8px] text-pink-400/50 italic">
                (Personalizando seu logotipo...)
              </div>
            </div>
          )}
        </div>
        <nav className="flex items-center gap-1.5 mt-5 bg-pink-100/30 p-1 rounded-full border border-pink-100/50">
          {[
            { id: 'cardapio', label: 'Cardápio', icon: Cookie },
            { id: 'pedido', label: 'Pedido', icon: ShoppingCart },
            ...(userProfile?.isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings }] : []),
            { id: user ? 'perfil' : 'login', label: user ? 'Perfil' : 'Entrar', icon: user ? User : Key }
          ].map(btn => {
            if (authLoading && (btn.id === 'perfil' || btn.id === 'login')) return null;
            const Icon = btn.icon;
            const active = currentPage === btn.id;
            const isCart = btn.id === 'pedido';
            
            return (
              <button
                key={btn.id}
                onClick={() => setCurrentPage(btn.id as any)}
                className={`relative px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-white text-pink-700 shadow-soft'
                    : 'text-brown-300 hover:text-pink-700'
                } ${isCart && isBouncing ? 'bg-pink-100/50 text-pink-700 ring-4 ring-pink-400/20' : ''}`}
              >
                <div className="relative">
                  {isCart && isBouncing && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      className="absolute inset-0 bg-pink-400 rounded-full"
                    />
                  )}
                  <motion.div
                    animate={isCart && isBouncing ? { 
                      scale: [1, 1.4, 1.2, 1],
                      rotate: [0, -10, 10, 0],
                      y: [0, -8, 0],
                      filter: ["drop-shadow(0 0 0px #f472b6)", "drop-shadow(0 0 12px #f472b6)", "drop-shadow(0 0 0px #f472b6)"]
                    } : {}}
                    transition={{ 
                      duration: 0.6,
                      delay: isCart && isBouncing ? 0.1 : 0 
                    }}
                  >
                    <Icon size={14} className={active || (isCart && isBouncing) ? 'text-pink-400' : 'opacity-60'} />
                  </motion.div>
                  
                  {isCart && cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </div>
                {btn.label}
                {btn.id === 'admin' && orders.some(o => o.isNew) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 relative z-10">
        {user && !user.emailVerified && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-4 bg-orange-50 border border-orange-200 p-4 rounded-3xl flex items-center justify-between gap-3 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black text-orange-700 uppercase tracking-tight">Verifique seu e-mail!</p>
                <p className="text-[10px] font-bold text-orange-600 opacity-80 leading-tight">Confirme sua conta para realizar pedidos e ganhar pontos.</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                try {
                  await sendEmailVerification(user);
                  showToast('📧 Link enviado com sucesso!');
                } catch (e) {
                  showToast('❌ Erro ao enviar link. Tente novamente.');
                }
              }}
              className="text-[9px] font-black text-white bg-orange-500 px-3 py-2 rounded-xl whitespace-nowrap active:scale-95 transition-transform shrink-0"
            >
              Reenviar
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {currentPage === 'cardapio' && (
            <motion.div
              key="cardapio"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="relative overflow-hidden bg-white px-6 py-10 text-center mb-8 rounded-2xl shadow-soft border border-pink-100/30">
                {/* Visual Decorations */}
                <div className="absolute top-0 right-0 p-4 font-pacifico text-pink-100 text-6xl opacity-20 pointer-events-none select-none">Magia</div>
                <div className="absolute bottom-0 left-0 p-4 font-pacifico text-pink-100 text-6xl opacity-20 pointer-events-none select-none">Doce</div>
                
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 mx-auto mb-6 bg-pink-50 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden"
                >
                  <span className="text-6xl">🍪</span>
                </motion.div>
                <h1 className="font-pacifico text-4xl text-pink-700 leading-[1.1] mb-3">Autêntico e Delicioso</h1>
                <p className="text-sm text-brown-300 font-semibold mb-6 max-w-[240px] mx-auto leading-relaxed">
                  Feito artesanalmente com os melhores ingredientes. <span className="text-pink-400">Entrega rápida e segura.</span>
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className="bg-pink-50 text-pink-700 text-[10px] font-black px-3 py-1 rounded-full border border-pink-100 uppercase tracking-widest">🛵 Delivery</span>
                  <span className="bg-pink-50 text-pink-700 text-[10px] font-black px-3 py-1 rounded-full border border-pink-100 uppercase tracking-widest">🏪 Retirada</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between mb-5 px-1">
                <h2 className="font-outfit text-2xl font-extrabold text-brown-500">Nossos Sabores</h2>
                <div className="h-1 flex-1 mx-4 bg-pink-100/50 rounded-full" />
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar -mx-1 px-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border ${
                      selectedCategory === cat
                        ? 'bg-pink-400 text-white border-pink-400 shadow-soft scale-105'
                        : 'bg-white text-brown-300 border-pink-100 hover:border-pink-300 hover:shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {products
                  .filter(p => selectedCategory === 'Tudo' || p.category === selectedCategory)
                  .map(product => {
                    const s = stock[product.id] !== undefined ? stock[product.id] : product.stock;
                    const isOutOfStock = s <= 0;
                    
                    return (
                      <motion.div
                        layout
                        key={product.id}
                        className={`bg-white rounded-3xl overflow-hidden shadow-soft border border-pink-100/50 relative group card-hover ${
                          isOutOfStock ? 'opacity-70 grayscale-[0.5]' : ''
                        }`}
                      >
                        {product.isNew && !isOutOfStock && (
                          <div className="absolute top-3 left-3 bg-gold text-brown-500 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest z-10 shadow-sm border border-white/50">
                            ✨ Novo
                          </div>
                        )}
                        
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-20 flex items-center justify-center p-3 text-center">
                            <span className="font-black text-[10px] text-red-600 bg-white px-3 py-1.5 rounded-2xl border border-red-100 shadow-sm uppercase tracking-wider">
                              Esgotado
                            </span>
                          </div>
                        )}

                        <div className="aspect-[4/5] bg-gradient-to-b from-pink-50/50 to-white flex items-center justify-center transition-all duration-700 group-hover:scale-110 overflow-hidden">
                          {product.image ? (
                            <img src={product.image} className="w-full h-full object-cover" alt={product.name} referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-6xl">{product.emoji}</span>
                          )}
                        </div>
                        
                        <div className="p-4 pt-2">
                          <div className="text-[10px] text-pink-400 font-black uppercase tracking-[0.1em] mb-1">{product.category}</div>
                          <div className="font-outfit font-extrabold text-sm text-brown-500 leading-tight mb-3 line-clamp-1">{product.name}</div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <div className="font-outfit font-extrabold text-pink-700 text-lg">
                              <span className="text-[10px] opacity-70 mr-0.5">R$</span> {product.price.toFixed(2).replace('.', ',')}
                            </div>
                            {!isOutOfStock && (
                              <button
                                onClick={() => addToCart(product)}
                                className="bg-pink-400 text-white w-9 h-9 rounded-2xl flex items-center justify-center shadow-soft hover:bg-pink-700 active:scale-90 transition-all z-30 animate-pulse-soft"
                              >
                                <ShoppingCart size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {currentPage === 'pedido' && (
            <motion.div
              key="pedido"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!isOrderFormVisible ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-pink-100 rounded-3xl flex items-center justify-center text-pink-700">
                      <ShoppingCart size={24} />
                    </div>
                    <div>
                      <h2 className="font-outfit text-2xl font-extrabold text-brown-500 tracking-tight">Seu Carrinho</h2>
                      <p className="text-[11px] text-pink-400 font-black uppercase tracking-widest">Itens selecionados</p>
                    </div>
                  </div>

                  {cart.length === 0 ? (
                    <div className="bg-white rounded-[40px] p-12 text-center shadow-soft border border-pink-100/50">
                      <div className="text-6xl mb-6">🏜️</div>
                      <p className="font-outfit text-xl font-extrabold text-brown-500 mb-2 tracking-tight">Vazio por aqui...</p>
                      <p className="text-xs text-brown-300 mb-8 font-semibold">Nenhum cookie foi adicionado ainda.</p>
                      <button
                        onClick={() => setCurrentPage('cardapio')}
                        className="bg-pink-400 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-soft hover:bg-pink-700 transition-all"
                      >
                        Começar compras
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {cart.map(item => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={item.id} 
                            className="bg-white rounded-[28px] p-4 flex items-center gap-4 shadow-soft border border-pink-50"
                          >
                            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl">
                              {item.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-outfit font-extrabold text-sm text-brown-500 truncate tracking-tight">{item.name}</div>
                              <div className="text-xs text-pink-700 font-black mt-1">
                                <span className="opacity-60 text-[10px] mr-0.5 font-bold">R$</span> 
                                {(item.price * item.qty).toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                            <div className="flex items-center bg-pink-50/50 p-1 rounded-2xl border border-pink-100">
                              <button
                                onClick={() => changeQty(item.id, -1)}
                                className="w-8 h-8 text-pink-700 rounded-xl flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                              >
                                <motion.span whileTap={{ scale: 0.8 }}>−</motion.span>
                              </button>
                              <span className="font-outfit font-black text-sm w-7 text-center text-brown-500">{item.qty}</span>
                              <button
                                onClick={() => changeQty(item.id, 1)}
                                className="w-8 h-8 text-pink-700 rounded-xl flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
                              >
                                <motion.span whileTap={{ scale: 0.8 }}>+</motion.span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      <div className="bg-brown-500 text-white rounded-[40px] p-7 mt-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                        
                        <div className="space-y-4 relative z-10">
                          <div className="flex justify-between items-center text-[10px] opacity-70 font-black uppercase tracking-[0.2em]">
                            <span>Subtotal</span>
                            <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] opacity-70 font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                            <span>Taxa de entrega</span>
                            <span className="text-[9px] bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                              {formData.deliveryType === 'delivery' ? `R$ ${settings.deliveryFee.toFixed(2).replace('.', ',')}` : '🤝 Isento'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="font-outfit text-xl font-extrabold tracking-tight">Total Estimado</span>
                            <span className="font-outfit text-3xl font-black text-pink-100 italic">
                              R$ {(cartTotal + (formData.deliveryType === 'delivery' ? settings.deliveryFee : 0)).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsOrderFormVisible(true)}
                          className="w-full mt-8 bg-pink-400 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-white hover:text-pink-700 hover:translate-y-[-2px] transition-all active:scale-95"
                        >
                          Ir para o Checkout ✨
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsOrderFormVisible(false)} 
                      className="w-11 h-11 bg-white shadow-soft rounded-2xl flex items-center justify-center text-brown-500 border border-pink-100 hover:bg-pink-50 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h2 className="font-outfit text-2xl font-extrabold text-brown-500 tracking-tight">Checkout Final</h2>
                      <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest">Informações de Envio</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-[32px] p-7 shadow-soft border border-pink-100 space-y-6">
                    {settings.loyaltyEnabled && userProfile && userProfile.points > 0 && (
                      <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-3xl border border-pink-100/50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-700">
                            <BadgeDollarSign size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-pink-400 leading-none mb-1">Seus Pontos ✨</p>
                            <p className="text-xs font-bold text-brown-500">
                              {userProfile.points} pontos disponíveis
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setUsePoints(!usePoints)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                            usePoints 
                              ? 'bg-pink-400 text-white shadow-soft ring-2 ring-pink-400 ring-offset-2' 
                              : 'bg-white text-pink-400 border border-pink-100 hover:bg-pink-50'
                          }`}
                        >
                          {usePoints ? <CheckCircle size={14} /> : null}
                          {usePoints ? 'Usando' : 'Usar'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Seu nome Completo *</label>
                      <input
                        type="text"
                        placeholder="Ex: Juliana Monteiro"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-brown-300/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">WhatsApp para contato *</label>
                      <input
                        type="tel"
                        placeholder="(00) 0 0000-0000"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-brown-300/30"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Escolha como receber</label>
                      <div className="flex gap-3">
                        {[
                          { id: 'retirada', label: 'Retirada', icon: Home },
                          { id: 'delivery', label: 'Delivery', icon: Truck }
                        ].map(type => {
                          const Icon = type.icon;
                          const active = formData.deliveryType === type.id;
                          return (
                            <button
                              key={type.id}
                              onClick={() => setFormData({ ...formData, deliveryType: type.id as any })}
                              className={`flex-1 p-5 rounded-2xl text-[11px] font-black transition-all flex flex-col items-center gap-2 border-2 ${
                                active
                                  ? 'bg-pink-400 text-white border-pink-400 shadow-soft'
                                  : 'bg-pink-50/50 text-brown-300 border-transparent hover:bg-pink-100 hover:border-pink-50'
                              }`}
                            >
                              <Icon size={20} />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-pink-50/50 rounded-2xl border-2 border-transparent hover:border-pink-200 transition-all">
                        <input 
                          type="checkbox" 
                          checked={formData.isScheduled}
                          onChange={e => setFormData({...formData, isScheduled: e.target.checked})}
                          className="w-5 h-5 accent-pink-500 rounded-lg pointer-events-none"
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-black uppercase text-pink-700 leading-tight">Agendar Encomenda? ✨</p>
                          <p className="text-[9px] font-bold text-brown-300">Pague 50% agora e o restante na entrega ou retirada.</p>
                        </div>
                      </label>

                      <AnimatePresence>
                        {formData.isScheduled && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Data</label>
                                <input 
                                  type="date"
                                  value={formData.scheduledDate}
                                  onChange={e => setFormData({...formData, scheduledDate: e.target.value})}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full bg-white border-2 border-pink-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-pink-400"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Horário</label>
                                <input 
                                  type="time"
                                  value={formData.scheduledTime}
                                  onChange={e => setFormData({...formData, scheduledTime: e.target.value})}
                                  className="w-full bg-white border-2 border-pink-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-pink-400"
                                />
                              </div>
                            </div>
                            <div className="bg-pink-100/30 p-4 rounded-2xl border border-pink-200 text-[10px] text-pink-800 font-bold flex items-start gap-2 italic">
                              <Truck size={14} className="mt-0.5 shrink-0" />
                              <span>Para encomendas agendadas, o frete poderá ser combinado posteriormente via WhatsApp.</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence mode="wait">
                      {formData.deliveryType === 'delivery' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">
                            Endereço de Entrega *
                          </label>
                          <textarea
                            placeholder="Rua, Número, Bairro, e Referências..."
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                            className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-brown-300/30 resize-none"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Observações Especiais (Opcional)</label>
                      <textarea
                        placeholder="Ex: Tirar cebola, recado para presente..."
                        value={formData.obs}
                        onChange={e => setFormData({ ...formData, obs: e.target.value })}
                        rows={2}
                        className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all placeholder:text-brown-300/30 resize-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-md rounded-[32px] p-7 border border-pink-100 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pink-700 mb-5 flex items-center gap-2">
                      <ClipboardList size={20} className="text-pink-400" /> Resumo do Carrinho
                    </h3>
                    <div className="space-y-3 mb-5 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs font-bold text-brown-500">
                          <span className="flex items-center gap-2">
                            {item.image ? (
                              <img src={item.image} className="w-6 h-6 rounded-lg object-cover" alt={item.name} referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-lg">{item.emoji}</span>
                            )}
                            <span className="opacity-80 font-black">{item.qty}x</span> {item.name}
                          </span>
                          <span className="font-outfit text-pink-700">R$ {(item.price * item.qty).toFixed(2).replace('.', ',')}</span>
                        </div>
                      ))}
                      {formData.deliveryType === 'delivery' && (
                        <div className="flex justify-between items-center text-xs font-bold text-brown-300 italic">
                          <span>🛵 Taxa de Entrega</span>
                          <span>{formData.isScheduled ? 'A combinar' : `R$ ${settings.deliveryFee.toFixed(2).replace('.', ',')}`}</span>
                        </div>
                      )}
                      {usePoints && settings.loyaltyEnabled && userProfile && userProfile.points > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-pink-700 animate-pulse">
                          <span>🎁 Desconto Fidelidade</span>
                          <span>-R$ {Math.min(cartTotal, userProfile.points * settings.realPerPoint).toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                      {formData.paymentMethod === 'card_credit' && formData.installments > 1 && (
                        <div className="flex justify-between items-center text-xs font-bold text-brown-400 italic">
                          <span>💳 Taxa de Parcelamento ({formData.installments}x)</span>
                          <span>+R$ {((cartTotal + (formData.deliveryType === 'delivery' && !formData.isScheduled ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) * (
                            formData.installments === 2 ? 0.03 : 
                            formData.installments === 3 ? 0.05 : 
                            formData.installments === 4 ? 0.07 : 
                            formData.installments === 5 ? 0.09 : 
                            formData.installments === 6 ? 0.11 : 0
                          )).toFixed(2).replace('.', ',')}</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-pink-100 pt-5 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brown-300">
                        <span>Total do Pedido</span>
                        <span>R$ {((cartTotal + (formData.deliveryType === 'delivery' && !formData.isScheduled ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) * (
                          formData.paymentMethod === 'card_credit' && formData.installments > 1 ? (
                            formData.installments === 2 ? 1.03 : 
                            formData.installments === 3 ? 1.05 : 
                            formData.installments === 4 ? 1.07 : 
                            formData.installments === 5 ? 1.09 : 
                            formData.installments === 6 ? 1.11 : 1
                          ) : 1
                        )).toFixed(2).replace('.', ',')}</span>
                      </div>
                      
                      {formData.isScheduled ? (
                        <div className="bg-pink-100/50 p-4 rounded-3xl border-2 border-pink-200">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex flex-col">
                              <span className="font-outfit text-pink-700 text-[10px] font-black uppercase tracking-widest">Entrada (50% Agora)</span>
                              <span className="text-[9px] font-bold text-pink-600">O restante será pago na entrega</span>
                            </div>
                            <span className="font-outfit font-black text-3xl text-pink-700 italic">
                              R$ {(((cartTotal + (formData.deliveryType === 'delivery' && !formData.isScheduled ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) * (
                                formData.paymentMethod === 'card_credit' && formData.installments > 1 ? (
                                  formData.installments === 2 ? 1.03 : 
                                  formData.installments === 3 ? 1.05 : 
                                  formData.installments === 4 ? 1.07 : 
                                  formData.installments === 5 ? 1.09 : 
                                  formData.installments === 6 ? 1.11 : 1
                                ) : 1
                              )) / 2).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-end">
                          <span className="font-outfit text-brown-300 text-[10px] font-black uppercase tracking-widest">Valor Final a Pagar</span>
                          <span className="font-outfit font-black text-3xl text-brown-500 italic">
                            R$ {Math.max(0, 
                              (cartTotal + 
                              (formData.deliveryType === 'delivery' ? settings.deliveryFee : 0) - 
                              (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) * (
                                formData.paymentMethod === 'card_credit' && formData.installments > 1 ? (
                                  formData.installments === 2 ? 1.03 : 
                                  formData.installments === 3 ? 1.05 : 
                                  formData.installments === 4 ? 1.07 : 
                                  formData.installments === 5 ? 1.09 : 
                                  formData.installments === 6 ? 1.11 : 1
                                ) : 1
                              )
                            ).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Forma de Pagamento</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {[
                          { id: 'pix' as const, label: 'Pix (Chave Segura)', icon: QrCode, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: 'Aprovação Instantânea' },
                          { id: 'card_credit' as const, label: 'Cartão de Crédito', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', sub: 'Visa, Mastercard e mais' },
                          { id: 'card_debit' as const, label: 'Cartão de Débito', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50', sub: 'Visa, Mastercard e mais' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setFormData({...formData, paymentMethod: m.id})}
                            className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all text-left ${
                              formData.paymentMethod === m.id 
                                ? 'border-pink-400 bg-white shadow-soft shadow-pink-100/50' 
                                : 'border-pink-50 bg-white hover:border-pink-100'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                              formData.paymentMethod === m.id ? m.bg : 'bg-gray-50 opacity-60'
                            }`}>
                              <m.icon size={22} className={formData.paymentMethod === m.id ? m.color : 'text-brown-300'} />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[11px] font-black tracking-tight ${formData.paymentMethod === m.id ? 'text-pink-700' : 'text-brown-500'}`}>
                                {m.label}
                              </span>
                              <span className="text-[8px] font-bold text-brown-300 w-full opacity-60 uppercase tracking-tighter overflow-hidden whitespace-nowrap">
                                {m.sub}
                              </span>
                            </div>
                            {formData.paymentMethod === m.id && (
                              <div className="ml-auto w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-200">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>

                      {['card_credit', 'card_debit'].includes(formData.paymentMethod) && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-white p-6 rounded-[32px] border border-pink-100 shadow-sm mt-2 space-y-4"
                        >
                          <label className="text-[10px] font-black text-brown-300 uppercase tracking-widest block">Informações do Cartão</label>
                          
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-brown-300 uppercase ml-1">Nome no Cartão</span>
                            <input 
                              type="text"
                              value={formData.cardholderName}
                              onChange={e => setFormData({...formData, cardholderName: e.target.value})}
                              placeholder="Nome Completo"
                              className="w-full bg-pink-50/30 border border-pink-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-pink-400 placeholder:text-brown-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-brown-300 uppercase ml-1">Número do Cartão</span>
                            <div className="p-3.5 bg-pink-50/30 rounded-xl border border-pink-100 min-h-[48px] flex flex-col justify-center">
                               <input 
                                 type="text" 
                                 placeholder="0000 0000 0000 0000"
                                 className="bg-transparent border-none outline-none text-sm font-semibold"
                               />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-brown-300 uppercase ml-1">Validade</span>
                              <div className="p-3.5 bg-pink-50/30 rounded-xl border border-pink-100 min-h-[48px] flex flex-col justify-center">
                                <input 
                                  type="text" 
                                  placeholder="MM/AA"
                                  className="bg-transparent border-none outline-none text-sm font-semibold"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-brown-300 uppercase ml-1">CVV</span>
                              <div className="p-3.5 bg-pink-50/30 rounded-xl border border-pink-100 min-h-[48px] flex flex-col justify-center">
                                <input 
                                  type="text" 
                                  placeholder="000"
                                  className="bg-transparent border-none outline-none text-sm font-semibold"
                                />
                              </div>
                            </div>
                          </div>

                          {formData.paymentMethod === 'card_credit' && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-brown-300 uppercase ml-1">Parcelamento</span>
                              <select 
                                value={formData.installments}
                                onChange={e => setFormData({...formData, installments: parseInt(e.target.value)})}
                                className="w-full bg-pink-50/30 border border-pink-100 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-pink-400"
                              >
                                {INSTALLMENT_OPTIONS.map(opt => {
                                  const currentDeliveryFee = (formData.deliveryType === 'delivery' && !formData.isScheduled) ? settings.deliveryFee : 0;
                                  const potentialDiscount = userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0;
                                  const actualDiscountValue = (usePoints && settings.loyaltyEnabled) ? potentialDiscount : 0;
                                  const totalBeforeFees = cartTotal + currentDeliveryFee - actualDiscountValue;
                                  const baseAmount = formData.isScheduled ? (totalBeforeFees / 2) : totalBeforeFees;
                                  
                                  const feeRate = opt.value === 2 ? 0.03 : 
                                                  opt.value === 3 ? 0.05 : 
                                                  opt.value === 4 ? 0.07 : 
                                                  opt.value === 5 ? 0.09 : 
                                                  opt.value === 6 ? 0.11 : 0;
                                  
                                  const totalWithFee = baseAmount * (1 + feeRate);
                                  const installmentValue = totalWithFee / opt.value;
                                  
                                  return (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.value}x de R$ {installmentValue.toFixed(2).replace('.', ',')}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          <p className="text-[9px] text-brown-300 mt-2 text-center uppercase font-bold tracking-widest opacity-60">
                            🔒 Processado de forma segura pelo PagBank.
                          </p>
                        </motion.div>
                      )}

                      {formData.paymentMethod === 'pix' && (
                        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 text-[10px] text-yellow-700 font-bold flex items-start gap-2">
                          <Sparkles size={14} className="mt-0.5 shrink-0" />
                          <span>O seu QR Code e código copia e cola para o PIX serão gerados na próxima tela. O valor será de R$ {
                            formData.isScheduled 
                              ? ((cartTotal + (formData.deliveryType === 'delivery' && !formData.isScheduled ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) / 2).toFixed(2).replace('.', ',')
                              : (cartTotal + (formData.deliveryType === 'delivery' ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)).toFixed(2).replace('.', ',')
                          }</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSendOrder}
                      disabled={isProcessingPayment}
                      className="w-full bg-gradient-to-br from-pink-400 to-pink-600 text-white py-6 rounded-[32px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:translate-y-[-4px] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessingPayment ? 'Iniciando...' : 'Pagar e Finalizar ✨'}
                    </button>
                </div>
              )}
            </motion.div>
          )}

          {currentPage === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-[360px] mx-auto"
            >
              <div className="bg-white rounded-[40px] p-8 shadow-soft border border-pink-100 text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-3xl flex items-center justify-center text-pink-700 mx-auto mb-6">
                  {loginMode === 'login' ? <Key size={28} /> : <User size={28} />}
                </div>
                <h2 className="font-outfit text-2xl font-extrabold text-brown-500 tracking-tight mb-2">
                  {loginMode === 'login' ? 'Bem-vindo de volta!' : loginMode === 'register' ? 'Criar sua conta' : 'Esqueci minha senha'}
                </h2>
                <p className="text-xs text-brown-300 font-semibold mb-8 leading-relaxed">
                  {loginMode === 'login' 
                    ? 'Acesse seus pedidos e pontos de fidelidade.' 
                    : loginMode === 'register'
                    ? 'Faça seu cadastro para ganhar pontos em todas as compras!'
                    : 'Informe seu e-mail para receber um link de redefinição.'}
                </p>

                <div className="space-y-4 text-left">
                  {loginMode === 'register' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Seu Nome</label>
                        <input
                          type="text"
                          placeholder="Ex: Nome Sobrenome"
                          value={authForm.name}
                          onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                          className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">WhatsApp</label>
                        <input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={authForm.phone}
                          onChange={e => setAuthForm({ ...authForm, phone: e.target.value })}
                          className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none transition-all"
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">E-mail</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={authForm.email}
                      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none transition-all"
                    />
                  </div>

                  {loginMode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Senha (Letras e Números)</label>
                        {loginMode === 'login' && (
                          <button 
                            onClick={() => setLoginMode('forgot')}
                            className="text-[9px] font-black uppercase tracking-widest text-pink-700 hover:text-pink-900"
                          >
                            Esqueci a senha
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={authForm.password}
                        onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                        className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none transition-all"
                      />
                    </div>
                  )}

                  {loginMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brown-300 ml-1">Confirmar Senha</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={authForm.confirmPassword}
                        onChange={e => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                        className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-5 py-3.5 text-sm font-semibold outline-none transition-all"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleAuth}
                    disabled={isSubmitting}
                    className="w-full bg-pink-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-soft hover:bg-pink-700 disabled:bg-pink-200 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>{loginMode === 'login' ? 'Entrar Agora' : loginMode === 'register' ? 'Finalizar Cadastro' : 'Enviar Link Reset'} ✨</>
                    )}
                  </button>

                  <button
                    onClick={() => setLoginMode(loginMode === 'login' ? 'register' : 'login')}
                    className="w-full text-pink-700 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center"
                  >
                    {loginMode === 'login' ? 'Ainda não tem conta? Clique aqui' : loginMode === 'register' ? 'Já tem conta? Clique aqui para entrar' : 'Voltar para o Login'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentPage === 'perfil' && userProfile && (
            <motion.div
              key="perfil"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-[40px] p-8 shadow-soft border border-pink-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="w-16 h-16 bg-pink-100 rounded-3xl flex items-center justify-center text-pink-700">
                      <User size={32} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-outfit text-xl font-extrabold text-brown-500 tracking-tight">{userProfile.name}</h2>
                    <p className="text-[10px] text-pink-400 font-extrabold uppercase tracking-widest">Cliente Doce&Magia ✨</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-pink-50/30 p-4 rounded-3xl border border-pink-50 text-center">
                    <BadgeDollarSign size={20} className="mx-auto mb-1 text-pink-400" />
                    <div className="font-outfit font-black text-2xl text-pink-700">{userProfile.points}</div>
                    <div className="text-[9px] font-black uppercase text-brown-300 tracking-wider">Pontos Acumulados</div>
                  </div>
                  <div className="bg-pink-50/30 p-4 rounded-3xl border border-pink-50 text-center">
                    <ClipboardList size={20} className="mx-auto mb-1 text-pink-400" />
                    <div className="font-outfit font-black text-2xl text-pink-700">{orders.length}</div>
                    <div className="text-[9px] font-black uppercase text-brown-300 tracking-wider">Pedidos Realizados</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brown-300 ml-1">Seus Últimos Pedidos</h3>
                  <div className="space-y-3 max-h-[240px] overflow-y-auto no-scrollbar pr-1">
                    {orders.length === 0 ? (
                      <div className="text-center py-8 bg-pink-50/30 rounded-3xl border border-dashed border-pink-100">
                        <p className="text-xs text-brown-300 font-bold italic opacity-60">Nenhum pedido ainda 🍪</p>
                      </div>
                    ) : (
                      orders.map(order => (
                        <div key={order.id} className="bg-white border border-pink-50 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-pink-400 uppercase tracking-tighter mb-1">
                              Pedido #{order.id.toString().slice(-5)} · {order.date}
                            </div>
                            <div className="text-xs font-bold text-brown-500 truncate">
                              {order.items.map(it => it.name).join(', ')}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {order.status === 'completed' ? 'Finalizado' : 'Em Andamento'}
                            </div>
                            {order.status === 'completed' && (
                              <button
                                onClick={() => handleReorder(order)}
                                className="text-[9px] font-black uppercase text-pink-500 bg-pink-50 hover:bg-pink-100 px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                              >
                                <TrendingUp size={10} /> Repetir
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-pink-50">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut size={16} /> Encerrar Sessão
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentPage === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              {!isAdmin ? (
                <div className="bg-white rounded-[40px] p-10 pt-16 shadow-soft border border-pink-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 text-pink-50 opacity-20 transform rotate-12 select-none pointer-events-none">
                    <Settings size={180} />
                  </div>
                  
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center text-pink-700 mx-auto mb-6 shadow-sm">
                      <Lock size={36} />
                    </div>
                    <h2 className="font-outfit text-3xl font-extrabold text-brown-500 tracking-tight mb-4 text-balance">Acesso Gestor</h2>
                    <p className="text-sm text-brown-300 font-semibold mb-10 leading-relaxed">Área restrita Doce&Magia. <br/>Insira sua chave mestra.</p>
                    
                    <div className="space-y-6 text-left max-w-[280px] mx-auto">
                      <div className="space-y-2">
                        <label className="text-[10px] font-outfit font-bold uppercase tracking-widest text-brown-300 ml-1">Sua Senha de Acesso</label>
                        <input
                          type="password"
                          value={adminPass}
                          onChange={e => setAdminPass(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (adminPass === '#Ju290106' ? setIsAdmin(true) : showToast('❌ Senha incorreta!'))}
                          placeholder="••••••••"
                          className="w-full bg-pink-50/50 border-2 border-transparent focus:border-pink-400 rounded-2xl px-6 py-5 text-center text-lg font-black tracking-[0.5em] outline-none transition-all placeholder:text-brown-300/30 placeholder:tracking-normal"
                        />
                      </div>
                      
                      <button
                        onClick={() => adminPass === '#Ju290106' ? setIsAdmin(true) : showToast('❌ Senha incorreta!')}
                        className="w-full bg-pink-400 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-soft hover:bg-pink-700 transition-all flex items-center justify-center gap-2"
                      >
                        Desbloquear Painel <Key size={14} />
                      </button>

                      <button
                        onClick={() => window.location.href = '/'}
                        className="w-full text-brown-300 py-4 rounded-xl border border-transparent hover:border-pink-100 hover:bg-pink-100/30 font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        ← Voltar para o Cardápio
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <header className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-soft border border-pink-100">
                    <div>
                      <h2 className="font-outfit font-extrabold text-brown-500 tracking-tight flex items-center gap-2">
                        <div className="w-9 h-9 bg-pink-100/50 rounded-xl flex items-center justify-center text-pink-700">
                          <LayoutDashboard size={18} />
                        </div>
                        Gestão Doce&Magia
                      </h2>
                      <p className="text-[9px] text-pink-700 font-black uppercase tracking-widest mt-1 ml-11">Status: Conectado</p>
                    </div>
                    <button onClick={() => {
                        setIsAdmin(false);
                        window.location.href = '/';
                      }} className="bg-pink-50 text-pink-700 p-3 rounded-2xl hover:bg-pink-700 hover:text-white transition-all shadow-sm">
                      <LogOut size={20} />
                    </button>
                  </header>

                  <div className="flex bg-pink-100/30 p-1.5 rounded-3xl shadow-sm border border-pink-100/50 overflow-x-auto no-scrollbar scroll-smooth">
                    {[
                      { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
                      { id: 'estoque', label: 'Estoque', icon: Package },
                      { id: 'financeiro', label: 'Finanças', icon: BadgeDollarSign },
                      { id: 'config', label: 'Config', icon: Settings }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const active = adminTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setAdminTab(tab.id as any);
                            if (tab.id === 'pedidos') {
                              setOrders(prev => prev.map(o => ({ ...o, isNew: false })));
                            }
                          }}
                          className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black transition-all flex flex-col items-center gap-2 min-w-[100px] border border-transparent ${
                            active 
                              ? 'bg-white text-pink-400 shadow-soft border-pink-100' 
                              : 'text-brown-300 hover:text-pink-400'
                          }`}
                        >
                          <Icon size={20} className={active ? 'text-pink-400' : 'opacity-40'} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {adminTab === 'pedidos' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-3 rounded-xl border border-pink-100 text-center shadow-sm">
                          <ClipboardList size={20} className="mx-auto mb-1 text-pink-400" />
                          <div className="font-pacifico text-xl text-pink-700">{orders.filter(o => o.date === new Date().toLocaleDateString('pt-BR')).length}</div>
                          <div className="text-[9px] font-bold uppercase text-brown-300 tracking-wider">Pedidos hoje</div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-pink-100 text-center shadow-sm">
                          <Cookie size={20} className="mx-auto mb-1 text-pink-400" />
                          <div className="font-pacifico text-xl text-pink-700">{orders.filter(o => o.status === 'pending').length}</div>
                          <div className="text-[9px] font-bold uppercase text-brown-300 tracking-wider">Aguardando</div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {orders.length === 0 ? (
                          <div className="text-center py-10 opacity-60 font-bold text-sm">Nenhum pedido ainda 🍪</div>
                        ) : (
                          orders.map((order, idx) => (
                            <div key={order.id} className={`bg-white rounded-3xl border border-pink-50 shadow-soft transition-all duration-300 relative overflow-hidden group ${expandedOrderId === order.id ? 'ring-2 ring-pink-300' : ''}`}>
                              <div 
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="p-5 cursor-pointer hover:bg-pink-50/30 transition-colors"
                              >
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-brown-300 uppercase tracking-tighter">
                                      Pedido #{orders.length - idx} · {order.date}
                                      {order.isNew && <span className="ml-2 text-red-500 animate-pulse">● NOVO</span>}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                    order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'shipping' ? 'bg-purple-100 text-purple-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {order.status === 'pending' ? '⏳ Pendente' : 
                                     order.status === 'preparing' ? '🧑‍🍳 Produção' :
                                     order.status === 'shipping' ? '🛵 Na Rota' :
                                     order.status === 'completed' ? '✅ Feito' : '❌ Cancelado'}
                                  </span>
                                </div>
                                <div className="text-xs font-bold flex items-center gap-1 mb-1 text-brown-500">
                                  <User size={12} className="text-pink-400" /> {order.client}
                                </div>
                                
                                <div className="text-[11px] text-brown-500 mb-2 border-l-2 border-pink-100 pl-2">
                                  {order.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                                </div>

                                <AnimatePresence>
                                  {expandedOrderId === order.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pt-2 border-t border-dashed border-pink-100 mt-2 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase text-pink-400 tracking-widest">Contato</p>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brown-500">
                                              <Phone size={12} className="text-pink-300" />
                                              {order.phone}
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase text-pink-400 tracking-widest">Entrega</p>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brown-500">
                                              {order.delivery === 'delivery' ? (
                                                <><Truck size={12} className="text-pink-300" /> Delivery</>
                                              ) : (
                                                <><Home size={12} className="text-pink-300" /> Retirada</>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {order.delivery === 'delivery' && (
                                          <div className="bg-pink-50/50 p-2.5 rounded-xl border border-pink-50">
                                            <p className="text-[8px] font-black uppercase text-pink-400 tracking-widest mb-1">Endereço</p>
                                            <p className="text-[10px] font-bold text-brown-500 leading-relaxed">
                                              <MapPin size={10} className="inline mr-1 text-pink-400" />
                                              {order.address}
                                            </p>
                                          </div>
                                        )}

                                        {order.isScheduled && (
                                          <div className="bg-pink-100/40 p-2.5 rounded-xl border border-pink-200">
                                            <p className="text-[8px] font-black uppercase text-pink-700 tracking-widest mb-1">Agenda</p>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-pink-700 uppercase">
                                              <Clock size={12} /> {order.scheduledDate} às {order.scheduledTime}
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase mt-1">
                                              <span className="text-green-600">✅ Pago: R$ {order.paidAmount?.toFixed(2)}</span>
                                              <span className="text-pink-800">💰 Falta: R$ {order.remainingAmount?.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        )}

                                        {order.obs && (
                                          <div className="bg-yellow-50/50 p-2.5 rounded-xl border border-yellow-100">
                                            <p className="text-[8px] font-black uppercase text-yellow-600 tracking-widest mb-1">Observações</p>
                                            <p className="text-[10px] font-bold text-brown-400">"{order.obs}"</p>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="px-5 pb-5">
                                <div className="flex justify-between items-center border-t border-pink-50 pt-2">
                                  <div className="flex flex-col">
                                    <span className="font-pacifico text-pink-700">
                                      R$ {((order.paidAmount !== undefined && order.remainingAmount !== undefined) 
                                          ? (order.paidAmount + order.remainingAmount) 
                                          : (order.total + (order.delivery === 'delivery' ? settings.deliveryFee : 0) - (order.discountValue || 0))
                                        ).toFixed(2).replace('.', ',')}
                                    </span>
                                    {order.discountValue && order.discountValue > 0 && (
                                      <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">🎁 Desconto Fidelidade</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                  {order.status === 'pending' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(order, 'preparing', 2)} 
                                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black"
                                    >
                                      PRODUZIR
                                    </button>
                                  )}
                                  {order.status === 'preparing' && (
                                    <>
                                      {order.delivery === 'retirada' ? (
                                        <button 
                                          onClick={() => handleUpdateStatus(order, 'completed', 4)} 
                                          className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all text-[9px] font-black"
                                        >
                                          AVISAR PRONTO
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => handleUpdateStatus(order, 'shipping', 3)} 
                                          className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all text-[9px] font-black"
                                        >
                                          NA ROTA
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {order.status === 'shipping' && (
                                    <button 
                                      onClick={() => handleUpdateStatus(order, 'completed')} 
                                      className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all text-[9px] font-black"
                                    >
                                      ENTREGUE
                                    </button>
                                  )}
                                  {order.status !== 'completed' && order.status !== 'canceled' && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateStatus(order, 'completed')} 
                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all"
                                        title="Concluir"
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateStatus(order, 'canceled', 5)} 
                                        className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all text-[10px] font-black"
                                        title="Cancelar"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => setViewingHistory(order.phone)} 
                                    className="p-1.5 bg-pink-50 text-pink-500 rounded-lg hover:bg-pink-500 hover:text-white transition-all"
                                    title="Ver Histórico"
                                  >
                                    <History size={14} />
                                  </button>
                                  <button onClick={() => setOrderToDelete(order.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all" title="Excluir">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )))
                        }
                      </div>
                    </motion.div>
                  )}

                  {adminTab === 'estoque' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      {/* Add New Product Section */}
                      <div className="bg-pink-100/30 p-4 rounded-xl border border-pink-100 shadow-sm">
                        <h3 className="text-xs font-black uppercase text-pink-700 mb-3 flex items-center gap-1">
                          <Cookie size={14} /> Adicionar Novo Sabor
                        </h3>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Emoji"
                            value={newProduct.emoji}
                            onChange={e => setNewProduct({...newProduct, emoji: e.target.value})}
                            className="bg-white border border-pink-100 rounded-lg p-2 text-center text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Nome"
                            value={newProduct.name}
                            onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            className="bg-white border border-pink-100 rounded-lg p-2 text-sm col-span-3"
                          />
                        </div>
                        <div className="mb-2">
                           <textarea
                            placeholder="Descrição do Cookie"
                            value={newProduct.desc}
                            onChange={e => setNewProduct({...newProduct, desc: e.target.value})}
                            className="w-full bg-white border border-pink-100 rounded-lg p-2 text-xs h-12 outline-none resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <select
                            value={newProduct.category}
                            onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                            className="bg-white border border-pink-100 rounded-lg p-2 text-xs outline-none"
                          >
                            {CATEGORIES.filter(c => c !== 'Tudo').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input
                            type="number"
                            placeholder="Preço R$"
                            value={newProduct.price}
                            onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                            className="bg-white border border-pink-100 rounded-lg p-2 text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Quat."
                            value={newProduct.stock}
                            onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                            className="bg-white border border-pink-100 rounded-lg p-2 text-xs"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const name = newProduct.name.trim();
                            const priceStr = newProduct.price.toString().trim();
                            const stockStr = newProduct.stock.toString().trim();
                            const category = newProduct.category;

                            if (!name) {
                              showToast('⚠️ O nome do produto é obrigatório!');
                              return;
                            }
                            
                            if (!category || category === 'Tudo') {
                              showToast('⚠️ Selecione uma categoria válida!');
                              return;
                            }

                            const price = parseFloat(priceStr);
                            if (priceStr === '' || isNaN(price) || price < 0) {
                              showToast('⚠️ O preço deve ser um número válido!');
                              return;
                            }
                            
                            const productStock = parseInt(stockStr);
                            if (stockStr === '' || isNaN(productStock) || productStock < 0) {
                              showToast('⚠️ O estoque deve ser um número válido!');
                              return;
                            }

                            const product = {
                              emoji: newProduct.emoji || '🍪',
                              name,
                              desc: newProduct.desc || 'Sabor personalizado',
                              price,
                              isNew: true,
                              stock: productStock,
                              category,
                              image: newProduct.image
                            };
                            addDoc(collection(db, 'products'), product);
                            setNewProduct({ emoji: '🍪', name: '', desc: '', category: 'Clássicos', price: '', stock: '', image: '' });
                            showToast('✅ Sabor adicionado com sucesso!');
                          }}
                          className="w-full bg-pink-400 text-white py-2 rounded-lg text-xs font-black shadow-sm"
                        >
                          Adicionar Sabor ✨
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-brown-300 ml-1">Imagem (Opcional)</label>
                          <label className="flex items-center justify-center gap-2 w-full h-10 bg-pink-50 border-2 border-dashed border-pink-200 rounded-xl cursor-pointer hover:border-pink-400 transition-all text-[10px] font-bold text-pink-700">
                            <Package size={14} />
                            {newProduct.image ? 'Trocar Foto' : 'Subir Foto'}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, true)} />
                          </label>
                        </div>
                        {newProduct.image && (
                          <div className="relative group">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-pink-100 shadow-sm">
                              <img src={newProduct.image} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                            </div>
                            <button 
                              onClick={() => setNewProduct({...newProduct, image: ''})}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {products.map(p => {
                          const s = stock[p.id] !== undefined ? stock[p.id] : p.stock;
                          const pct = Math.min(100, (s / 30) * 100);
                          return (
                            <div 
                              key={p.id} 
                              className={`bg-white rounded-xl p-3 shadow-sm border flex items-center gap-3 relative transition-all duration-300 ${
                                s <= 5 ? 'border-red-400 bg-red-50/10' : 'border-pink-100'
                              }`}
                            >
                              {s <= 5 && (
                                <div className="absolute -top-1.5 -left-1.5 bg-red-500 text-white p-1 rounded-full shadow-lg border-2 border-white z-10 animate-bounce">
                                  <AlertTriangle size={12} />
                                </div>
                              )}
                              <label className="relative cursor-pointer group">
                                <div className="w-12 h-12 bg-pink-50 rounded-xl overflow-hidden flex items-center justify-center border border-pink-100">
                                  {p.image ? (
                                    <img src={p.image} className="w-full h-full object-cover" alt={p.name} referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-2xl">{p.emoji}</span>
                                  )}
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                    <Package size={14} className="text-white" />
                                  </div>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, false, p.id)} />
                              </label>
                              <div className="flex-1">
                                <div className="flex gap-2 mb-1">
                                  <input 
                                    type="text"
                                    value={p.name}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val.trim()) {
                                        updateDoc(doc(db, 'products', String(p.id)), { name: val });
                                      }
                                    }}
                                    placeholder="Nome"
                                    className={`flex-1 font-bold text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-pink-200 rounded min-w-0 ${
                                      s <= 5 ? 'text-red-900' : 'text-brown-500'
                                    } ${!p.name.trim() ? 'bg-red-50 ring-1 ring-red-500' : ''}`}
                                  />
                                  <select
                                    value={p.category}
                                    onChange={e => updateDoc(doc(db, 'products', String(p.id)), { category: e.target.value })}
                                    className="text-[9px] font-black uppercase text-pink-400 bg-pink-50/50 rounded-lg px-1.5 py-0.5 outline-none border border-transparent focus:border-pink-200"
                                  >
                                    {CATEGORIES.filter(c => c !== 'Tudo').map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <textarea
                                  value={p.desc}
                                  onChange={e => updateDoc(doc(db, 'products', String(p.id)), { desc: e.target.value })}
                                  className={`w-full border-none rounded text-[10px] font-medium h-8 resize-none outline-none focus:ring-1 focus:ring-pink-200 ${
                                    s <= 5 ? 'bg-red-100/30 text-red-700' : 'bg-pink-50/50 text-brown-400'
                                  }`}
                                  placeholder="Descrição..."
                                />
                                <div className={`text-[11px] font-black mt-0.5 ${s <= 5 ? 'text-red-500' : s <= 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {s <= 5 && '⚠️ '} {s} unidades
                                </div>
                                <div className="h-1.5 bg-pink-100 rounded-full mt-1.5 overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-pink-400 to-pink-700 transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[7px] font-black text-pink-300 uppercase">Preço</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={p.price}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      const val = parseFloat(raw);
                                      if (raw !== '' && !isNaN(val) && val >= 0) {
                                        updateDoc(doc(db, 'products', String(p.id)), { price: val })
                                          .catch(err => console.error("Erro ao atualizar preço:", err));
                                      }
                                    }}
                                    className={`w-12 border rounded-lg text-center font-bold text-[9px] p-1 outline-none transition-all ${
                                      p.price === undefined || p.price < 0 ? 'border-red-500 bg-red-50' : 'border-pink-50 focus:border-pink-400'
                                    }`}
                                  />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[7px] font-black text-pink-300 uppercase">Estoque</span>
                                  <input
                                    type="number"
                                    value={s}
                                    onChange={e => {
                                      const raw = e.target.value;
                                      const val = parseInt(raw);
                                      if (raw !== '' && !isNaN(val) && val >= 0) {
                                        updateDoc(doc(db, 'products', String(p.id)), { stock: val })
                                          .catch(err => console.error("Erro ao atualizar estoque:", err));
                                      }
                                    }}
                                    className={`w-10 border rounded-lg text-center font-bold text-[9px] p-1 outline-none transition-all ${
                                      s === undefined || s < 0 ? 'border-red-500 bg-red-50' : 'border-pink-50 focus:border-pink-400'
                                    }`}
                                  />
                                </div>
                                <button
                                  onClick={() => setProductToDelete(p.id)}
                                  className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all self-end mb-1"
                                  title="Excluir Produto"
                                >
                                  <Trash2 size={14} />
                                </button>
                                {p.image && (
                                  <button
                                    onClick={() => updateDoc(doc(db, 'products', String(p.id)), { image: "" })}
                                    className="p-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-600 hover:text-white transition-all"
                                    title="Remover Imagem"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {adminTab === 'financeiro' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: DollarSign, label: 'Hoje', value: `R$ ${orders.filter(o => o.date === new Date().toLocaleDateString('pt-BR') && o.status === 'completed').reduce((s, o) => s + o.total + (o.delivery === 'delivery' ? settings.deliveryFee : 0), 0).toFixed(0)}`, color: 'text-green-600' },
                          { icon: TrendingUp, label: 'Geral', value: `R$ ${orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total + (o.delivery === 'delivery' ? settings.deliveryFee : 0), 0).toFixed(0)}`, color: 'text-pink-700' },
                          { icon: ClipboardList, label: 'Pedidos', value: orders.filter(o => o.status === 'completed').length, color: 'text-blue-600' },
                          { icon: Package, label: 'Cookies', value: orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0), color: 'text-brown-500' }
                        ].map((item, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border border-pink-100 text-center shadow-sm">
                            <item.icon size={24} className={`mx-auto mb-1 ${item.color} opacity-80`} />
                            <div className={`font-outfit font-bold text-2xl ${item.color}`}>{item.value}</div>
                            <div className="text-[10px] font-outfit font-bold uppercase text-brown-300 tracking-wider">{item.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black uppercase tracking-widest text-brown-500 flex items-center gap-2">
                            <TrendingUp size={16} className="text-pink-400" /> Desempenho (Últimos 7 dias)
                          </h3>
                        </div>
                        <div className="h-48 w-full -ml-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...Array(7)].map((_, i) => {
                              const d = new Date();
                              d.setDate(d.getDate() - (6 - i));
                              const dateStr = d.toLocaleDateString('pt-BR');
                              const dailyTotal = orders
                                .filter(o => o.date === dateStr && o.status === 'completed')
                                .reduce((s, o) => s + o.total + (o.delivery === 'delivery' ? settings.deliveryFee : 0), 0);
                              return { name: dateStr.split('/')[0], total: dailyTotal };
                            })}>
                              <XAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#8B5E3C' }} />
                              <Tooltip cursor={{ fill: '#FFF5F7' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(244, 114, 182, 0.1)', fontWeight: 800 }} />
                              <Bar dataKey="total" radius={[8, 8, 8, 8]}>
                                {[...Array(7)].map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 6 ? '#f472b6' : '#fbcfe8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {adminTab === 'config' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
                      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-brown-500 border-b border-pink-50 pb-3 flex items-center gap-2">
                          <Phone size={16} className="text-pink-400" /> Contato WhatsApp
                        </h3>
                        <div className="space-y-2">
                          <label className="text-[10px] font-outfit font-bold uppercase tracking-widest text-brown-300 ml-1">Número Destinatário (WhatsApp)</label>
                          <input
                            type="text"
                            value={settings.whatsappNumber}
                            onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
                            className="w-full bg-pink-50/20 border-2 border-pink-50 focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all"
                            placeholder="55919..."
                          />
                          <p className="text-[9px] text-brown-300/60 mt-1 ml-1 leading-tight">Inclua o 55 + DDD. Este número receberá as mensagens dos novos pedidos.</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-brown-500 border-b border-pink-50 pb-3 flex items-center gap-2">
                          <Truck size={16} className="text-pink-400" /> Taxa de Entrega
                        </h3>
                        <div className="space-y-2">
                          <label className="text-[10px] font-outfit font-bold uppercase tracking-widest text-brown-300 ml-1">Valor do Frete (R$)</label>
                          <input
                            type="number"
                            value={settings.deliveryFee}
                            onChange={e => setSettings({ ...settings, deliveryFee: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-pink-50/20 border-2 border-pink-50 focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all"
                          />
                          <p className="text-[9px] text-brown-300/60 mt-1 ml-1 leading-tight">Este valor será somado ao total quando o cliente escolher 'Delivery'.</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-brown-500 border-b border-pink-50 pb-3 flex items-center gap-2">
                          <ClipboardList size={16} className="text-pink-400" /> Templates de Mensagens (WhatsApp)
                        </h3>
                        
                        <div className="space-y-6">
                          {[
                            { key: 'messageTemplate1', label: '1. Novo Pedido (Confirmação)', theme: 'text-pink-700', bg: 'bg-pink-50/50' },
                            { key: 'messageTemplate2', label: '2. Início de Produção', theme: 'text-blue-700', bg: 'bg-blue-50/50' },
                            { key: 'messageTemplate3', label: '3. Pedido Enviado (Rota)', theme: 'text-purple-700', bg: 'bg-purple-50/50' },
                            { key: 'messageTemplate4', label: '4. Pronto para Retirada', theme: 'text-green-700', bg: 'bg-green-50/50' },
                            { key: 'messageTemplate5', label: '5. Pedido Cancelado', theme: 'text-red-700', bg: 'bg-red-50/50' }
                          ].map((tmpl) => (
                            <div key={tmpl.key} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className={`text-[10px] font-outfit font-black uppercase tracking-widest ${tmpl.theme} ml-1`}>
                                  {tmpl.label}
                                </label>
                              </div>
                              <textarea
                                value={(settings as any)[tmpl.key]}
                                onChange={e => setSettings({ ...settings, [tmpl.key]: e.target.value })}
                                rows={4}
                                className="w-full bg-pink-50/20 border-2 border-pink-50 focus:border-pink-400 rounded-2xl px-5 py-4 text-xs font-semibold outline-none transition-all resize-none shadow-inner"
                                placeholder="Digite sua mensagem aqui..."
                              />
                              <div className="flex flex-wrap gap-1.5 px-1">
                                {[
                                  { tag: '{orderNum}', label: 'Nº Pedido' },
                                  { tag: '{client}', label: 'Cliente' },
                                  { tag: '{total}', label: 'Total' },
                                  { tag: '{itemsText}', label: 'Lista Itens' },
                                  { tag: '{detailedItems}', label: 'Itens Detal.' },
                                  { tag: '{deliveryInfo}', label: 'Info Entrega' },
                                  { tag: '{address}', label: 'Endereço' }
                                ].map(v => (
                                  <button
                                    key={v.tag}
                                    onClick={() => {
                                      const currentVal = (settings as any)[tmpl.key];
                                      setSettings({ ...settings, [tmpl.key]: currentVal + v.tag });
                                    }}
                                    className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-[8px] font-black text-brown-300 rounded-lg border border-pink-100 transition-colors uppercase tracking-wider"
                                  >
                                    + {v.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100">
                          <h4 className="text-[9px] font-black uppercase text-yellow-700 mb-1 flex items-center gap-1.5">
                            <Sparkles size={12} /> Dica de Uso:
                          </h4>
                          <p className="text-[8px] font-bold text-brown-300 leading-relaxed">
                            Use os botões acima para inserir variáveis no texto. Elas serão substituídas automaticamente pelos dados reais do pedido antes do envio.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-brown-500 border-b border-pink-50 pb-3 flex items-center gap-2">
                          <BadgeDollarSign size={16} className="text-pink-400" /> Programa de Fidelidade
                        </h3>
                        <div className="flex items-center justify-between bg-pink-50/20 p-4 rounded-2xl">
                          <div>
                            <p className="text-xs font-bold text-brown-500">Ativar Programa</p>
                            <p className="text-[9px] text-brown-300">Clientes ganham pontos em cada compra.</p>
                          </div>
                          <button
                            onClick={() => setSettings({ ...settings, loyaltyEnabled: !settings.loyaltyEnabled })}
                            className={`w-12 h-6 rounded-full transition-all relative ${settings.loyaltyEnabled ? 'bg-pink-400' : 'bg-brown-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.loyaltyEnabled ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        
                        {settings.loyaltyEnabled && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[10px] font-outfit font-bold uppercase tracking-widest text-brown-300 ml-1">Pts por R$ 1,00</label>
                              <input
                                type="number"
                                value={settings.pointsPerReal}
                                onChange={e => setSettings({ ...settings, pointsPerReal: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-pink-50/20 border-2 border-pink-50 focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-outfit font-bold uppercase tracking-widest text-brown-300 ml-1">Valor do Ponto (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={settings.realPerPoint}
                                onChange={e => setSettings({ ...settings, realPerPoint: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-pink-50/20 border-2 border-pink-50 focus:border-pink-400 rounded-2xl px-5 py-4 text-sm font-semibold outline-none transition-all"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await setDoc(doc(db, 'settings', 'main'), settings);
                            localStorage.setItem('dm_settings', JSON.stringify(settings));
                            showToast('✅ Configurações salvas no servidor!');
                          } catch (e) {
                            console.error(e);
                            showToast('❌ Erro ao salvar configurações.');
                          }
                        }}
                        className="w-full bg-brown-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2"
                      >
                        <Lock size={14} /> Salvar Todas as Configurações
                      </button>
                    </motion.div>
                  )}

                  {/* Client History Modal */}
                  <AnimatePresence>
                    {viewingHistory && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-0"
                      >
                        <div 
                          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                          onClick={() => setViewingHistory(null)}
                        />
                        <motion.div
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          exit={{ y: "100%" }}
                          transition={{ type: "spring", damping: 25, stiffness: 200 }}
                          className="relative bg-white w-full max-w-[430px] rounded-t-[40px] shadow-2xl p-6 pt-8 max-h-[85vh] overflow-y-auto no-scrollbar scroll-smooth"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-700">
                                <History size={24} />
                              </div>
                              <div>
                                <h3 className="font-outfit text-xl font-black text-brown-500">Histórico de Pedidos</h3>
                                <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest">
                                  {orders.find(o => o.phone === viewingHistory)?.client || 'Cliente'}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setViewingHistory(null)}
                              className="p-2 bg-pink-50 text-pink-400 rounded-xl hover:bg-pink-100 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-8">
                            <div className="bg-pink-50/50 p-3 rounded-2xl border border-pink-100/50">
                              <div className="text-[8px] font-black text-pink-700 uppercase tracking-widest mb-1">Pedidos</div>
                              <div className="font-pacifico text-xl text-brown-500">
                                {orders.filter(o => o.phone === viewingHistory).length}
                              </div>
                            </div>
                            <div className="bg-pink-50/50 p-3 rounded-2xl border border-pink-100/50">
                              <div className="text-[8px] font-black text-pink-700 uppercase tracking-widest mb-1">Faturado</div>
                              <div className="font-pacifico text-xl text-brown-500">
                                R$ {orders.filter(o => o.phone === viewingHistory && o.status === 'completed').reduce((acc, o) => acc + o.total + (o.delivery === 'delivery' ? settings.deliveryFee : 0) - (o.discountValue || 0), 0).toFixed(0)}
                              </div>
                            </div>
                            <div className="bg-pink-50/50 p-3 rounded-2xl border border-pink-100/50">
                              <div className="text-[8px] font-black text-pink-700 uppercase tracking-widest mb-1">Último Pedido</div>
                              <div className="font-pacifico text-sm text-brown-500">
                                {orders.filter(o => o.phone === viewingHistory)[0]?.date || '-'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {orders
                              .filter(o => o.phone === viewingHistory)
                              .map((order, i) => (
                                <div key={order.id} className="relative pl-6 border-l-2 border-pink-100/50 last:border-0 pb-6 last:pb-0">
                                  <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-pink-400" />
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-brown-300 uppercase">{order.date}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                                      order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                      {order.status === 'completed' ? 'Concluído' : 'Outro Status'}
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold text-brown-500 mb-1">
                                    Pedido #{orders.length - orders.indexOf(order)}
                                  </div>
                                  <div className="text-[11px] text-brown-300 leading-relaxed">
                                    {order.items.map(it => `${it.qty}x ${it.name}`).join(', ')}
                                  </div>
                                  <div className="mt-2 text-xs font-black text-pink-700 italic">
                                    R$ {(order.total + (order.delivery === 'delivery' ? settings.deliveryFee : 0)).toFixed(2).replace('.', ',')}
                                  </div>
                                </div>
                              ))}
                          </div>

                          <button
                            onClick={() => {
                              const lastOrder = orders.find(o => o.phone === viewingHistory);
                              if (lastOrder) {
                                window.open(`https://wa.me/55${lastOrder.phone}?text=${encodeURIComponent('Olá! Somos da Doce & Magia, vimos que você já é nosso cliente e queríamos agradecer o carinho! 🍪💕')}`, '_blank');
                              }
                            }}
                            className="w-full mt-10 bg-pink-400 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-pink-700 transition-all"
                          >
                            Mandar um Mimo no WhatsApp <Phone size={14} />
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && currentPage === 'cardapio' && (
        <motion.button
          initial={{ scale: 0, y: 50 }}
          animate={{ 
            scale: isBouncing ? 1.2 : 1, 
            y: 0,
            rotate: isBouncing ? [0, -10, 10, 0] : 0
          }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentPage('pedido')}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-pink-400 to-pink-700 text-white px-6 py-4 rounded-full font-black shadow-lg flex items-center gap-2 group border border-white/20"
        >
          <ShoppingCart size={20} />
          Ver carrinho
          <span className="bg-gold text-brown-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-inner">
            {cartCount}
          </span>
        </motion.button>
      )}

      {/* Confirmation Modals */}
      <AnimatePresence>
        {orderToDelete !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOrderToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-[320px] rounded-3xl p-6 shadow-2xl border border-pink-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="font-pacifico text-xl text-pink-700 mb-2">Tem certeza?</h3>
              <p className="text-sm text-brown-300 mb-6 font-semibold">
                Essa ação não poderá ser desfeita. O pedido será removido permanentemente.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-3 bg-pink-50 text-brown-300 rounded-xl font-bold text-sm hover:bg-pink-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (orderToDelete) {
                      await deleteDoc(doc(db, 'orders', String(orderToDelete)));
                      setOrderToDelete(null);
                      showToast('🗑️ Pedido removido com sucesso!');
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all"
                >
                  Sim, excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {productToDelete !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-[320px] rounded-3xl p-6 shadow-2xl border border-pink-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package size={32} />
              </div>
              <h3 className="font-pacifico text-xl text-pink-700 mb-2">Remover Sabor?</h3>
              <p className="text-sm text-brown-300 mb-6 font-semibold">
                Deseja remover este cookie do cardápio? Você poderá adicioná-lo de novo depois.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-pink-50 text-brown-300 rounded-xl font-bold text-sm hover:bg-pink-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (productToDelete) {
                      await deleteDoc(doc(db, 'products', String(productToDelete)));
                      setProductToDelete(null);
                      showToast('🗑️ Sabor removido!');
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-600 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-20 left-1/2 bg-brown-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[100] whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentVisible && pagBankOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brown-500/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-[380px] rounded-[40px] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setPaymentVisible(false)}
                className="absolute top-6 right-6 p-2 bg-pink-50 rounded-xl text-pink-400 hover:text-pink-700 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <h3 className="font-outfit text-2xl font-extrabold text-brown-500 tracking-tight">Pagamento Seguro</h3>
                <p className="text-[10px] text-pink-400 font-black uppercase tracking-widest mt-1">Quase lá! Finalize sua compra</p>
              </div>

              <Elements stripe={stripePromise}>
                <StripePaymentModal 
                  clientSecret={pagBankOrder?.clientSecret}
                  method={formData.paymentMethod === 'pix' ? 'pix' : 'card'}
                  amount={formData.isScheduled ? ((cartTotal + (formData.deliveryType === 'delivery' && !formData.isScheduled ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0)) / 2) : (cartTotal + (formData.deliveryType === 'delivery' ? settings.deliveryFee : 0) - (usePoints && settings.loyaltyEnabled && userProfile ? Math.min(cartTotal, userProfile.points * settings.realPerPoint) : 0))}
                  onCancel={() => setPaymentVisible(false)}
                  onSuccess={(paymentId) => {
                    const userPoints = userProfile?.points || 0;
                    const potentialDiscount = userPoints * settings.realPerPoint;
                    const actualDiscountValue = (usePoints && settings.loyaltyEnabled) ? Math.min(cartTotal, potentialDiscount) : 0;
                    const pointsRedeemed = actualDiscountValue / settings.realPerPoint;
                    finalizeOrder(actualDiscountValue, pointsRedeemed, paymentId);
                    setPaymentVisible(false);
                  }}
                />
              </Elements>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CookieApp;
