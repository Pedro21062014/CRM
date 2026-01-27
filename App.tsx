import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';

import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit, runTransaction } from 'firebase/firestore';
import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";
import XLSX from 'xlsx-js-style';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type as TypeIcon, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag, MapPin, Clock, Star, History, Menu, Phone,
  Zap, Globe, ShieldCheck, BarChart3, Smartphone, CheckCircle2, TrendingUp, TrendingDown, DollarSign, PieChart, Sparkles, MessageSquare, Send, Minus, Briefcase, User as UserIcon, Calendar, ClipboardList,
  FileSpreadsheet, Download, Upload, Filter, Target, List, MessageCircle, Bot, QrCode, Play, StopCircle, MoreVertical, Paperclip, Smile, Key, AlertTriangle, GripVertical
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus, ClientType, ClientStatus, WhatsAppConfig } from './types';
import { HeroSection, TextSection, ProductGridSection } from './components/StoreComponents';

// --- AI CONFIGURATION ---
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- Shared Components ---

const LoadingSpinner = () => (
  <div className="flex h-64 w-full items-center justify-center text-slate-400">
    <Loader2 className="animate-spin mr-2" size={32} />
    <span className="font-medium text-slate-500">Carregando...</span>
  </div>
);

const AppLogo = ({ collapsed, dark = false }: { collapsed?: boolean, dark?: boolean }) => (
  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 group cursor-pointer`}>
    <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-all duration-300 transform group-hover:scale-105 shrink-0">
      <Rocket size={20} strokeWidth={2.5} />
    </div>
    {!collapsed && (
      <div className="flex flex-col animate-in fade-in duration-300">
        <span className={`font-bold text-xl tracking-tight leading-none font-sans ${dark ? 'text-white' : 'text-slate-900'}`}>Nova<span className="text-indigo-500">CRM</span></span>
      </div>
    )}
  </div>
);

const PrimaryButton = ({ children, onClick, className, disabled, type = 'button' }: any) => (
  <button 
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, onClick, className, disabled, type = 'button' }: any) => (
  <button 
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

// --- UTILS ---
const openWhatsApp = (phone: string | undefined, text: string) => {
  if (!phone) return;
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    alert("Número de telefone inválido para WhatsApp.");
    return;
  }
  let finalPhone = cleanPhone;
  if (cleanPhone.length <= 11) {
    finalPhone = `55${cleanPhone}`;
  }
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

// --- CHARTS ---
const SimpleBarChart = ({ data, color = "indigo", height = 60 }: { data: number[], color?: string, height?: number }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-full w-full" style={{ height: `${height}px` }}>
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative">
           <div 
             className={`w-full rounded-t-sm transition-all duration-500 bg-${color}-500 opacity-80 group-hover:opacity-100`}
             style={{ height: `${(val / max) * 100}%` }}
           ></div>
           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
             {val}
           </div>
        </div>
      ))}
    </div>
  );
};

const ProfitLossChart = ({ income, expense }: { income: number, expense: number }) => {
  const total = income + expense;
  const incomePct = total > 0 ? (income / total) * 100 : 0;
  const expensePct = total > 0 ? (expense / total) * 100 : 0;
  return (
    <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100 mt-2">
      <div className="bg-emerald-500 transition-all duration-1000" style={{ width: `${incomePct}%` }} title={`Receita: ${income}`}></div>
      <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${expensePct}%` }} title={`Despesas: ${expense}`}></div>
    </div>
  );
};

// --- LANDING PAGE ---
const LandingPage = () => {
    const navigate = useNavigate();
    
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <AppLogo />
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/login')} className="text-slate-600 font-medium hover:text-indigo-600 transition-colors">Entrar</button>
                            <button onClick={() => navigate('/register')} className="bg-indigo-600 text-white px-5 py-2 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Começar Grátis</button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-6 border border-indigo-100 animate-in fade-in slide-in-from-bottom-4">
                        <Sparkles size={14}/> NovaCRM & Store Builder
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                        Gerencie Clientes.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Venda Mais.</span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        A plataforma tudo-em-um para pequenos negócios. Crie sua loja virtual, gerencie pedidos e fidelize clientes com nosso CRM inteligente integrado.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
                        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2">
                            <Rocket size={20}/> Criar Minha Conta
                        </button>
                        <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                            <UserIcon size={20}/> Já tenho conta
                        </button>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                                <Store size={28}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Loja Virtual Pronta</h3>
                            <p className="text-slate-500 leading-relaxed">Monte seu catálogo em minutos. Uma vitrine moderna que seus clientes podem acessar pelo celular e pedir via WhatsApp.</p>
                        </div>
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-100 transition-colors">
                            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                                <Users size={28}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">CRM Inteligente</h3>
                            <p className="text-slate-500 leading-relaxed">Organize contatos, acompanhe o funil de vendas e saiba exatamente quem são seus melhores clientes.</p>
                        </div>
                         <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-100 transition-colors">
                            <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 mb-6">
                                <BarChart3 size={28}/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Gestão Completa</h3>
                            <p className="text-slate-500 leading-relaxed">Acompanhe pedidos, estoque e métricas financeiras em um único painel intuitivo e poderoso.</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="flex justify-center mb-6"><AppLogo dark={true}/></div>
                    <p>© {new Date().getFullYear()} NovaCRM. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

// ... [Keep ProductsManager, WhatsAppBot, ClientsManager, OrdersManager as they are] ...
// Re-implementing StoreEditor for the request

const ProductsManager = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/products`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name || 'Produto Sem Nome',
        price: Number(formData.price) || 0,
        description: formData.description || '',
        category: formData.category || 'Geral',
        imageUrl: formData.imageUrl || '',
        stock: Number(formData.stock) || 0,
        updatedAt: serverTimestamp()
      };

      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/products`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/products`), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setEditing(null);
      setFormData({});
    } catch (err) {
      alert("Erro ao salvar produto.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este produto?")) {
      await deleteDoc(doc(db, `merchants/${user.uid}/products`, id));
    }
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormData(product);
  };

  const openNew = () => {
    setEditing({} as Product);
    setFormData({});
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Produtos</h2>
          <p className="text-slate-500 text-sm">Controle seu estoque e cardápio</p>
        </div>
        <PrimaryButton onClick={openNew}><Plus size={18}/> Novo Produto</PrimaryButton>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg">{editing.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                 <button onClick={() => setEditing(null)}><X size={24} className="text-slate-400"/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome do Produto</label>
                    <input required className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Preço (R$)</label>
                        <input required type="number" step="0.01" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Estoque</label>
                        <input type="number" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <input className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Lanches, Bebidas" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">URL da Imagem</label>
                    <input className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                    <textarea className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Salvar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {loading ? <LoadingSpinner/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all">
               <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img src={product.imageUrl || `https://picsum.photos/400/300?random=${product.id}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => openEdit(product)} className="p-2 bg-white rounded-full shadow text-indigo-600 hover:text-indigo-800"><Edit2 size={16}/></button>
                     <button onClick={() => handleDelete(product.id)} className="p-2 bg-white rounded-full shadow text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs font-bold">
                    Estoque: {product.stock}
                  </div>
               </div>
               <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{product.category}</span>
                       <h3 className="font-bold text-slate-800 leading-tight">{product.name}</h3>
                     </div>
                     <span className="font-bold text-indigo-600">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 h-8">{product.description}</p>
               </div>
            </div>
          ))}
          {products.length === 0 && (
             <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <Package size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-medium">Você ainda não tem produtos.</p>
                <button onClick={openNew} className="text-indigo-600 font-bold hover:underline mt-2">Cadastrar Primeiro Produto</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const WhatsAppBot = ({ user }: { user: User }) => {
  const [metaConfig, setMetaConfig] = useState<WhatsAppConfig>({ phoneNumberId: '', accessToken: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [messages, setMessages] = useState<{id: string, sender: 'me' | 'them', text: string, time: string}[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
        const docRef = doc(db, 'merchants', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().storeConfig?.metaWhatsApp) {
            setMetaConfig(docSnap.data().storeConfig.metaWhatsApp);
        } else {
            setShowConfig(true);
        }
    };
    loadConfig();
  }, [user]);

  const handleSaveConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          await setDoc(doc(db, 'merchants', user.uid), {
             storeConfig: { metaWhatsApp: metaConfig } 
          }, { merge: true });
          setShowConfig(false);
          alert('Configuração salva com sucesso!');
      } catch (error) {
          alert('Erro ao salvar configuração.');
      }
  };

  useEffect(() => {
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMetaMessage = async () => {
    if (!input.trim() || !targetPhone) {
        alert("Preencha o telefone e a mensagem.");
        return;
    }
    if (!metaConfig.phoneNumberId || !metaConfig.accessToken) {
        alert("Configure a API da Meta primeiro.");
        setShowConfig(true);
        return;
    }

    setSending(true);
    const newMsg = { id: Date.now().toString(), sender: 'me' as const, text: input, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    
    setMessages(prev => [...prev, newMsg]);
    
    try {
        let phone = targetPhone.replace(/\D/g, '');
        if (phone.length <= 11 && !phone.startsWith('55')) phone = `55${phone}`; 

        const url = `https://graph.facebook.com/v17.0/${metaConfig.phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${metaConfig.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: input }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error("Meta API Error:", data.error);
            setMessages(prev => [...prev, { id: 'err', sender: 'them', text: `Erro ao enviar: ${data.error.message}`, time: 'System' }]);
        } else {
            setInput('');
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Erro de conexão com a Meta API.");
    } finally {
        setSending(false);
    }
  };

  if (showConfig) {
      return (
          <div className="flex items-center justify-center h-full bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full">
                  <div className="flex items-center gap-3 mb-6 text-[#008069]">
                      <MessageCircle size={32} />
                      <h2 className="text-2xl font-bold text-slate-800">Configurar Meta API</h2>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">
                      Para enviar mensagens diretamente, insira as credenciais do seu App na Meta (Developers Facebook).
                  </p>
                  
                  <form onSubmit={handleSaveConfig} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">ID do Número de Telefone</label>
                          <input required className="w-full p-3 mt-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={metaConfig.phoneNumberId} onChange={e => setMetaConfig({...metaConfig, phoneNumberId: e.target.value})} placeholder="Ex: 1045234..." />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Token de Acesso</label>
                          <input required type="password" className="w-full p-3 mt-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={metaConfig.accessToken} onChange={e => setMetaConfig({...metaConfig, accessToken: e.target.value})} placeholder="EAAG..." />
                      </div>
                      <div className="flex gap-3 pt-4">
                          {messages.length > 0 && <button type="button" onClick={() => setShowConfig(false)} className="px-4 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Voltar</button>}
                          <button type="submit" className="flex-1 py-3 bg-[#008069] text-white font-bold rounded-xl hover:bg-[#006d59] shadow-lg flex items-center justify-center gap-2"><Key size={18}/> Salvar Credenciais</button>
                      </div>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-100 overflow-hidden rounded-xl shadow-xl border border-slate-200 animate-in zoom-in-95 duration-300">
       <div className="w-full md:w-[350px] bg-white border-r border-slate-200 flex flex-col">
          <div className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                 {user.photoURL ? <img src={user.photoURL} className="w-full h-full"/> : <UserIcon className="text-slate-400"/>}
              </div>
              <div className="flex gap-2 text-slate-500">
                  <button onClick={() => setShowConfig(true)} className="p-2 hover:bg-slate-200 rounded-full" title="Configurações API"><Settings size={20}/></button>
              </div>
          </div>
          <div className="p-4 border-b border-slate-100 bg-emerald-50">
             <label className="text-xs font-bold text-emerald-700 uppercase mb-1 block">Iniciar Conversa</label>
             <div className="flex items-center bg-white border border-emerald-200 rounded-lg px-3 py-2">
                <Phone size={16} className="text-emerald-500 mr-2"/>
                <input placeholder="5511999999999" value={targetPhone} onChange={e => setTargetPhone(e.target.value)} className="bg-transparent border-none text-sm w-full outline-none placeholder:text-slate-400 font-medium" />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
              <div className="p-3">
                  <p className="text-xs text-slate-400 text-center uppercase font-bold tracking-wider mb-2">Histórico Local</p>
                  <div className={`flex items-center gap-3 p-3 cursor-pointer bg-slate-100 rounded-lg`}>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0"><MessageCircle size={20}/></div>
                      <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline"><h4 className="font-medium text-slate-900 truncate">{targetPhone || 'Novo Chat'}</h4><span className="text-xs text-slate-400">Agora</span></div>
                          <p className="text-sm text-slate-500 truncate">Conversa ativa via API</p>
                      </div>
                  </div>
              </div>
          </div>
       </div>
       <div className="hidden md:flex flex-1 flex-col bg-[#efeae2] relative">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'}}></div>
          <div className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold"><UserIcon size={20}/></div>
                  <div><h4 className="font-medium text-slate-900">{targetPhone ? targetPhone : 'Selecione um número'}</h4><p className="text-xs text-slate-500">via WhatsApp Cloud API</p></div>
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 z-10" ref={scrollRef}>
             {messages.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[70%] p-2 px-3 rounded-lg text-sm shadow-sm relative ${msg.sender === 'me' ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                        <div className="break-words">{msg.text}</div>
                        <div className="flex justify-end items-center gap-1 mt-1"><span className="text-[10px] text-slate-500">{msg.time}</span></div>
                     </div>
                 </div>
             ))}
          </div>
          <div className="h-16 bg-slate-50 px-4 flex items-center gap-3 z-10">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMetaMessage()} className="flex-1 p-2.5 rounded-lg border-none bg-white outline-none focus:ring-1 focus:ring-white placeholder:text-slate-400" placeholder={targetPhone ? "Digite sua mensagem..." : "Insira um número ao lado primeiro"} disabled={!targetPhone} />
              <button onClick={sendMetaMessage} disabled={sending} className="p-2 text-[#00a884] hover:bg-slate-100 rounded-full transition-all">{sending ? <Loader2 size={24} className="animate-spin"/> : <Send size={24}/>}</button>
          </div>
       </div>
    </div>
  );
};

// ... [Keep ClientsManager, OrdersManager] ...
const CLIENT_STATUSES = {
    'potential': { label: 'Potencial', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'negotiation': { label: 'Em Negociação', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    'converted': { label: 'Recém Convertido', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'active': { label: 'Cliente Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'loyal': { label: 'Fidelizado', color: 'bg-violet-100 text-violet-700 border-violet-200' }
};

const ClientsManager = ({ user }: { user: User }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<ClientType>('common');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/clients`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({ id: doc.id, ...data, clientType: data.clientType || 'common', status: data.status || 'potential'} as Client);
      });
      setClients(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  const filteredClients = clients.filter(c => c.clientType === activeTab);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone || '',
        clientType: formData.clientType || 'common',
        address: formData.address || {street:'',number:'',neighborhood:'',city:'',zip:'',complement:''},
        updatedAt: serverTimestamp()
      };
      if (formData.clientType === 'commercial') {
        Object.assign(payload, {
            contactPerson: formData.contactPerson || '',
            purchasePotential: Number(formData.purchasePotential || 0),
            notes: formData.notes || '',
            status: formData.status || 'potential'
        });
      }
      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/clients`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/clients`), { ...payload, createdAt: serverTimestamp(), totalOrders: 0 });
      }
      setEditing(null);
      setFormData({});
    } catch (err) {
      alert('Erro ao salvar cliente.');
    }
  };

  const handleDelete = async (clientId: string) => {
    if (confirm('Tem certeza?')) await deleteDoc(doc(db, `merchants/${user.uid}/clients`, clientId));
  };

  const openEdit = (client: Client) => { setEditing(client); setFormData(client); };
  const openNew = () => { setEditing({} as Client); setFormData({ clientType: activeTab, status: 'potential' }); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">Gerenciar Clientes</h2></div>
        <div className="flex gap-3"><PrimaryButton onClick={openNew}><Plus size={18} /> Novo Cliente</PrimaryButton></div>
      </div>
      <div className="flex justify-between items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-full max-w-md">
            <button onClick={() => setActiveTab('common')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'common' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Consumidores</button>
            <button onClick={() => setActiveTab('commercial')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'commercial' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Pontos Comerciais</button>
          </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between mb-4"><h3 className="font-bold">Cliente</h3><button onClick={()=>setEditing(null)}><X/></button></div>
             <form onSubmit={handleSave} className="space-y-4">
                <input className="w-full p-2 border rounded" placeholder="Nome" value={formData.name || ''} onChange={e=>setFormData({...formData, name: e.target.value})} required/>
                <input className="w-full p-2 border rounded" placeholder="Telefone" value={formData.phone || ''} onChange={e=>setFormData({...formData, phone: e.target.value})} required/>
                <div className="flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} className="px-4 py-2 text-slate-600">Cancelar</button><button className="px-4 py-2 bg-indigo-600 text-white rounded">Salvar</button></div>
             </form>
          </div>
        </div>
      )}
      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClients.map(client => (
                <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                    <div className="flex justify-between">
                        <h4 className="font-bold">{client.name}</h4>
                        <div className="flex gap-2">
                           <button onClick={() => openWhatsApp(client.phone, '')} className="text-emerald-500"><MessageCircle size={16}/></button>
                           <button onClick={() => openEdit(client)} className="text-indigo-500"><Edit2 size={16}/></button>
                           <button onClick={() => handleDelete(client.id)} className="text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">{client.phone}</p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

const OrdersManager = ({ user }: { user: User }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
      const q = query(collection(db, `merchants/${user.uid}/orders`), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const items: Order[] = [];
          snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Order));
          setOrders(items);
          setLoading(false);
      });
      return unsubscribe;
  }, [user.uid]);
  return (
      <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h2 className="text-2xl font-bold">Pedidos</h2></div>
          {loading ? <LoadingSpinner /> : (
            <div className="grid gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between"><span className="font-bold">#{order.id.slice(0, 8)}</span><span className="font-bold text-indigo-600">R$ {order.total.toFixed(2)}</span></div>
                        <p className="text-sm text-slate-500">{order.customerName}</p>
                        <div className="mt-2 text-sm">{order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</div>
                    </div>
                ))}
            </div>
          )}
      </div>
  );
};

const StoreEditor = ({ user }: { user: User }) => {
  const [config, setConfig] = useState<StoreConfig>({
    storeName: 'Minha Loja',
    themeColor: '#ea1d2c',
    sections: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'merchants', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().storeConfig) {
          setConfig(docSnap.data().storeConfig);
        } else {
          setConfig({
            storeName: user.displayName || 'Minha Loja',
            description: 'A melhor comida da região!',
            themeColor: '#ea1d2c',
            sections: [{ id: '2', type: 'products', title: 'Destaques', backgroundColor: '#ffffff' }]
          });
        }
        
        const pQuery = query(collection(db, `merchants/${user.uid}/products`), limit(4));
        const pSnap = await getDocs(pQuery);
        const pList: Product[] = [];
        pSnap.forEach(d => pList.push({id: d.id, ...d.data()} as Product));
        setPreviewProducts(pList);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [user.uid]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'merchants', user.uid), { storeConfig: config });
    } catch (e) {
      await setDoc(doc(db, 'merchants', user.uid), { storeConfig: config }, { merge: true });
    }
    setSaving(false);
    alert('Loja atualizada com sucesso!');
  };

  const addSection = (type: 'hero' | 'products' | 'text') => {
    const newSection: StoreSection = {
      id: Date.now().toString(),
      type,
      title: type === 'hero' ? 'Novo Banner' : type === 'products' ? 'Cardápio / Produtos' : 'Nova Seção de Texto',
      content: type === 'text' ? 'Clique para editar este texto...' : 'Subtítulo do banner',
      backgroundColor: '#ffffff',
      textColor: '#000000'
    };
    setConfig(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    setActiveSectionId(newSection.id);
  };

  const updateSection = (id: string, updates: Partial<StoreSection>) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeSection = (id: string) => {
    if(confirm('Remover esta seção?')) {
      setConfig(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
      if(activeSectionId === id) setActiveSectionId(null);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItem(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedItem === null) return;
      const newSections = [...config.sections];
      const itemToMove = newSections[draggedItem];
      newSections.splice(draggedItem, 1);
      newSections.splice(index, 0, itemToMove);
      setConfig({...config, sections: newSections});
      setDraggedItem(null);
  };

  const publicLink = `${window.location.origin}/#/store/${user.uid}`;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 shrink-0 gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Editor Visual</h2></div>
        <div className="flex gap-3 w-full md:w-auto">
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none justify-center px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
            <ExternalLink size={14} /> Ver Loja
          </a>
          <button onClick={saveConfig} disabled={saving} className="flex-1 md:flex-none px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md transition-all text-sm">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 overflow-hidden">
        {/* Sidebar Configuration */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={18}/> Configurações Gerais</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Loja</label>
                        <input className="w-full p-2 border rounded-lg mt-1 text-sm" value={config.storeName} onChange={e => setConfig({...config, storeName: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                        <input className="w-full p-2 border rounded-lg mt-1 text-sm" value={config.description || ''} onChange={e => setConfig({...config, description: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><MessageCircle size={12}/> WhatsApp</label>
                         <input className="w-full p-2 border border-emerald-100 rounded-lg mt-1 text-sm" placeholder="Ex: 5511999999999" value={config.whatsapp || ''} onChange={e => setConfig({...config, whatsapp: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Cor e Logo</label>
                        <div className="flex gap-2 mt-1">
                             <input type="color" className="w-10 h-10 border rounded cursor-pointer" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
                             <input className="flex-1 p-2 border rounded-lg text-xs" placeholder="URL do Logo" value={config.logoUrl || ''} onChange={e => setConfig({...config, logoUrl: e.target.value})} />
                        </div>
                        <input className="w-full mt-2 p-2 border rounded-lg text-xs" placeholder="URL do Banner (Capa)" value={config.bannerUrl || ''} onChange={e => setConfig({...config, bannerUrl: e.target.value})} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutGrid size={18}/> Elementos</h3>
                     <div className="flex gap-2">
                         <button onClick={() => addSection('hero')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Banner"><ImageIcon size={16}/></button>
                         <button onClick={() => addSection('products')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Produtos"><ShoppingBag size={16}/></button>
                         <button onClick={() => addSection('text')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Texto"><TypeIcon size={16}/></button>
                     </div>
                </div>
                
                {/* Active Section Editor */}
                {activeSectionId && (
                   <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 animate-in slide-in-from-left-2">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-xs font-bold uppercase text-indigo-800">Editando Seção</span>
                         <button onClick={() => setActiveSectionId(null)} className="text-indigo-400 hover:text-indigo-600"><X size={14}/></button>
                      </div>
                      
                      {config.sections.find(s => s.id === activeSectionId) && (
                          <div className="space-y-3">
                              {(() => {
                                  const s = config.sections.find(sect => sect.id === activeSectionId)!;
                                  return (
                                    <>
                                        {(s.type === 'hero' || s.type === 'image') && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Imagem de Fundo (URL)</label>
                                                <input className="w-full p-2 border rounded text-xs bg-white" value={s.imageUrl || ''} onChange={e => updateSection(s.id, {imageUrl: e.target.value})} />
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Fundo</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input type="color" className="w-6 h-6 border-none bg-transparent cursor-pointer" value={s.backgroundColor || '#ffffff'} onChange={e => updateSection(s.id, {backgroundColor: e.target.value})} />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Texto</label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input type="color" className="w-6 h-6 border-none bg-transparent cursor-pointer" value={s.textColor || '#000000'} onChange={e => updateSection(s.id, {textColor: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeSection(s.id)} className="w-full py-2 bg-white border border-red-200 text-red-500 text-xs font-bold rounded hover:bg-red-50">Remover Seção</button>
                                    </>
                                  );
                              })()}
                          </div>
                      )}
                   </div>
                )}
                
                <p className="text-xs text-slate-500">
                    <span className="font-bold">Dica:</span> Arraste os elementos no preview ao lado para reordenar. Clique neles para editar o texto.
                </p>
            </div>
        </div>

        {/* Live Preview & Editor Area */}
        <div className="w-full lg:w-2/3 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-4 md:p-8 relative overflow-hidden min-h-[500px]">
            <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm">Editor Visual Interativo</div>
            
            <div className="w-full max-w-[480px] h-[700px] bg-white rounded-[40px] shadow-2xl border-[8px] border-slate-800 overflow-hidden relative flex flex-col mx-auto">
                {/* Phone Top Bar */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-gray-50 pb-10">
                    {/* Header Preview */}
                    <div className="bg-white pb-4 shadow-sm relative">
                        <div className="h-24 w-full bg-cover bg-center" style={{ 
                            backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #ea1d2c, #b91c1c)',
                            backgroundColor: config.themeColor 
                        }}></div>
                        <div className="px-4 -mt-8 flex gap-3 relative z-10">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white shadow overflow-hidden">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{color: config.themeColor}}><Store size={24}/></div>}
                            </div>
                            <div className="pt-9">
                                <h1 className="font-bold text-slate-800 text-sm leading-tight">{config.storeName}</h1>
                                <p className="text-[10px] text-slate-500 mt-0.5">{config.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Draggable Sections */}
                    <div>
                        {config.sections.map((section, index) => (
                             <div 
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`relative group cursor-move hover:ring-2 hover:ring-indigo-200 transition-all ${draggedItem === index ? 'opacity-50' : 'opacity-100'}`}
                             >
                                {/* Drag Handle Overlay on Hover */}
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-white shadow rounded text-slate-400 opacity-0 group-hover:opacity-100 z-20 pointer-events-none">
                                    <GripVertical size={16}/>
                                </div>

                                {/* Actual Component Rendering */}
                                {section.type === 'hero' && (
                                    <HeroSection 
                                        section={section} 
                                        isEditable={true} 
                                        isActive={activeSectionId === section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        onUpdate={(updates) => updateSection(section.id, updates)}
                                    />
                                )}
                                {section.type === 'text' && (
                                    <TextSection 
                                        section={section} 
                                        isEditable={true} 
                                        isActive={activeSectionId === section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        onUpdate={(updates) => updateSection(section.id, updates)}
                                    />
                                )}
                                {section.type === 'products' && (
                                    <ProductGridSection 
                                        section={section} 
                                        products={previewProducts} 
                                        isEditable={true} 
                                        isActive={activeSectionId === section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        onUpdate={(updates) => updateSection(section.id, updates)}
                                    />
                                )}
                             </div>
                        ))}
                    </div>
                    {config.sections.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            <p>Adicione seções no menu lateral.</p>
                        </div>
                    )}
                </div>

                <div className="h-12 bg-white border-t flex justify-around items-center px-4 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// ... [Keep AuthPage, PublicStore, AIAssistant, DashboardHome, Dashboard] ...

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
           <div className="flex justify-center mb-4"><AppLogo /></div>
           <h2 className="text-2xl font-bold text-slate-800">{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h2>
           <p className="text-slate-500 text-sm mt-2">{isRegister ? 'Comece a gerenciar seu negócio hoje.' : 'Entre para acessar seu painel.'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
             <input type="email" required className="w-full p-3 mt-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
             <input type="password" required className="w-full p-3 mt-1 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
           </div>
           
           <button disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
             {loading && <Loader2 className="animate-spin" size={18}/>}
             {isRegister ? 'Cadastrar' : 'Entrar'}
           </button>
        </form>

        <div className="my-6 flex items-center gap-4">
           <div className="h-px bg-slate-100 flex-1"></div>
           <span className="text-slate-400 text-xs uppercase font-bold">Ou</span>
           <div className="h-px bg-slate-100 flex-1"></div>
        </div>

        <button onClick={handleGoogle} className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex justify-center items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>

        <p className="text-center mt-6 text-sm text-slate-500">
           {isRegister ? 'Já tem uma conta?' : 'Não tem conta?'}
           <span onClick={() => navigate(isRegister ? '/login' : '/register')} className="text-indigo-600 font-bold cursor-pointer ml-1 hover:underline">
              {isRegister ? 'Entrar' : 'Cadastrar'}
           </span>
        </p>
      </div>
    </div>
  );
};

const PublicStore = () => {
  const { id } = useParams();
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
      const loadStore = async () => {
          if (!id) return;
          try {
              const docSnap = await getDoc(doc(db, 'merchants', id));
              if (docSnap.exists() && docSnap.data().storeConfig) {
                  setConfig(docSnap.data().storeConfig);
              }
              const pSnap = await getDocs(collection(db, `merchants/${id}/products`));
              const pList: Product[] = [];
              pSnap.forEach(d => pList.push({id: d.id, ...d.data()} as Product));
              setProducts(pList);
          } catch(e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      loadStore();
  }, [id]);

  const addToCart = (product: Product) => {
      setCart(prev => {
          const existing = prev.find(p => p.product.id === product.id);
          if (existing) {
              return prev.map(p => p.product.id === product.id ? {...p, quantity: p.quantity + 1} : p);
          }
          return [...prev, { product, quantity: 1 }];
      });
      setCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(p => p.product.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const checkout = () => {
      const message = `Olá! Gostaria de fazer um pedido:\n\n${cart.map(i => `${i.quantity}x ${i.product.name}`).join('\n')}\n\nTotal: R$ ${total.toFixed(2)}`;
      
      // Se o estabelecimento tem um WhatsApp configurado, usa ele.
      if (config?.whatsapp) {
          openWhatsApp(config.whatsapp, message);
      } else {
          // Fallback antigo: abre sem número (usuário escolhe)
          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      }
  };

  if (loading) return <LoadingSpinner />;
  if (!config) return <div className="text-center py-20">Loja não encontrada.</div>;

  return (
      <div className="min-h-screen bg-white font-sans text-slate-900">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
             <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     {config.logoUrl && <img src={config.logoUrl} className="w-8 h-8 rounded-full object-cover"/>}
                     <span className="font-bold text-lg">{config.storeName}</span>
                 </div>
                 <button onClick={() => setCartOpen(true)} className="relative p-2 hover:bg-slate-100 rounded-full">
                     <ShoppingBag size={24}/>
                     {cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
                 </button>
             </div>
          </header>

          {config.sections.map(section => {
              if (section.type === 'hero') return <HeroSection key={section.id} section={section} />;
              if (section.type === 'text') return <TextSection key={section.id} section={section} />;
              if (section.type === 'products') return <ProductGridSection key={section.id} section={section} products={products} onAddToCart={addToCart} />;
              return null;
          })}

          <footer className="py-10 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-slate-500 text-sm">© {new Date().getFullYear()} {config.storeName}. Powered by NovaCRM.</p>
          </footer>

          {/* Shopping Cart Sidebar */}
          {cartOpen && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCartOpen(false)}></div>
                  <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-lg">Seu Pedido</h3>
                          <button onClick={() => setCartOpen(false)}><X size={24}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {cart.map(item => (
                              <div key={item.product.id} className="flex gap-4">
                                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                                     {item.product.imageUrl && <img src={item.product.imageUrl} className="w-full h-full object-cover"/>}
                                  </div>
                                  <div className="flex-1">
                                      <h4 className="font-bold text-sm">{item.product.name}</h4>
                                      <p className="text-xs text-slate-500">Un: R$ {item.product.price.toFixed(2)}</p>
                                      <div className="flex items-center justify-between mt-2">
                                          <span className="font-bold">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                          <div className="flex items-center gap-2">
                                              <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 text-xs font-bold">Remover</button>
                                              <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">x{item.quantity}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {cart.length === 0 && <p className="text-center text-slate-500 py-10">Carrinho vazio</p>}
                      </div>
                      <div className="p-4 border-t bg-slate-50">
                          <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-slate-500">Total</span>
                              <span className="font-bold text-xl text-indigo-600">R$ {total.toFixed(2)}</span>
                          </div>
                          <button onClick={checkout} disabled={cart.length === 0} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                              <MessageSquare size={20}/> Pedir no WhatsApp
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

const AIAssistant = ({ user }: { user: User }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: 'user', parts: [{ text: newMsg.text }] }],
        config: {
            systemInstruction: "Você é um assistente virtual especialista em negócios e CRM. Ajude o usuário a gerenciar sua loja, analisar métricas e melhorar vendas. Seja curto e eficiente."
        }
      });

      const reply = response.text || "Não consegui processar a resposta.";
      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com a IA." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all z-50 group"
      >
        {isOpen ? <X size={24}/> : <Sparkles size={24} className="group-hover:animate-spin-slow"/>}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
           <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold">
                 <Bot size={20}/> Assistente IA
              </div>
              <button onClick={() => setIsOpen(false)}><X size={18} className="opacity-70 hover:opacity-100"/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
              {messages.length === 0 && (
                  <div className="text-center text-slate-400 mt-10">
                      <Sparkles size={32} className="mx-auto mb-2 text-indigo-300"/>
                      <p className="text-sm">Olá! Pergunte sobre vendas, marketing ou gestão.</p>
                  </div>
              )}
              {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm'}`}>
                          {m.text}
                      </div>
                  </div>
              ))}
              {loading && (
                  <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                          <Loader2 size={16} className="animate-spin text-indigo-500"/>
                      </div>
                  </div>
              )}
           </div>
           
           <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex gap-2">
              <input 
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  <Send size={20}/>
              </button>
           </div>
        </div>
      )}
    </>
  );
};

const DashboardHome = ({ user }: { user: User }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    salesToday: 0,
    ordersToday: 0,
    newClientsToday: 0,
    avgTicketToday: 0,
    weeklySales: [0,0,0,0,0,0,0],
    monthlyRevenue: 0,
    monthlyGoal: 20000 
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0,0,0,0);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const ordersQ = query(collection(db, `merchants/${user.uid}/orders`));
      const ordersSnap = await getDocs(ordersQ);
      
      let salesT = 0;
      let ordersT = 0;
      let monthlyRev = 0;
      const weeklyData = [0,0,0,0,0,0,0]; 

      ordersSnap.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()); 
        const total = data.total || 0;

        if (date >= today) {
           salesT += total;
           ordersT += 1;
        }

        if (date >= firstDayOfMonth) {
          monthlyRev += total;
        }

        if (date >= sevenDaysAgo) {
           const dayDiff = Math.floor((date.getTime() - sevenDaysAgo.getTime()) / (1000 * 3600 * 24));
           if (dayDiff >= 0 && dayDiff < 7) {
             weeklyData[dayDiff] += total;
           }
        }
      });

      const clientsQ = query(collection(db, `merchants/${user.uid}/clients`));
      const clientsSnap = await getDocs(clientsQ);
      let newClientsT = 0;
      clientsSnap.forEach(doc => {
          const data = doc.data();
          const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          if (date >= today) newClientsT++;
      });

      setMetrics({
        salesToday: salesT,
        ordersToday: ordersT,
        newClientsToday: newClientsT,
        avgTicketToday: ordersT > 0 ? salesT / ordersT : 0,
        weeklySales: weeklyData,
        monthlyRevenue: monthlyRev,
        monthlyGoal: 20000
      });
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Olá, {user.displayName || 'Lojista'}</h2>
                    <p className="text-slate-500 text-sm md:text-base">Aqui está o resumo da sua operação hoje.</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data de Hoje</p>
                    <p className="text-xl font-medium text-slate-700">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: "Vendas Hoje", value: `R$ ${metrics.salesToday.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", trend: "Hoje" },
                    { label: "Pedidos", value: metrics.ordersToday.toString(), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", trend: "Hoje" },
                    { label: "Novos Clientes", value: metrics.newClientsToday.toString(), icon: Users, color: "text-violet-600", bg: "bg-violet-50", trend: "Hoje" },
                    { label: "Ticket Médio", value: `R$ ${metrics.avgTicketToday.toFixed(2)}`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", trend: "Hoje" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{stat.trend}</span>
                        </div>
                        <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.label}</h3>
                        <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Vendas da Semana</h3>
                        <button className="text-slate-400 hover:text-indigo-600"><ExternalLink size={16}/></button>
                    </div>
                    <div className="h-64">
                        <SimpleBarChart data={metrics.weeklySales} height={250} />
                    </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg mb-2">Meta Mensal</h3>
                        <p className="text-slate-500 text-sm mb-6">Seu progresso em relação à meta de R$ 20.000</p>
                        
                        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 88} strokeDashoffset={2 * Math.PI * 88 * (1 - Math.min(metrics.monthlyRevenue / metrics.monthlyGoal, 1))} className="text-indigo-600" strokeLinecap="round" />
                            </svg>
                            <div className="absolute text-center">
                                <span className="text-3xl font-bold text-slate-800">{Math.round((metrics.monthlyRevenue / metrics.monthlyGoal) * 100)}%</span>
                                <p className="text-xs text-slate-400 font-bold uppercase">Atingido</p>
                            </div>
                        </div>
                     </div>
                     
                     <div className="mt-6 pt-6 border-t border-slate-100">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Receita Mês</span>
                            <span className="font-bold text-slate-800">R$ {metrics.monthlyRevenue.toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Despesas (Est.)</span>
                            <span className="font-bold text-slate-800">R$ {(metrics.monthlyRevenue * 0.3).toFixed(2)}</span>
                         </div>
                         <ProfitLossChart income={metrics.monthlyRevenue} expense={metrics.monthlyRevenue * 0.3} />
                     </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: User) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Allow access to dashboard sub-routes only if authenticated, handled by routing logic below
        // If we are in Dashboard component and no user, we redirect.
        navigate('/login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (!user) return null;

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral', exact: true },
    { path: '/dashboard/orders', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/dashboard/products', icon: Package, label: 'Produtos' },
    { path: '/dashboard/clients', icon: Users, label: 'Clientes' },
    { path: '/dashboard/whatsapp', icon: MessageCircle, label: 'WhatsApp Bot' },
    { path: '/dashboard/store', icon: Store, label: 'Loja Virtual' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 transform 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:static 
          ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          w-64
          flex flex-col
        `}
      >
        <div className="h-20 flex items-center justify-center border-b border-slate-100 relative">
             <AppLogo collapsed={sidebarCollapsed} />
             <button onClick={() => setMobileMenuOpen(false)} className="absolute right-4 md:hidden p-2 text-slate-400 hover:text-slate-600">
               <X size={20} />
             </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
           {menuItems.map((item) => {
             const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
             return (
               <Link 
                 key={item.path} 
                 to={item.path}
                 onClick={() => setMobileMenuOpen(false)}
                 className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                 title={sidebarCollapsed ? item.label : ''}
               >
                 <item.icon size={20} className="shrink-0" />
                 {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
               </Link>
             )
           })}
        </nav>

        <div className="p-4 border-t border-slate-100">
            <button onClick={handleLogout} className={`flex items-center gap-3 p-3 rounded-xl w-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all ${sidebarCollapsed ? 'justify-center' : ''}`} title="Sair">
                <LogOut size={20} className="shrink-0" />
                {!sidebarCollapsed && <span className="font-medium truncate">Sair</span>}
            </button>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="mt-4 w-full justify-center text-slate-300 hover:text-indigo-600 hidden md:flex">
                {sidebarCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
            </button>
        </div>
      </aside>

      <main className="flex-1 transition-all duration-300 overflow-y-auto h-screen relative w-full">
         <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30">
            <AppLogo />
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                <Menu size={24}/>
            </button>
         </div>

         <div className="p-4 md:p-10 max-w-7xl mx-auto pb-24 md:pb-10">
            <Routes>
              <Route path="/" element={<DashboardHome user={user} />} />
              <Route path="/orders" element={<OrdersManager user={user} />} />
              <Route path="/clients" element={<ClientsManager user={user} />} />
              <Route path="/whatsapp" element={<WhatsAppBot user={user} />} />
              <Route path="/store" element={<StoreEditor user={user} />} />
              <Route path="/products" element={<ProductsManager user={user} />} />
            </Routes>
         </div>
      </main>
      
      <AIAssistant user={user} />
    </div>
  );
};

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/store/:id" element={<PublicStore />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
      </Routes>
    </HashRouter>
  );
};

export default App;