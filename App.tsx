import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate, Outlet } from 'react-router-dom';
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
  FileSpreadsheet, Download, Upload, Filter, Target, List, MessageCircle, Bot, QrCode, Play, StopCircle, MoreVertical, Paperclip, Smile, Key, AlertTriangle, GripVertical, AlertCircle, Trophy, Save, Cpu, Timer, Lock
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
        <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Versão 3.0 Alpha</span>
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

// Updated convertFileToBase64 with image resizing/compression to fix Firestore size limit errors
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize to max 800px width to keep size low
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             // Return base64, compressed as JPEG 0.8 quality
             resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
             // Fallback
             resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (error) => reject(error);
  });
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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <AppLogo />
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/login')} className="text-slate-600 font-medium text-sm hover:text-indigo-600 transition-colors hidden sm:block">Login</button>
                            <button onClick={() => navigate('/register')} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm flex items-center gap-2">
                                Criar Conta <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero V3 Announcement */}
            <section className="pt-32 pb-20 px-4 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-30">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                    <div className="absolute top-40 -left-20 w-72 h-72 bg-violet-200 rounded-full blur-3xl opacity-50"></div>
                </div>

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-indigo-400 text-xs font-bold mb-8 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 hover:scale-105 transition-transform cursor-default">
                        <Sparkles size={12} className="text-yellow-400"/> VEM AÍ: NOVACRM V3
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
                        O CRM do Futuro <br className="hidden md:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">está chegando.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 leading-relaxed">
                        Prepare-se para a revolução. O <b>NovaCRM V3</b> trará inteligência artificial generativa, automação total de WhatsApp e funis de venda preditivos. Comece a usar a versão atual hoje e garanta migração gratuita.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
                        <button onClick={() => navigate('/register')} className="px-8 py-4 bg-slate-900 text-white text-lg font-bold rounded-xl hover:bg-slate-800 transition-all shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2 ring-4 ring-slate-100">
                            <Rocket size={20}/> Garantir Acesso Antecipado
                        </button>
                        <button onClick={() => navigate('/login')} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                            Acessar Versão 2.0
                        </button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500"/> Setup Grátis</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500"/> Sem Cartão de Crédito</span>
                        <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-500"/> Suporte 24/7</span>
                    </div>
                </div>
            </section>

            {/* V3 Features Section (Updated to Light Theme) */}
            <section className="py-20 bg-white relative overflow-hidden border-t border-b border-slate-100">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">O que muda na V3?</h2>
                        <p className="text-slate-500">Três pilares que vão transformar seu negócio.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                                <Cpu size={28}/>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-800">IA Nativa (Gemini)</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                Não apenas um chat. A IA vai analisar seu estoque, sugerir promoções e até criar imagens de produtos automaticamente.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                                <MessageCircle size={28}/>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-800">Automação WhatsApp</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                Esqueça o envio manual. O bot da V3 recupera carrinhos abandonados e confirma pedidos sem intervenção humana.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="w-12 h-12 bg-fuchsia-100 rounded-2xl flex items-center justify-center text-fuchsia-600 mb-6 group-hover:scale-110 transition-transform">
                                <TrendingUp size={28}/>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-800">Funnels Preditivos</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                Saiba exatamente quem vai comprar antes mesmo do cliente. O CRM classifica leads por temperatura e potencial.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Current Features (Legacy but polished) */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Comece hoje com a V2</h2>
                            <p className="text-slate-500">Nossa plataforma atual já é poderosa e pronta para usar.</p>
                        </div>
                        <button onClick={() => navigate('/register')} className="text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-2 group">
                            Ver todas as funcionalidades <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="group">
                            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center relative">
                                <Store size={48} className="text-slate-300 group-hover:text-indigo-500 transition-colors duration-500 group-hover:scale-110"/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Loja Virtual Express</h3>
                            <p className="text-slate-500 text-sm">Crie seu catálogo online em menos de 5 minutos e compartilhe o link.</p>
                        </div>
                        <div className="group">
                            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center">
                                <Users size={48} className="text-slate-300 group-hover:text-emerald-500 transition-colors duration-500 group-hover:scale-110"/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Gestão de Clientes</h3>
                            <p className="text-slate-500 text-sm">Centralize seus contatos e histórico de pedidos em um lugar seguro.</p>
                        </div>
                         <div className="group">
                            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white aspect-video flex items-center justify-center">
                                <BarChart3 size={48} className="text-slate-300 group-hover:text-violet-500 transition-colors duration-500 group-hover:scale-110"/>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Dashboard Financeiro</h3>
                            <p className="text-slate-500 text-sm">Acompanhe suas vendas diárias, ticket médio e metas mensais.</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <AppLogo dark={false}/>
                    <div className="flex gap-6 text-sm text-slate-500 font-medium">
                        <a href="#" className="hover:text-indigo-600 transition-colors">Termos</a>
                        <a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a>
                        <a href="#" className="hover:text-indigo-600 transition-colors">Contato</a>
                    </div>
                    <p className="text-slate-400 text-sm">© {new Date().getFullYear()} NovaCRM Inc.</p>
                </div>
            </footer>
        </div>
    );
};

const ProductsManager = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const priceVal = parseFloat(String(formData.price));
      const stockVal = parseInt(String(formData.stock));

      const payload = {
        name: formData.name || 'Produto Sem Nome',
        price: isNaN(priceVal) ? 0 : priceVal,
        description: formData.description || '',
        category: formData.category || 'Geral',
        imageUrl: formData.imageUrl || '',
        stock: isNaN(stockVal) ? 0 : stockVal,
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
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar produto: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await convertFileToBase64(file);
        setFormData({ ...formData, imageUrl: base64 });
      } catch (error) {
        alert("Erro ao processar imagem.");
      }
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
           <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg">{editing.id ? 'Editar Produto' : 'Novo Produto'}</h3>
                 <button onClick={() => setEditing(null)}><X size={24} className="text-slate-400"/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                 <div className="flex justify-center mb-4">
                    <div className="w-32 h-32 bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 relative group">
                        {formData.imageUrl ? (
                            <img src={formData.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <ImageIcon size={32}/>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <span className="text-white text-xs font-bold flex items-center gap-1"><Upload size={14}/> Alterar</span>
                        </div>
                    </div>
                 </div>
                 
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Imagem</label>
                    <div className="flex gap-2 mt-1">
                        <input className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="URL da imagem ou upload" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600"><Upload size={20}/></button>
                    </div>
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
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-full shadow-sm mb-6 relative">
          <Bot size={64} className="text-indigo-600" />
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full border-4 border-slate-50">
              <AlertTriangle size={20} fill="currentColor" />
          </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3">Bot de WhatsApp em Desenvolvimento</h2>
      <p className="text-slate-500 max-w-md text-base leading-relaxed mb-8">
          Estamos trabalhando para trazer uma automação completa de vendas via WhatsApp API Oficial. 
          <br/><br/>
          Por enquanto, gerencie seus pedidos manualmente através do painel de Pedidos.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold">
          <Sparkles size={16}/> Novidades em breve
      </div>
    </div>
  );
};

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
  const openNew = () => { setEditing({} as Client); setFormData({ clientType: activeTab, status: 'potential', address: { street: '', number: '', neighborhood: '', city: '', zip: '' } }); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div><h2 className="text-2xl font-bold text-slate-800">Gerenciar Clientes</h2></div>
        <div className="flex gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}><List size={18}/></button>
            </div>
            <PrimaryButton onClick={openNew}><Plus size={18} /> Novo Cliente</PrimaryButton>
        </div>
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
             <div className="flex justify-between mb-6">
                 <h3 className="font-bold text-lg text-slate-800">{editing.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                 <button onClick={()=>setEditing(null)}><X className="text-slate-400 hover:text-slate-600"/></button>
             </div>
             <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                        <select 
                            className="w-full p-2 border rounded-lg mt-1" 
                            value={formData.clientType || activeTab} 
                            onChange={e => setFormData({...formData, clientType: e.target.value as ClientType})}
                        >
                            <option value="common">Consumidor Final</option>
                            <option value="commercial">Ponto Comercial (B2B)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                        <select 
                            className="w-full p-2 border rounded-lg mt-1" 
                            value={formData.status || 'potential'} 
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                            disabled={formData.clientType === 'common'}
                        >
                            <option value="potential">Potencial</option>
                            <option value="negotiation">Em Negociação</option>
                            <option value="converted">Convertido</option>
                            <option value="active">Ativo</option>
                            <option value="loyal">Fidelizado</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome / Razão Social</label>
                    <input className="w-full p-2 border rounded-lg mt-1" value={formData.name || ''} onChange={e=>setFormData({...formData, name: e.target.value})} required/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <input type="email" className="w-full p-2 border rounded-lg mt-1" value={formData.email || ''} onChange={e=>setFormData({...formData, email: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Telefone (WhatsApp)</label>
                        <input className="w-full p-2 border rounded-lg mt-1" value={formData.phone || ''} onChange={e=>setFormData({...formData, phone: e.target.value})} required/>
                    </div>
                </div>

                {formData.clientType === 'commercial' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Responsável</label>
                                <input className="w-full p-2 border rounded-lg mt-1 bg-white" value={formData.contactPerson || ''} onChange={e=>setFormData({...formData, contactPerson: e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Potencial de Compra (R$)</label>
                                <input type="number" className="w-full p-2 border rounded-lg mt-1 bg-white" value={formData.purchasePotential || ''} onChange={e=>setFormData({...formData, purchasePotential: parseFloat(e.target.value)})}/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Anotações</label>
                            <textarea className="w-full p-2 border rounded-lg mt-1 bg-white" rows={2} value={formData.notes || ''} onChange={e=>setFormData({...formData, notes: e.target.value})}/>
                        </div>
                    </div>
                )}

                <div className="border-t pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Endereço</label>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                        <input className="w-full p-2 border rounded-lg" placeholder="Rua" value={formData.address?.street || ''} onChange={e=>setFormData({...formData, address: {...formData.address, street: e.target.value} as any})}/>
                        <input className="w-full p-2 border rounded-lg" placeholder="Número" value={formData.address?.number || ''} onChange={e=>setFormData({...formData, address: {...formData.address, number: e.target.value} as any})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input className="w-full p-2 border rounded-lg" placeholder="Bairro" value={formData.address?.neighborhood || ''} onChange={e=>setFormData({...formData, address: {...formData.address, neighborhood: e.target.value} as any})}/>
                        <input className="w-full p-2 border rounded-lg" placeholder="Cidade" value={formData.address?.city || ''} onChange={e=>setFormData({...formData, address: {...formData.address, city: e.target.value} as any})}/>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={()=>setEditing(null)} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">Salvar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-slate-800 truncate pr-2">{client.name}</h4>
                                    {client.clientType === 'commercial' && (
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${CLIENT_STATUSES[client.status || 'potential']?.color || 'bg-gray-100 text-gray-500'}`}>
                                            {CLIENT_STATUSES[client.status || 'potential']?.label}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(client)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-full"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDelete(client.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400"/>
                                    <span>{client.phone}</span>
                                    <button onClick={() => openWhatsApp(client.phone, '')} className="text-emerald-500 hover:text-emerald-600"><MessageCircle size={14}/></button>
                                </div>
                                {client.address?.street && (
                                    <div className="flex items-start gap-2">
                                        <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0"/>
                                        <span className="line-clamp-1">{client.address.street}, {client.address.number} - {client.address.neighborhood}</span>
                                    </div>
                                )}
                                {client.clientType === 'commercial' && client.contactPerson && (
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={14} className="text-slate-400"/>
                                        <span>Resp: {client.contactPerson}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {client.name}
                                        {client.clientType === 'commercial' && <div className="text-xs text-slate-400 font-normal">{client.contactPerson}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        <div>{client.phone}</div>
                                        <div className="text-xs">{client.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {client.clientType === 'commercial' ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${CLIENT_STATUSES[client.status || 'potential']?.color}`}>
                                                {CLIENT_STATUSES[client.status || 'potential']?.label}
                                            </span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => openWhatsApp(client.phone, '')} className="text-emerald-500 hover:bg-emerald-50 p-2 rounded"><MessageCircle size={16}/></button>
                                        <button onClick={() => openEdit(client)} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {filteredClients.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-400">Nenhum cliente encontrado nesta categoria.</p>
                </div>
            )}
        </>
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

  const updateStatus = async (orderId: string, newStatus: string) => {
      try {
          await updateDoc(doc(db, `merchants/${user.uid}/orders`, orderId), { status: newStatus });
      } catch (e) {
          alert("Erro ao atualizar status");
      }
  };

  const statusColors: any = {
      'new': 'bg-blue-100 text-blue-700 border-blue-200',
      'processing': 'bg-amber-100 text-amber-700 border-amber-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200'
  };

  return (
      <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h2 className="text-2xl font-bold">Pedidos</h2></div>
          {loading ? <LoadingSpinner /> : (
            <div className="grid gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between md:justify-start items-center gap-4 mb-2">
                                <span className="font-bold text-slate-900">#{order.id.slice(0, 8)}</span>
                                <span className="font-bold text-indigo-600">R$ {order.total.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium mb-1">{order.customerName}</p>
                            <p className="text-xs text-slate-400 mb-3">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Data inválida'}</p>
                            <div className="text-sm text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg">
                                {order.items.map((i, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{i.quantity}x {i.productName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col justify-center items-end gap-2 min-w-[200px]">
                            <label className="text-xs font-bold text-slate-400 uppercase">Status do Pedido</label>
                            <select 
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                className={`p-2 rounded-lg text-sm font-bold border outline-none cursor-pointer w-full transition-colors ${statusColors[order.status] || 'bg-slate-100'}`}
                            >
                                <option value="new">Novo Pedido</option>
                                <option value="processing">Em Preparo</option>
                                <option value="completed">Concluído / Entregue</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                            {order.deliveryAddress && (
                                <div className="text-right text-xs text-slate-500 mt-2 max-w-[200px]">
                                    <p className="truncate">{order.deliveryAddress.street}, {order.deliveryAddress.number}</p>
                                    <p>{order.deliveryAddress.neighborhood}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <p className="text-center text-slate-400 py-10">Nenhum pedido recebido ainda.</p>}
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
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string, imageUrl?: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [assigningImage, setAssigningImage] = useState<string | null>(null);
  const [targetProduct, setTargetProduct] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch products for dropdown assignment
  useEffect(() => {
    if (user) {
        const q = query(collection(db, `merchants/${user.uid}/products`));
        getDocs(q).then(snapshot => {
            const items: Product[] = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Product));
            setProducts(items);
        });
    }
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, assigningImage]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMsg = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      // Check if user wants an image
      const lowerInput = input.toLowerCase();
      const isImageRequest = lowerInput.includes('imagem') || lowerInput.includes('foto') || lowerInput.includes('desenhe') || lowerInput.includes('crie um');

      if (isImageRequest) {
          const response = await genAI.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: input }] }
          });
          
          let imageUrl = '';
          let text = '';

          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                } else if (part.text) {
                    text += part.text;
                }
            }
          }
          
          setMessages(prev => [...prev, { role: 'model', text: text || "Aqui está sua imagem:", imageUrl: imageUrl }]);
      } else {
          // Standard Text Chat
          const history = messages.filter(m => !m.imageUrl).map(m => ({
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
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Erro ao conectar com a IA. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const assignImageToProduct = async () => {
      if (!assigningImage || !targetProduct) return;
      
      try {
          await updateDoc(doc(db, `merchants/${user.uid}/products`, targetProduct), {
              imageUrl: assigningImage
          });
          setMessages(prev => [...prev, { role: 'model', text: 'Imagem atualizada no produto com sucesso!' }]);
          setAssigningImage(null);
          setTargetProduct('');
      } catch (e) {
          alert("Erro ao salvar imagem no produto.");
      }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 group animate-in fade-in zoom-in"
      >
        {isOpen ? <X size={24}/> : (
            <div className="relative">
                <Bot size={28} className="animate-pulse"/>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
            </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
           <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold">
                 <Bot size={20}/> Nova IA
              </div>
              <button onClick={() => setIsOpen(false)}><X size={18} className="opacity-70 hover:opacity-100"/></button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative" ref={scrollRef}>
              {messages.length === 0 && (
                  <div className="text-center text-slate-400 mt-10">
                      <Sparkles size={32} className="mx-auto mb-2 text-indigo-300"/>
                      <p className="text-sm">Olá! Posso ajudar com vendas, ideias ou <span className="font-bold text-indigo-500">criar imagens</span> para seus produtos.</p>
                  </div>
              )}
              {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {m.text && (
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm mb-1 ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-sm'}`}>
                              {m.text}
                          </div>
                      )}
                      {m.imageUrl && (
                          <div className="max-w-[85%] rounded-lg overflow-hidden border border-slate-200 shadow-sm mt-1 bg-white p-2">
                              <img src={m.imageUrl} alt="Generated" className="w-full h-auto rounded" />
                              <div className="flex gap-2 mt-2">
                                  <a href={m.imageUrl} download="produto-ia.png" className="flex-1 text-center py-1 bg-slate-100 text-xs text-indigo-600 font-bold hover:bg-slate-200 rounded">Baixar</a>
                                  <button onClick={() => setAssigningImage(m.imageUrl || null)} className="flex-1 py-1 bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 rounded">Usar em Produto</button>
                              </div>
                          </div>
                      )}
                  </div>
              ))}
              {loading && (
                  <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                          <Loader2 size={16} className="animate-spin text-indigo-500"/>
                      </div>
                  </div>
              )}

              {/* Assignment Overlay */}
              {assigningImage && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 animate-in fade-in">
                      <h4 className="font-bold text-slate-800 mb-4 text-center">Onde salvar esta imagem?</h4>
                      <div className="w-24 h-24 mb-4 rounded border shadow-sm overflow-hidden">
                          <img src={assigningImage} className="w-full h-full object-cover"/>
                      </div>
                      <select 
                        className="w-full p-2 border rounded-lg text-sm mb-4"
                        value={targetProduct}
                        onChange={(e) => setTargetProduct(e.target.value)}
                      >
                          <option value="">Selecione um produto...</option>
                          {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                      </select>
                      <div className="flex gap-2 w-full">
                          <button onClick={() => setAssigningImage(null)} className="flex-1 py-2 text-slate-500 text-sm font-bold border rounded hover:bg-slate-50">Cancelar</button>
                          <button onClick={assignImageToProduct} disabled={!targetProduct} className="flex-1 py-2 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 disabled:opacity-50">Salvar</button>
                      </div>
                  </div>
              )}
           </div>
           
           <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex gap-2">
              <input 
                className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Digite algo ou peça uma imagem..."
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
    monthlyGoal: 20000,
    recentOrders: [] as Order[],
    lowStockProducts: [] as Product[],
    topProducts: [] as {name: string, count: number}[]
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

      // Orders Fetch
      const ordersQ = query(collection(db, `merchants/${user.uid}/orders`), orderBy('createdAt', 'desc'));
      const ordersSnap = await getDocs(ordersQ);
      
      let salesT = 0;
      let ordersT = 0;
      let monthlyRev = 0;
      const weeklyData = [0,0,0,0,0,0,0]; 
      const allOrders: Order[] = [];
      const productCounts: Record<string, number> = {};

      ordersSnap.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()); 
        const total = data.total || 0;
        const order = { id: doc.id, ...data } as Order;
        allOrders.push(order);

        // Count Products
        if (order.items) {
            order.items.forEach(item => {
                productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
            });
        }

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

      // Products Fetch (for low stock)
      const productsQ = query(collection(db, `merchants/${user.uid}/products`));
      const productsSnap = await getDocs(productsQ);
      const lowStock: Product[] = [];
      productsSnap.forEach(doc => {
          const p = {id: doc.id, ...doc.data()} as Product;
          if (p.stock < 5) lowStock.push(p);
      });

      // Clients Fetch
      const clientsQ = query(collection(db, `merchants/${user.uid}/clients`));
      const clientsSnap = await getDocs(clientsQ);
      let newClientsT = 0;
      clientsSnap.forEach(doc => {
          const data = doc.data();
          const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          if (date >= today) newClientsT++;
      });

      // Top Products Logic
      const sortedProducts = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({name, count}));

      setMetrics({
        salesToday: salesT,
        ordersToday: ordersT,
        newClientsToday: newClientsT,
        avgTicketToday: ordersT > 0 ? salesT / ordersT : 0,
        weeklySales: weeklyData,
        monthlyRevenue: monthlyRev,
        monthlyGoal: 20000,
        recentOrders: allOrders.slice(0, 5),
        lowStockProducts: lowStock,
        topProducts: sortedProducts
      });
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Olá, {user.displayName || 'Empreendedor'}</h2>
                <p className="text-slate-500 text-sm">Aqui está o resumo do seu negócio hoje.</p>
            </div>
            <div className="flex gap-2 text-xs font-bold bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded">Hoje: {new Date().toLocaleDateString()}</span>
            </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><DollarSign size={20}/></div>
                    <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1"><TrendingUp size={12}/> Vendas</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">R$ {metrics.salesToday.toFixed(2)}</h3>
                <p className="text-xs text-slate-400 mt-1">Total vendido hoje</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><ShoppingBag size={20}/></div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Pedidos</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{metrics.ordersToday}</h3>
                <p className="text-xs text-slate-400 mt-1">Pedidos realizados hoje</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={20}/></div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Clientes</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{metrics.newClientsToday}</h3>
                <p className="text-xs text-slate-400 mt-1">Novos clientes hoje</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><BarChart3 size={20}/></div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">Ticket Médio</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">R$ {metrics.avgTicketToday.toFixed(2)}</h3>
                <p className="text-xs text-slate-400 mt-1">Média por pedido</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6">Vendas da Semana</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                     <SimpleBarChart data={metrics.weeklySales} />
                </div>
                <div className="flex justify-between mt-4 text-xs text-slate-400 font-medium px-2">
                    <span>Há 7 dias</span>
                    <span>Hoje</span>
                </div>
            </div>

            {/* Top Products */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6">Mais Vendidos</h3>
                <div className="space-y-4">
                    {metrics.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{i+1}</span>
                                <span className="text-sm font-medium text-slate-700">{p.name}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-900">{p.count} un</span>
                        </div>
                    ))}
                    {metrics.topProducts.length === 0 && <p className="text-slate-400 text-sm">Sem dados ainda.</p>}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-amber-500"/> Estoque Baixo</h3>
                    <div className="space-y-3">
                         {metrics.lowStockProducts.slice(0, 3).map(p => (
                             <div key={p.id} className="flex justify-between items-center text-sm">
                                 <span className="text-slate-600 truncate max-w-[150px]">{p.name}</span>
                                 <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-bold">{p.stock} restam</span>
                             </div>
                         ))}
                         {metrics.lowStockProducts.length === 0 && <p className="text-emerald-500 text-sm font-medium flex items-center gap-1"><CheckCircle2 size={14}/> Estoque saudável</p>}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const Dashboard = ({ user, logout }: { user: User, logout: () => void }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Visão Geral', exact: true },
    { path: '/dashboard/orders', icon: <ShoppingBag size={20} />, label: 'Pedidos' },
    { path: '/dashboard/products', icon: <Package size={20} />, label: 'Produtos' },
    { path: '/dashboard/clients', icon: <Users size={20} />, label: 'Clientes' },
    { path: '/dashboard/store', icon: <Store size={20} />, label: 'Minha Loja' },
    { path: '/dashboard/whatsapp', icon: <MessageCircle size={20} />, label: 'WhatsApp Bot' },
  ];

  const isActive = (path: string, exact = false) => {
      if (exact) return location.pathname === path;
      return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
       {/* Mobile Sidebar Overlay */}
       {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

       {/* Sidebar */}
       <aside className={`fixed lg:sticky top-0 h-screen w-72 bg-white border-r border-slate-200 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <AppLogo collapsed={false} />
             <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={24}/></button>
          </div>
          
          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
              {menuItems.map(item => (
                  <button 
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive(item.path, item.exact) ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                      {item.icon}
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white">
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium">
                  <LogOut size={20}/> Sair
              </button>
          </div>
       </aside>

       {/* Main Content */}
       <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
           <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
               <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"><Menu size={24}/></button>
               
               <div className="flex-1"></div>

               <div className="flex items-center gap-4">
                   <a href={`/#/store/${user.uid}`} target="_blank" rel="noopener" className="hidden md:flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                       <ExternalLink size={14}/> Ver Loja Online
                   </a>
                   <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                       {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                   </div>
               </div>
           </header>
           
           <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
               <Routes>
                   <Route path="/" element={<DashboardHome user={user} />} />
                   <Route path="/products" element={<ProductsManager user={user} />} />
                   <Route path="/orders" element={<OrdersManager user={user} />} />
                   <Route path="/clients" element={<ClientsManager user={user} />} />
                   <Route path="/store" element={<StoreEditor user={user} />} />
                   <Route path="/whatsapp" element={<WhatsAppBot user={user} />} />
               </Routes>
               <AIAssistant user={user} />
           </div>
       </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/store/:id" element={<PublicStore />} />
        
        <Route path="/dashboard/*" element={
            user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;
