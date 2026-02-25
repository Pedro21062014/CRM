

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate, Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { auth, googleProvider, db, storage } from './firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User 
} from 'firebase/auth';

import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit, runTransaction, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import XLSX from 'xlsx-js-style';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type as TypeIcon, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag, MapPin, Clock, Star, History, Menu, Phone,
  Zap, Globe, ShieldCheck, BarChart3, Smartphone, CheckCircle2, TrendingUp, TrendingDown, DollarSign, PieChart, Sparkles, MessageSquare, Send, Minus, Briefcase, User as UserIcon, Calendar, ClipboardList,
  FileSpreadsheet, Download, Upload, Filter, Target, List, MessageCircle, Bot, QrCode, Play, StopCircle, MoreVertical, Paperclip, Smile, Key, AlertTriangle, GripVertical, AlertCircle, Trophy, Save, Cpu, Timer, Lock, Mail, Wand2, TicketPercent, Tag, Utensils, Navigation, Home, Shirt, Monitor, CreditCard
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus, ClientType, ClientStatus, WhatsAppConfig, Coupon, PaymentPlan, MerchantSubscription } from './types';
import { HeroSection, TextSection, ProductGridSection } from './components/StoreComponents';

// --- AI CONFIGURATION ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });

// --- Shared Components ---

const LoadingSpinner = () => (
  <div className="flex h-64 w-full items-center justify-center text-slate-400">
    <Loader2 className="animate-spin mr-2" size={32} />
    <span className="font-medium text-slate-500">Carregando...</span>
  </div>
);

// Hook para detectar Mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const AppLogo = ({ collapsed, dark = false }: { collapsed?: boolean, dark?: boolean }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 group cursor-pointer`}>
      <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-all duration-300 transform group-hover:scale-105 shrink-0">
        <Rocket size={20} strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div className="flex flex-col animate-in fade-in duration-300">
          <span className={`font-bold text-xl tracking-tight leading-none font-sans ${dark ? 'text-white' : 'text-slate-900'}`}>
            {isMobile ? (
               <>Nova <span className="text-indigo-500">CRM Mobile</span></>
            ) : (
               <>Nova<span className="text-indigo-500">CRM</span></>
            )}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Versão 3.1</span>
        </div>
      )}
    </div>
  );
};

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

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Security: Check file size (limit to 4MB)
    if (file.size > 4 * 1024 * 1024) {
        reject(new Error("A imagem deve ter no máximo 4MB."));
        return;
    }
    
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

// Haversine formula to calculate distance in KM
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- CHARTS ---
// ... [CouponsManager, ProductsManager, WhatsAppBot, ClientsManager, OrdersManager remain unchanged] ...
const CouponsManager = ({ user }: { user: User }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({});

  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/coupons`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Coupon[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Coupon));
      setCoupons(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: (formData.code || '').toUpperCase().trim(),
        type: formData.type || 'percentage',
        value: parseFloat(String(formData.value || 0)),
        minPurchase: parseFloat(String(formData.minPurchase || 0)),
        active: formData.active !== false, // default true
        usageCount: formData.usageCount || 0,
        updatedAt: serverTimestamp()
      };

      if (!payload.code) {
        alert("O código do cupom é obrigatório.");
        return;
      }

      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/coupons`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/coupons`), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setEditing(null);
      setFormData({});
    } catch (err: any) {
      alert(`Erro ao salvar cupom: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este cupom permanentemente?")) {
      await deleteDoc(doc(db, `merchants/${user.uid}/coupons`, id));
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    await updateDoc(doc(db, `merchants/${user.uid}/coupons`, coupon.id), {
      active: !coupon.active
    });
  };

  const openNew = () => {
    setEditing({} as Coupon);
    setFormData({ type: 'percentage', active: true, value: 10 });
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setFormData(coupon);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Cupons</h2>
          <p className="text-slate-500 text-sm">Crie códigos de desconto para seus clientes.</p>
        </div>
        <PrimaryButton onClick={openNew}><Plus size={18}/> Novo Cupom</PrimaryButton>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">{editing.id ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                <button onClick={() => setEditing(null)}><X size={24} className="text-slate-400"/></button>
             </div>
             <form onSubmit={handleSave} className="space-y-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Código do Cupom</label>
                   <input 
                      required 
                      className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono tracking-wider" 
                      placeholder="EX: PROMO10"
                      value={formData.code || ''} 
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                      <select 
                        className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.type || 'percentage'}
                        onChange={e => setFormData({...formData, type: e.target.value as any})}
                      >
                         <option value="percentage">Porcentagem (%)</option>
                         <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        required
                        className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.value || ''}
                        onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                      />
                   </div>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Pedido Mínimo (R$)</label>
                   <input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="0.00"
                      value={formData.minPurchase || ''} 
                      onChange={e => setFormData({...formData, minPurchase: parseFloat(e.target.value)})} 
                   />
                   <p className="text-[10px] text-slate-400 mt-1">Deixe 0 para não ter mínimo.</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   <input 
                      type="checkbox" 
                      id="activeCheck"
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.active !== false}
                      onChange={e => setFormData({...formData, active: e.target.checked})}
                   />
                   <label htmlFor="activeCheck" className="text-sm font-bold text-slate-700">Cupom Ativo</label>
                </div>
                
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>
                    <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Salvar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner/> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {coupons.map(coupon => (
              <div key={coupon.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${coupon.active ? 'border-indigo-100' : 'border-slate-200 bg-slate-50'} relative group`}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${coupon.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                          <TicketPercent size={20}/>
                       </div>
                       <div>
                          <h3 className="font-bold text-lg text-slate-800 tracking-wide font-mono">{coupon.code}</h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                             {coupon.active ? 'Ativo' : 'Inativo'}
                          </span>
                       </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEdit(coupon)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"><Edit2 size={16}/></button>
                       <button onClick={() => handleDelete(coupon.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                    </div>
                 </div>
                 
                 <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Desconto:</span>
                       <span className="font-bold text-slate-700">
                          {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value.toFixed(2)} OFF`}
                       </span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Pedido Mínimo:</span>
                       <span className="font-bold text-slate-700">
                          {coupon.minPurchase ? `R$ ${coupon.minPurchase.toFixed(2)}` : 'Sem mínimo'}
                       </span>
                    </div>
                    <div className="flex justify-between text-sm">
                       <span className="text-slate-500">Usos:</span>
                       <span className="font-bold text-slate-700">{coupon.usageCount}</span>
                    </div>
                 </div>

                 <button 
                    onClick={() => toggleStatus(coupon)}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${coupon.active ? 'bg-white border border-red-200 text-red-500 hover:bg-red-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                 >
                    {coupon.active ? 'Desativar Cupom' : 'Ativar Cupom'}
                 </button>
              </div>
           ))}
           {coupons.length === 0 && (
             <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <TicketPercent size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-medium">Nenhum cupom criado.</p>
                <button onClick={openNew} className="text-indigo-600 font-bold hover:underline mt-2">Criar Primeiro Cupom</button>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const ProductsManager = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Derive unique categories from existing products for the datalist
  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  useEffect(() => {
    // Sort locally by orderIndex to ensure visual consistency
    const q = query(collection(db, `merchants/${user.uid}/products`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Product));
      // Sort by orderIndex
      items.sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
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
      
      // Calculate next order index if new
      const nextIndex = products.length > 0 
        ? Math.max(...products.map(p => p.orderIndex || 0)) + 1 
        : 0;

      const payload = {
        name: formData.name || 'Produto Sem Nome',
        price: isNaN(priceVal) ? 0 : Math.abs(priceVal), // Ensure positive
        description: formData.description || '',
        category: formData.category || 'Geral',
        imageUrl: formData.imageUrl || '',
        stock: isNaN(stockVal) ? 0 : Math.abs(stockVal),
        updatedAt: serverTimestamp()
      };

      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/products`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/products`), {
          ...payload,
          orderIndex: nextIndex,
          createdAt: serverTimestamp()
        });
      }
      setEditing(null);
      setFormData({});
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar produto: ${err.message || 'Verifique sua conexão'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await convertFileToBase64(file);
        setFormData({ ...formData, imageUrl: base64 });
      } catch (error: any) {
        alert(error.message || "Erro ao processar imagem.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este produto?")) {
      await deleteDoc(doc(db, `merchants/${user.uid}/products`, id));
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItem(index);
      // Required for Firefox to allow drag
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, _index?: number) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedItem === null || draggedItem === dropIndex) return;

      const newProducts = [...products];
      const [removed] = newProducts.splice(draggedItem, 1);
      newProducts.splice(dropIndex, 0, removed);

      // Optimistic Update
      setProducts(newProducts);
      setDraggedItem(null);

      // Batch Update in Background
      try {
          const batch = writeBatch(db);
          newProducts.forEach((prod, index) => {
              // Only update if index changed to save writes
              if (prod.orderIndex !== index) {
                  const ref = doc(db, `merchants/${user.uid}/products`, prod.id);
                  batch.update(ref, { orderIndex: index });
              }
          });
          await batch.commit();
      } catch (error) {
          console.error("Failed to reorder:", error);
          alert("Erro ao salvar a nova ordem dos produtos.");
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Produtos</h2>
          <p className="text-slate-500 text-sm">Arraste os produtos para mudar a ordem na loja.</p>
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
                        <input required type="number" step="0.01" min="0" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Estoque</label>
                        <input type="number" min="0" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <div className="relative mt-1">
                        <input 
                            list="categories-list"
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder="Selecione ou digite uma nova..." 
                            value={formData.category || ''} 
                            onChange={e => setFormData({...formData, category: e.target.value})} 
                        />
                        <datalist id="categories-list">
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Digite para criar uma nova categoria ou selecione da lista.</p>
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
          {products.map((product, index) => (
            <div 
                key={product.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-all cursor-move ${draggedItem === index ? 'opacity-50 ring-2 ring-indigo-500 ring-offset-2' : ''}`}
            >
               <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img src={product.imageUrl || `https://picsum.photos/400/300?random=${product.id}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                  
                  {/* Grip Icon for affordance */}
                  <div className="absolute top-2 left-2 p-1 bg-black/30 text-white rounded backdrop-blur-sm opacity-50 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={16}/>
                  </div>

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
    } catch (err: any) {
      alert(`Erro ao salvar cliente: ${err.message || 'Verifique sua conexão'}`);
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

  const handleDeleteOrder = async (orderId: string) => {
      if (confirm("Tem certeza que deseja excluir este pedido?")) {
          try {
            await deleteDoc(doc(db, `merchants/${user.uid}/orders`, orderId));
          } catch (e) {
            alert("Erro ao excluir pedido.");
          }
      }
  };

  const statusColors: any = {
      'new': 'bg-blue-100 text-blue-700 border-blue-200',
      'processing': 'bg-amber-100 text-amber-700 border-amber-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200'
  };

  return (
      <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h2 className="text-2xl font-bold">Pedidos</h2></div>
          {loading ? <LoadingSpinner /> : (
            <div className="grid gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4 relative group">
                        {/* Delete Button (Absolute on Desktop, visible on hover) */}
                        <button 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
                            title="Excluir Pedido"
                        >
                            <Trash2 size={18}/>
                        </button>

                        <div className="flex-1 pr-10">
                            <div className="flex justify-between md:justify-start items-center gap-4 mb-2">
                                <span className="font-bold text-slate-900">#{order.id.slice(0, 8)}</span>
                                <div className="flex flex-col">
                                   <span className="font-bold text-indigo-600">R$ {order.total.toFixed(2)}</span>
                                   {order.discount && order.discount > 0 && (
                                     <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">
                                        Desc. R$ {order.discount.toFixed(2)} {order.couponCode ? `(${order.couponCode})` : ''}
                                     </span>
                                   )}
                                </div>
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
    themeColor: '#4f46e5', // Changed from red to Indigo for general purpose
    sections: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  
  // NEW STATE for Address Search
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  // NEW STATE for GPS Button Loading
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

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
            description: 'Os melhores produtos para você!',
            themeColor: '#4f46e5',
            sections: [{ id: '2', type: 'products', title: 'Destaques', backgroundColor: '#ffffff' }]
          });
        }
        
        const pQuery = query(collection(db, `merchants/${user.uid}/products`));
        const pSnap = await getDocs(pQuery);
        const pList: Product[] = [];
        pSnap.forEach(d => pList.push({id: d.id, ...d.data()} as Product));
        setProducts(pList);
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

  const togglePublish = async () => {
    const newStatus = !config.isPublished;
    const newConfig = { ...config, isPublished: newStatus };
    setConfig(newConfig);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'merchants', user.uid), { storeConfig: newConfig });
    } catch (e) {
      await setDoc(doc(db, 'merchants', user.uid), { storeConfig: newConfig }, { merge: true });
    }
    setSaving(false);
    alert(newStatus ? 'Loja publicada com sucesso!' : 'Loja despublicada com sucesso!');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingBanner(true);

    try {
      const fileRef = ref(storage, `merchants/${user.uid}/store/${type}_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      
      if (type === 'logo') {
        setConfig(prev => ({ ...prev, logoUrl: url }));
      } else {
        setConfig(prev => ({ ...prev, bannerUrl: url }));
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Erro ao fazer upload da imagem.`);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Try Reverse Geocoding to get actual address
        try {
            // Using OpenStreetMap Nominatim API for reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            
            setConfig({
                ...config,
                latitude: lat,
                longitude: lon,
                fullAddress: data.display_name // Use the address returned by API
            });
        } catch (error) {
            console.error("Reverse geocoding failed", error);
            // Fallback: just coords
            setConfig({
                ...config,
                latitude: lat,
                longitude: lon,
                fullAddress: `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`
            });
        } finally {
            setLoadingLocation(false);
        }
      },
      (error) => {
        alert("Erro ao obter localização. Verifique as permissões.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };
  
  const searchAddress = async () => {
      if (!addressQuery.trim()) return;
      setSearchingAddress(true);
      try {
          // Using Nominatim (OpenStreetMap) Geocoding API
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
          const data = await response.json();
          setAddressResults(data);
      } catch (error) {
          console.error("Error fetching address:", error);
          alert("Erro ao buscar endereço.");
      } finally {
          setSearchingAddress(false);
      }
  };
  
  const selectAddress = (result: any) => {
      setConfig({
          ...config,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          fullAddress: result.display_name
      });
      setAddressResults([]); // Clear results after selection
      setAddressQuery(''); // Optional: clear query
  };

  const addSection = (type: 'hero' | 'products' | 'text') => {
    const newSection: StoreSection = {
      id: Date.now().toString(),
      type,
      title: type === 'hero' ? 'Novo Banner' : type === 'products' ? 'Nossos Produtos' : 'Nova Seção de Texto',
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

  const handleSmartOrganize = async () => {
    if (products.length === 0) {
      alert("Você precisa cadastrar produtos primeiro para o Bot organizar sua loja!");
      return;
    }

    if (!confirm("A Inteligência Artificial irá analisar seus produtos e recriar o design da loja. O layout atual será substituído. Continuar?")) return;

    setAiLoading(true);

    try {
      const productSummary = products
        .map(p => `${p.name} (${p.category || 'Geral'})`)
        .slice(0, 30) // Limit context
        .join(', ');

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: `
          Você é um especialista em Visual Merchandising e Web Design para e-commerce.
          Analise esta lista de produtos de uma loja de varejo: "${productSummary}".

          Gere um arquivo JSON de configuração para montar uma loja virtual atraente.
          
          Regras:
          1. Escolha uma 'themeColor' (hex) que combine com os produtos (ex: azul para eletrônicos, preto para moda, verde para natural).
          2. Crie um 'heroTitle' curto e impactante.
          3. Crie um 'heroSubtitle' convidativo.
          4. Crie um 'marketingTitle' para uma seção de diferenciais.
          5. Crie um 'marketingContent' com 2 frases vendendo a loja.
          6. Liste até 4 'categories' principais encontradas ou sugeridas para agrupar os produtos.

          Responda APENAS o JSON no formato:
          {
            "themeColor": string,
            "heroTitle": string,
            "heroSubtitle": string,
            "marketingTitle": string,
            "marketingContent": string,
            "categories": string[]
          }
        `,
        config: {
            responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Falha na resposta da IA");
      const data = JSON.parse(text);

      const newSections: StoreSection[] = [];

      // 1. Hero
      newSections.push({
        id: Date.now().toString() + 'hero',
        type: 'hero',
        title: data.heroTitle,
        content: data.heroSubtitle,
        backgroundColor: data.themeColor,
        textColor: '#ffffff'
      });

      // 2. Products by Category
      if (data.categories && Array.isArray(data.categories)) {
          data.categories.forEach((cat: string, i: number) => {
              newSections.push({
                  id: Date.now().toString() + 'cat' + i,
                  type: 'products',
                  title: cat,
                  filterCategory: cat, 
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                  textColor: '#1e293b'
              });
          });
      } else {
          // Fallback if no categories returned
          newSections.push({
              id: Date.now().toString() + 'prod_all',
              type: 'products',
              title: 'Nossos Produtos',
              backgroundColor: '#ffffff'
          });
      }

      // 3. Marketing
      newSections.push({
        id: Date.now().toString() + 'mkt',
        type: 'text',
        title: data.marketingTitle,
        content: data.marketingContent,
        backgroundColor: data.themeColor,
        textColor: '#ffffff'
      });

      setConfig(prev => ({
          ...prev,
          themeColor: data.themeColor,
          sections: newSections
      }));

    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o cérebro da IA. Verifique se você tem produtos cadastrados ou tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItem(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, _index?: number) => {
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
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button 
             onClick={handleSmartOrganize}
             disabled={aiLoading}
             className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-lg hover:from-indigo-600 hover:to-violet-600 shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-70 animate-in fade-in"
          >
             {aiLoading ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16} fill="currentColor" className="text-indigo-100"/>}
             {aiLoading ? 'Organizando...' : 'Organizador Inteligente'}
          </button>
          
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none justify-center px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
            <ExternalLink size={14} /> Ver Loja
          </a>
          <button onClick={togglePublish} disabled={saving} className={`flex-1 md:flex-none px-4 py-2 text-white font-medium rounded-lg shadow-md transition-all text-sm ${config.isPublished ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-600 hover:bg-slate-700'}`}>
            {saving ? 'Aguarde...' : config.isPublished ? 'Loja Publicada (Ocultar)' : 'Publicar Loja'}
          </button>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Logo da Loja</label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden">
                                {config.logoUrl ? (
                                    <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        {uploadingLogo ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                                        <span className="text-[10px] mt-1 font-medium">{uploadingLogo ? 'Enviando...' : 'Upload Logo'}</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} disabled={uploadingLogo} />
                            </label>
                            {config.logoUrl && (
                                <button onClick={() => setConfig({...config, logoUrl: undefined})} className="text-[10px] text-red-500 font-bold mt-1 hover:underline w-full text-center">Remover Logo</button>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Capa (Banner)</label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden">
                                {config.bannerUrl ? (
                                    <img src={config.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        {uploadingBanner ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                                        <span className="text-[10px] mt-1 font-medium">{uploadingBanner ? 'Enviando...' : 'Upload Capa'}</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} disabled={uploadingBanner} />
                            </label>
                            {config.bannerUrl && (
                                <button onClick={() => setConfig({...config, bannerUrl: undefined})} className="text-[10px] text-red-500 font-bold mt-1 hover:underline w-full text-center">Remover Capa</button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria Principal</label>
                        <select 
                            className="w-full p-2 border rounded-lg mt-1 text-sm bg-white" 
                            value={config.category || ''} 
                            onChange={e => setConfig({...config, category: e.target.value})}
                        >
                           <option value="">Selecione uma categoria...</option>
                           <option value="Eletrônicos">Eletrônicos</option>
                           <option value="Moda">Moda</option>
                           <option value="Casa">Casa</option>
                           <option value="Beleza">Beleza</option>
                           <option value="Serviços">Serviços</option>
                           <option value="Alimentação">Alimentação</option>
                           <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                        <input className="w-full p-2 border rounded-lg mt-1 text-sm" value={config.description || ''} onChange={e => setConfig({...config, description: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><MessageCircle size={12}/> WhatsApp</label>
                         <input className="w-full p-2 border border-emerald-100 rounded-lg mt-1 text-sm" placeholder="Ex: 5511999999999" value={config.whatsapp || ''} onChange={e => setConfig({...config, whatsapp: e.target.value})} />
                    </div>
                    
                    {/* ADDRESS SELECTOR WITH NOMINATIM */}
                    <div className="border-t pt-4 mt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-1"><MapPin size={12}/> Localização da Loja</label>
                        
                        {config.fullAddress ? (
                            <div className="bg-slate-50 p-2 rounded-lg border text-xs mb-2">
                                <p className="font-bold text-slate-700">{config.fullAddress}</p>
                                <p className="text-slate-400 mt-1">Lat: {config.latitude?.toFixed(5)}, Lon: {config.longitude?.toFixed(5)}</p>
                                <button onClick={() => setConfig({...config, fullAddress: undefined, latitude: undefined, longitude: undefined})} className="text-red-500 text-[10px] font-bold mt-1 hover:underline">Alterar Endereço</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 p-2 border rounded-lg text-xs" 
                                        placeholder="Digite o endereço (Rua, Cidade...)" 
                                        value={addressQuery}
                                        onChange={e => setAddressQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && searchAddress()}
                                    />
                                    <button 
                                        onClick={searchAddress}
                                        disabled={searchingAddress}
                                        className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                                    >
                                        {searchingAddress ? <Loader2 size={16} className="animate-spin"/> : <Search size={16}/>}
                                    </button>
                                </div>
                                
                                {addressResults.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto border rounded-lg bg-white shadow-sm scrollbar-thin scrollbar-thumb-slate-200">
                                        {addressResults.map((result: any, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => selectAddress(result)}
                                                className="p-2 text-xs border-b last:border-0 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            >
                                                {result.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <button 
                                    onClick={getMyLocation}
                                    disabled={loadingLocation}
                                    className="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                                >
                                    {loadingLocation ? <Loader2 size={14} className="animate-spin"/> : <MapPin size={14}/>}
                                    {loadingLocation ? 'Buscando Localização...' : 'Usar Localização Atual (GPS)'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cor do Tema</label>
                        <div className="flex gap-2 mt-1">
                             <input type="color" className="w-10 h-10 border rounded cursor-pointer" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
                             <div className="flex-1 flex items-center text-xs text-slate-500">Cor principal da sua loja</div>
                        </div>
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
                                        {/* Filter for Product Grid */}
                                        {s.type === 'products' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Filtrar por Categoria</label>
                                                <input 
                                                    list="cat-filter-list"
                                                    className="w-full p-2 border rounded text-xs bg-white mt-1" 
                                                    value={s.filterCategory || ''} 
                                                    onChange={e => updateSection(s.id, {filterCategory: e.target.value})} 
                                                    placeholder="Todas as categorias"
                                                />
                                                <datalist id="cat-filter-list">
                                                    {Array.from(new Set(products.map(p => p.category))).map(c => (
                                                        <option key={c} value={c} />
                                                    ))}
                                                </datalist>
                                                <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para mostrar tudo.</p>
                                            </div>
                                        )}

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
            
            <div className="w-full max-w-[480px] h-[80vh] max-h-[700px] bg-white rounded-[40px] shadow-2xl border-[8px] border-slate-800 overflow-hidden relative flex flex-col mx-auto">
                {/* Phone Top Bar */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-gray-50 pb-10">
                    {/* Header Preview */}
                    <div className="bg-white pb-4 shadow-sm relative">
                        <div className="h-24 w-full bg-cover bg-center" style={{ 
                            backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #4f46e5, #7c3aed)',
                            backgroundColor: config.themeColor 
                        }}></div>
                        <div className="px-4 -mt-8 flex flex-col items-center gap-3 relative z-10 text-center">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white shadow overflow-hidden">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{color: config.themeColor}}><Store size={24}/></div>}
                            </div>
                            <div className="pt-1">
                                <h1 className="font-bold text-slate-800 text-sm leading-tight">{config.storeName}</h1>
                                <p className="text-slate-500 text-[10px] mt-0.5">{config.description}</p>
                                {config.category && <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase tracking-wider">{config.category}</span>}
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
                                        products={products} // Pass ALL products, the component filters internally
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

const Marketplace = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<{id: string, config: StoreConfig, distance?: number}[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "merchants"));
                const items: {id: string, config: StoreConfig}[] = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.storeConfig && data.storeConfig.storeName) {
                        items.push({
                            id: doc.id,
                            config: data.storeConfig
                        });
                    }
                });
                
                setStores(items);
            } catch (error) {
                console.error("Error fetching stores:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, []);

    const handleNearMe = () => {
        if (!navigator.geolocation) {
            alert("Seu navegador não suporta geolocalização.");
            return;
        }

        setLoadingLocation(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                setUserLocation({ latitude: userLat, longitude: userLng });

                setStores(prevStores => {
                    const storesWithDist = prevStores.map(store => {
                        let dist = undefined;
                        if (store.config.latitude && store.config.longitude) {
                            dist = getDistanceFromLatLonInKm(userLat, userLng, store.config.latitude, store.config.longitude);
                        }
                        return { ...store, distance: dist };
                    });

                    return storesWithDist.sort((a, b) => {
                        if (a.distance !== undefined && b.distance !== undefined) {
                            return a.distance - b.distance;
                        }
                        if (a.distance !== undefined) return -1;
                        if (b.distance !== undefined) return 1;
                        return 0;
                    });
                });
                setLoadingLocation(false);
            },
            (error) => {
                console.error("Error getting location", error);
                alert("Não foi possível obter sua localização. Verifique as permissões do navegador.");
                setLoadingLocation(false);
            }
        );
    };

    const filteredStores = stores.filter(store => {
        let matchesCategory = true;
        if (selectedCategory) {
            if (store.config.category) {
                matchesCategory = store.config.category.toLowerCase() === selectedCategory.toLowerCase();
            } else {
                matchesCategory = store.config.storeName.toLowerCase().includes(selectedCategory.toLowerCase()) || 
                                  !!(store.config.description && store.config.description.toLowerCase().includes(selectedCategory.toLowerCase()));
            }
        }

        const matchesSearch = store.config.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.config.description && store.config.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
        return matchesSearch && matchesCategory;
    });

    const categories = [
        { name: "Mercado", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=150&h=150&fit=crop" },
        { name: "Alimentação", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&h=150&fit=crop" },
        { name: "Farmácia", image: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=150&h=150&fit=crop" },
        { name: "Bebidas", image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=150&h=150&fit=crop" },
        { name: "Pet", image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=150&h=150&fit=crop" },
        { name: "Eletrônicos", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=150&h=150&fit=crop" },
        { name: "Moda", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=150&h=150&fit=crop" },
    ];
    
    const toggleCategory = (catName: string) => {
        if (selectedCategory === catName) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(catName);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
                    {/* Logo & Nav Links (Desktop) */}
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                             <div className="bg-red-600 text-white p-1.5 rounded-lg">
                                <Rocket size={24} fill="currentColor"/>
                             </div>
                             <span className="font-extrabold text-2xl tracking-tight text-red-600">Nova</span>
                        </div>
                        
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                            <button onClick={() => setSelectedCategory(null)} className={`${!selectedCategory ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Início</button>
                            <button onClick={() => setSelectedCategory('Alimentação')} className={`${selectedCategory === 'Alimentação' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Restaurantes</button>
                            <button onClick={() => setSelectedCategory('Mercado')} className={`${selectedCategory === 'Mercado' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Mercados</button>
                            <button onClick={() => setSelectedCategory('Bebidas')} className={`${selectedCategory === 'Bebidas' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Bebidas</button>
                            <button onClick={() => setSelectedCategory('Farmácia')} className={`${selectedCategory === 'Farmácia' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Farmácias</button>
                            <button onClick={() => setSelectedCategory('Pet')} className={`${selectedCategory === 'Pet' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Pets</button>
                            <button onClick={() => setSelectedCategory('Eletrônicos')} className={`${selectedCategory === 'Eletrônicos' ? 'text-red-600 font-bold' : 'hover:text-red-600 transition-colors'}`}>Shopping</button>
                        </nav>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-2xl hidden md:block relative">
                        <input 
                            type="text" 
                            placeholder="Busque por item ou loja" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-red-200 transition-all text-slate-700 font-medium placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <button 
                            onClick={handleNearMe}
                            disabled={loadingLocation}
                            className="hidden md:flex items-center gap-2 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <span className="text-sm font-medium truncate max-w-[200px]">
                                {loadingLocation ? 'Buscando...' : userLocation ? 'Sua localização atual' : 'Definir endereço'}
                            </span>
                            <ChevronDown size={16} className="text-red-500"/>
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <button className="text-slate-600 hover:text-red-600 transition-colors">
                                <UserIcon size={24} />
                            </button>
                            <button className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2">
                                <ShoppingBag size={24} />
                                <div className="hidden md:flex flex-col text-left">
                                    <span className="text-xs font-bold text-slate-800 leading-none">R$ 0,00</span>
                                    <span className="text-[10px] text-slate-500 leading-none mt-0.5">0 itens</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Search & Address (Visible only on small screens) */}
                <div className="md:hidden px-4 pb-3 space-y-3">
                    <button 
                        onClick={handleNearMe}
                        disabled={loadingLocation}
                        className="flex items-center justify-between w-full text-slate-700 bg-slate-100 px-3 py-2 rounded-lg"
                    >
                        <span className="text-sm font-medium truncate">
                            {loadingLocation ? 'Buscando...' : userLocation ? 'Sua localização atual' : 'Definir endereço de entrega'}
                        </span>
                        <ChevronDown size={16} className="text-red-500"/>
                    </button>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Busque por item ou loja" 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-red-200 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                
                {/* Últimas lojas (Recent Stores) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Últimas lojas</h2>
                        <button className="text-red-600 font-medium text-sm hover:underline">Ver mais</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                        {stores.slice(0, 4).map(store => (
                            <div key={`recent-${store.id}`} onClick={() => navigate(`/store/${store.id}`)} className="min-w-[280px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="w-14 h-14 rounded-full border border-slate-100 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                    {store.config.logoUrl ? (
                                        <img src={store.config.logoUrl} alt={store.config.storeName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Store size={20} className="text-slate-300"/>
                                    )}
                                </div>
                                <span className="font-bold text-slate-800 text-sm leading-tight">{store.config.storeName}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Famosos na NovaStore (Popular Stores) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Famosos na NovaStore</h2>
                        <button className="text-red-600 font-medium text-sm hover:underline">Ver mais</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar relative">
                        {stores.slice(0, 6).map(store => (
                            <div key={`famous-${store.id}`} onClick={() => navigate(`/store/${store.id}`)} className="min-w-[280px] md:min-w-[320px] bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="w-20 h-20 rounded-xl border border-slate-100 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                    {store.config.logoUrl ? (
                                        <img src={store.config.logoUrl} alt={store.config.storeName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Store size={28} className="text-slate-300"/>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{store.config.storeName}</h3>
                                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                                        <Star size={12} fill="currentColor" />
                                        <span>4.8</span>
                                        <span className="text-slate-400 font-normal ml-1">• {store.config.category || 'Variedades'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Categories Carousel */}
                <section>
                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                        {categories.map((cat, i) => (
                            <div 
                                key={i} 
                                onClick={() => toggleCategory(cat.name)}
                                className={`flex flex-col items-center gap-3 min-w-[100px] cursor-pointer transition-all group`}
                            >
                                <div className={`w-24 h-20 rounded-xl overflow-hidden shadow-sm transition-all relative ${selectedCategory === cat.name ? 'ring-2 ring-red-500 ring-offset-2' : 'group-hover:-translate-y-1'}`}>
                                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                    {/* Optional: Add a subtle gradient overlay if needed */}
                                </div>
                                <span className={`text-sm font-medium text-center ${selectedCategory === cat.name ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Store List (All Stores) */}
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-6">
                        {selectedCategory ? `Lojas de ${selectedCategory}` : 'Lojas na sua região'}
                    </h2>
                    
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 animate-pulse">
                                    <div className="w-20 h-20 bg-slate-200 rounded-full"></div>
                                    <div className="flex-1 space-y-3 py-2">
                                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStores.length > 0 ? filteredStores.map((store) => (
                                <div 
                                    key={store.id} 
                                    onClick={() => navigate(`/store/${store.id}`)}
                                    className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer group"
                                >
                                    {/* Store Logo */}
                                    <div className="w-20 h-20 rounded-full border border-slate-100 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50 relative">
                                        {store.config.logoUrl ? (
                                            <img src={store.config.logoUrl} className="w-full h-full object-cover" alt={store.config.storeName} />
                                        ) : (
                                            <Store size={28} className="text-slate-300"/>
                                        )}
                                        {store.distance !== undefined && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                                                {store.distance < 1 
                                                    ? `${(store.distance * 1000).toFixed(0)}m` 
                                                    : `${store.distance.toFixed(1)}km`}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Store Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 text-lg truncate pr-2 group-hover:text-red-600 transition-colors">{store.config.storeName}</h4>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mb-1">
                                            <Star size={12} fill="currentColor" />
                                            <span>4.8</span>
                                            <span className="text-slate-400 font-normal ml-1">• {store.config.category || 'Variedades'}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                                            <span>30-45 min</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span className="text-green-600 font-medium">Frete Grátis</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Search size={24}/>
                                    </div>
                                    <p className="text-slate-800 font-bold text-lg mb-1">
                                        {selectedCategory 
                                            ? `Nenhuma loja de ${selectedCategory}` 
                                            : "Nenhuma loja encontrada"}
                                    </p>
                                    <p className="text-sm text-slate-500">Tente buscar por outro termo ou limpe os filtros.</p>
                                    {selectedCategory && (
                                        <button onClick={() => setSelectedCategory(null)} className="mt-6 px-6 py-2.5 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors">
                                            Limpar Filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

const PlansManager = ({ user }: { user: User }) => {
  const [subscription, setSubscription] = useState<MerchantSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [customerData, setCustomerData] = useState({ name: user.displayName || '', cpfCnpj: '' });
  const [processingPayment, setProcessingPayment] = useState(false);

  const plans: PaymentPlan[] = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      features: ['Até 10 Produtos', 'Catálogo Online', 'Pedidos via WhatsApp', 'Suporte Básico']
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49.90,
      features: ['Produtos Ilimitados', 'Gestão de Clientes (CRM)', 'Cupons de Desconto', 'WhatsApp Bot Básico', 'Relatórios de Vendas'],
      isPopular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.90,
      features: ['Tudo do Pro', 'WhatsApp Bot Avançado (IA)', 'Suporte Prioritário', 'Domínio Personalizado', 'API de Integração']
    }
  ];

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const docRef = doc(db, 'merchants', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSubscription(docSnap.data().subscription || { planId: 'free', status: 'active' });
        } else {
          setSubscription({ planId: 'free', status: 'active', currentPeriodEnd: null });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, [user.uid]);

  const handleSelectPlan = async (plan: PaymentPlan) => {
    if (plan.id === subscription?.planId) return;
    
    if (plan.price === 0) {
      try {
        await updateDoc(doc(db, 'merchants', user.uid), {
          subscription: {
            planId: plan.id,
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });
        setSubscription({
          planId: plan.id,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        alert(`Plano ${plan.name} selecionado com sucesso!`);
      } catch (e) {
        console.error(e);
        alert("Erro ao atualizar plano.");
      }
    } else {
      setSelectedPlan(plan);
      setCheckoutModalOpen(true);
    }
  };

  const handleCheckout = async () => {
    if (!customerData.name || !customerData.cpfCnpj) {
      alert("Preencha todos os campos.");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerData.name,
          customerEmail: user.email,
          customerCpfCnpj: customerData.cpfCnpj.replace(/\D/g, ''),
          planId: selectedPlan?.id,
          value: selectedPlan?.price,
          cycle: 'MONTHLY'
        })
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        // Save pending subscription status
        await updateDoc(doc(db, 'merchants', user.uid), {
          subscription: {
            planId: selectedPlan?.id,
            status: 'pending',
            currentPeriodEnd: null
          }
        });
        // Redirect to Asaas checkout
        window.location.href = data.checkoutUrl;
      } else {
        alert(`Erro: ${data.error || 'Falha ao processar pagamento'}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão ao processar pagamento.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in">
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Finalizar Assinatura</h3>
              <button onClick={() => setCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-indigo-800 font-medium">Plano Selecionado</p>
              <div className="flex justify-between items-end mt-1">
                <p className="text-lg font-bold text-indigo-900">{selectedPlan.name}</p>
                <p className="text-lg font-bold text-indigo-900">R$ {selectedPlan.price.toFixed(2).replace('.', ',')}<span className="text-sm font-normal">/mês</span></p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-xl mt-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={customerData.name} 
                  onChange={e => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">CPF ou CNPJ</label>
                <input 
                  type="text" 
                  className="w-full p-3 border rounded-xl mt-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={customerData.cpfCnpj} 
                  onChange={e => setCustomerData({...customerData, cpfCnpj: e.target.value})}
                  placeholder="Apenas números"
                />
              </div>
              
              <button 
                onClick={handleCheckout}
                disabled={processingPayment}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {processingPayment ? <Loader2 className="animate-spin" size={20}/> : <CreditCard size={20}/>}
                {processingPayment ? 'Processando...' : 'Ir para Pagamento'}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-2">Você será redirecionado para o ambiente seguro do Asaas.</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Escolha o plano ideal para o seu negócio</h2>
        <p className="text-slate-500">Aumente suas vendas e profissionalize sua gestão com as ferramentas certas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative bg-white rounded-3xl p-8 shadow-sm border-2 transition-all duration-300 hover:shadow-xl ${plan.isPopular ? 'border-indigo-500 scale-105 z-10' : 'border-slate-100'}`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                Mais Popular
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                <span className="text-slate-400 text-sm">/mês</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-0.5 p-0.5 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan)}
              disabled={plan.id === subscription?.planId}
              className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-200 ${
                plan.id === subscription?.planId 
                  ? 'bg-slate-100 text-slate-400 cursor-default' 
                  : plan.isPopular 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' 
                    : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {plan.id === subscription?.planId ? 'Plano Atual' : 'Selecionar Plano'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Pagamento Seguro</h4>
            <p className="text-sm text-slate-500">Sua assinatura é processada com segurança e pode ser cancelada a qualquer momento.</p>
          </div>
        </div>
        <div className="flex -space-x-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
              <img src={`https://picsum.photos/seed/${i+10}/40/40`} alt="User" referrerPolicy="no-referrer" />
            </div>
          ))}
          <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
            +500
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardHome = ({ user }: { user: User }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, revenue: 0, clients: 0 });
  const [chartData, setChartData] = useState<{name: string, value: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
       try {
         // Parallel fetch for counts/stats
         const ordersSnap = await getDocs(collection(db, `merchants/${user.uid}/orders`));
         const clientsSnap = await getDocs(collection(db, `merchants/${user.uid}/clients`));
         
         let totalRevenue = 0;
         const revenueByDay: {[key: string]: number} = {};
         
         ordersSnap.forEach(doc => {
             const data = doc.data();
             totalRevenue += data.total || 0;
             
             if (data.createdAt) {
                const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                const day = date.toISOString().split('T')[0];
                revenueByDay[day] = (revenueByDay[day] || 0) + (data.total || 0);
             }
         });

         // Fill last 7 days for chart
         const last7Days = [];
         for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            last7Days.push({
              name: formattedDate,
              value: Math.round(revenueByDay[dayStr] || 0)
            });
         }

         setStats({
             orders: ordersSnap.size,
             revenue: totalRevenue,
             clients: clientsSnap.size
         });
         setChartData(last7Days);
       } catch (e) {
           console.error(e);
       } finally {
           setLoading(false);
       }
    };
    fetchStats();
  }, [user.uid]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Total de Pedidos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.orders}</h3>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Receita Total</p>
                        <h3 className="text-2xl font-bold text-slate-800">R$ {stats.revenue.toFixed(2)}</h3>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase">Clientes</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.clients}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="font-bold text-slate-800">Desempenho de Vendas</h4>
                        <p className="text-xs text-slate-400">Receita nos últimos 7 dias</p>
                    </div>
                    <TrendingUp size={20} className="text-emerald-500" />
                </div>
                <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                tickFormatter={(value) => `R$ ${value}`}
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number | undefined) => [`R$ ${(value || 0).toFixed(2)}`, 'Receita']}
                            />
                            <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-slate-800">Ações Rápidas</h4>
                    <Zap size={20} className="text-amber-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/dashboard/products')} className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-left group">
                        <Plus size={20} className="mb-2 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold block">Novo Produto</span>
                    </button>
                    <button onClick={() => navigate('/dashboard/clients')} className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-left group">
                        <Users size={20} className="mb-2 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold block">Novo Cliente</span>
                    </button>
                    <button onClick={() => navigate('/dashboard/store')} className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-left group">
                        <Store size={20} className="mb-2 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold block">Editar Loja</span>
                    </button>
                    <button onClick={() => navigate('/dashboard/coupons')} className="p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all text-left group">
                        <TicketPercent size={20} className="mb-2 text-slate-400 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold block">Criar Cupom</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

const Dashboard = ({ user, logout }: { user: User, logout: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Pedidos', path: '/dashboard/orders' },
    { icon: Package, label: 'Produtos', path: '/dashboard/products' },
    { icon: Users, label: 'Clientes', path: '/dashboard/clients' },
    { icon: TicketPercent, label: 'Cupons', path: '/dashboard/coupons' },
    { icon: Store, label: 'Minha Loja', path: '/dashboard/store' },
    { icon: MessageCircle, label: 'WhatsApp Bot', path: '/dashboard/whatsapp' },
    { icon: CreditCard, label: 'Planos', path: '/dashboard/plans' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-100 z-20 shadow-sm transition-all duration-300 relative`}>
         {/* Toggle Button */}
         <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-9 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-full p-1.5 shadow-sm hover:shadow transition-all z-30"
         >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
         </button>

         <div className="h-20 flex items-center justify-center border-b border-slate-50 overflow-hidden">
            <AppLogo collapsed={collapsed} />
         </div>
         <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
               const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
               return (
                   <button 
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                   >
                       <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                       {!collapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                   </button>
               )
            })}
         </nav>
         <div className="p-4 border-t border-slate-50">
             <button onClick={logout} title={collapsed ? "Sair" : undefined} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium text-sm`}>
                 <LogOut size={20} />
                 {!collapsed && <span className="animate-in fade-in duration-300">Sair da Conta</span>}
             </button>
         </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
         {/* Mobile Header */}
         {isMobile && (
             <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
                 <AppLogo collapsed={false} />
                 <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg"><LogOut size={20}/></button>
             </header>
         )}

         {/* Desktop Header */}
         <header className="hidden md:flex h-20 bg-white border-b border-slate-100 items-center justify-between px-8 shadow-sm z-10 shrink-0">
             <h1 className="text-xl font-bold text-slate-800">
                 {menuItems.find(i => location.pathname === i.path || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.label || 'Painel'}
             </h1>
             <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-slate-600">Sistema Online</span>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                      {user.email?.charAt(0).toUpperCase()}
                  </div>
             </div>
         </header>
         
         {/* Content Scroll Area */}
         <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-slate-50/50 pb-20 md:pb-8">
             <div className="max-w-7xl mx-auto h-full">
                <Routes>
                    <Route path="/" element={<DashboardHome user={user} />} />
                    <Route path="/orders" element={<OrdersManager user={user} />} />
                    <Route path="/products" element={<ProductsManager user={user} />} />
                    <Route path="/clients" element={<ClientsManager user={user} />} />
                    <Route path="/coupons" element={<CouponsManager user={user} />} />
                    <Route path="/store" element={<StoreEditor user={user} />} />
                    <Route path="/whatsapp" element={<WhatsAppBot user={user} />} />
                    <Route path="/plans" element={<PlansManager user={user} />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
             </div>
         </main>

         {/* Mobile Bottom Navigation */}
         {isMobile && (
            <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-1 shrink-0 z-40 absolute bottom-0 w-full shadow-[0_-1px_10px_rgba(0,0,0,0.05)] pb-safe">
               {menuItems.slice(0, 6).map((item) => {
                 const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                 let label = item.label.split(' ')[0];
                 if (item.label === 'Minha Loja') label = 'Loja';
                 if (item.label === 'Visão Geral') label = 'Início';
                 
                 return (
                    <button key={item.path} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <item.icon size={20} strokeWidth={active ? 2.5 : 2} className={active ? "-mt-1" : ""} />
                        <span className="text-[10px] font-bold mt-1 leading-none">{label}</span>
                    </button>
                 )
               })}
            </div>
         )}
      </div>
    </div>
  );
};

const PublicStore = () => {
    const { id } = useParams();
    const [config, setConfig] = useState<StoreConfig | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [sendingOrder, setSendingOrder] = useState(false);

    // Cart details
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    useEffect(() => {
        const fetchStore = async () => {
            try {
                if (!id) return;
                const docRef = doc(db, 'merchants', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().storeConfig) {
                    setConfig(docSnap.data().storeConfig);
                }
                
                const pQuery = query(collection(db, `merchants/${id}/products`), where('stock', '>', 0));
                const pSnap = await getDocs(pQuery);
                const pList: Product[] = [];
                pSnap.forEach(d => pList.push({id: d.id, ...d.data()} as Product));
                // Sort by orderIndex
                pList.sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
                setProducts(pList);
            } catch (error) {
                console.error("Error loading store:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [id]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? {...item, quantity: item.quantity + 1} : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (!customerName || !customerPhone || !customerAddress) {
            alert("Por favor, preencha todos os campos de contato e endereço.");
            return;
        }

        if (cart.length === 0) return;

        setSendingOrder(true);
        try {
            // 1. Create Order in Firestore
            const orderData = {
                customerName,
                customerPhone,
                deliveryAddress: { street: customerAddress, number: 'S/N', neighborhood: '', city: '', zip: '' }, // Simplified for MVP
                items: cart.map(i => ({
                    productId: i.product.id,
                    productName: i.product.name,
                    quantity: i.quantity,
                    price: i.product.price,
                    imageUrl: i.product.imageUrl
                })),
                total: total,
                status: 'new',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, `merchants/${id}/orders`), orderData);

            // 2. Send via WhatsApp
            const message = `*Novo Pedido - ${config?.storeName}*\n\n` +
                `*Cliente:* ${customerName}\n` +
                `*Endereço:* ${customerAddress}\n\n` +
                `*Itens:*\n` +
                cart.map(i => `${i.quantity}x ${i.product.name} (R$ ${i.product.price.toFixed(2)})`).join('\n') +
                `\n\n*Total:* R$ ${total.toFixed(2)}`;

            let phone = config?.whatsapp || '';
            if (!phone && id) {
                 // Fallback if not configured (should ideally fetch user profile phone but config is source of truth)
            }
            
            if (phone) {
                openWhatsApp(phone, message);
            } else {
                alert("Pedido realizado com sucesso! Aguarde o contato da loja.");
            }

            setCart([]);
            setIsCartOpen(false);
            setCustomerName('');
            setCustomerAddress('');
            setCustomerPhone('');

        } catch (error) {
            console.error(error);
            alert("Erro ao enviar pedido. Tente novamente.");
        } finally {
            setSendingOrder(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!config) return <div className="h-screen flex flex-col items-center justify-center text-slate-500"><Store size={64} className="mb-4 text-slate-300"/><h2 className="text-xl font-bold">Loja não encontrada</h2></div>;

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 pb-24">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex justify-between items-center shadow-sm">
                 <div className="flex items-center gap-3">
                     {config.logoUrl && <img src={config.logoUrl} className="w-8 h-8 rounded-full object-cover border border-slate-200" />}
                     <span className="font-bold text-lg truncate max-w-[200px]">{config.storeName}</span>
                 </div>
                 <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors">
                     <ShoppingBag size={24} />
                     {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{cart.reduce((a,c) => a + c.quantity, 0)}</span>}
                 </button>
            </nav>

            <div className="bg-white pb-8 relative mb-6">
                <div className="h-40 md:h-64 w-full bg-slate-100 relative overflow-hidden group">
                    {config.bannerUrl ? (
                        <img src={config.bannerUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Capa da Loja" />
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: config.themeColor || '#4f46e5' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent"></div>
                </div>
                
                <div className="px-4 -mt-16 flex flex-col items-center gap-4 relative z-10 text-center">
                    <div className="w-28 h-28 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center shrink-0">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                            <Store size={40} className="text-slate-300"/>
                        )}
                    </div>
                    
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                        <h1 className="font-extrabold text-3xl md:text-4xl text-slate-900 leading-tight mb-2 tracking-tight">{config.storeName}</h1>
                        {config.description && <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">{config.description}</p>}
                        
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                             {config.category && (
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-200">
                                    {config.category}
                                </span>
                             )}
                             <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Aberto Agora
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div>
                {config.sections.map((section, idx) => {
                     if (section.type === 'hero') return <HeroSection key={section.id || idx} section={section} />;
                     if (section.type === 'text') return <TextSection key={section.id || idx} section={section} />;
                     if (section.type === 'products') return <ProductGridSection key={section.id || idx} section={section} products={products} onAddToCart={addToCart} />;
                     return null;
                })}
            </div>

            {/* Cart Modal / Sidebar */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingBag size={20}/> Seu Carrinho</h3>
                            <button onClick={() => setIsCartOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <ShoppingBag size={48} className="mx-auto mb-2"/>
                                    <p>Seu carrinho está vazio.</p>
                                </div>
                            ) : (
                                cart.map((item, i) => (
                                    <div key={i} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                        <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                            {item.product.imageUrl && <img src={item.product.imageUrl} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{item.product.name}</h4>
                                            <p className="text-indigo-600 font-bold text-sm">R$ {item.product.price.toFixed(2)}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded hover:bg-slate-200 font-bold">-</button>
                                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded hover:bg-slate-200 font-bold">+</button>
                                                <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-red-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {cart.length > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                                <div className="space-y-2 mb-4">
                                    <input placeholder="Seu Nome" className="w-full p-3 border rounded-xl text-sm" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                                    <input placeholder="Seu WhatsApp (com DDD)" className="w-full p-3 border rounded-xl text-sm" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                    <input placeholder="Endereço de Entrega" className="w-full p-3 border rounded-xl text-sm" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold text-slate-800 mb-2">
                                    <span>Total</span>
                                    <span>R$ {total.toFixed(2)}</span>
                                </div>
                                <button 
                                    onClick={handleCheckout} 
                                    disabled={sendingOrder}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {sendingOrder ? <Loader2 className="animate-spin" /> : <MessageCircle size={20}/>}
                                    Finalizar Pedido
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
           <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
             <AppLogo />
             <div className="flex gap-4">
                 <button onClick={() => navigate('/login')} className="text-slate-600 hover:text-indigo-600 font-bold text-sm transition-colors">Entrar</button>
                 <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20">Criar Conta</button>
             </div>
           </div>
        </nav>

        {/* Hero Section */}
        <div className="relative pt-20 pb-32 overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #e0e7ff 0%, transparent 60%)' }}></div>
             
             <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold mb-8 uppercase tracking-widest animate-in fade-in zoom-in">
                     <Sparkles size={12} fill="currentColor" /> Nova Versão 3.1
                 </div>
                 
                 <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-slate-900 animate-in slide-in-from-bottom-5 duration-700">
                     O CRM que <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">vende por você.</span>
                 </h1>
                 
                 <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-in slide-in-from-bottom-5 duration-1000">
                     Crie sua loja online, gerencie pedidos e use Inteligência Artificial para atender seus clientes no WhatsApp. Tudo em um só lugar.
                 </p>

                 <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-in slide-in-from-bottom-5 duration-1000 delay-200">
                     <button onClick={() => navigate('/register')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-1">
                        <Rocket size={20} /> Começar Grátis
                     </button>
                     <button onClick={() => navigate('/marketplace')} className="px-8 py-4 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-100 text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-md shadow-sm">
                        <ShoppingBag size={20} /> Ver Marketplace
                     </button>
                 </div>

                 {/* Browser Mockup */}
                 <div className="mt-24 relative w-full max-w-5xl mx-auto group animate-in slide-in-from-bottom-10 duration-1000 delay-300">
                     <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                     <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden aspect-[16/9] flex flex-col">
                          {/* Fake Browser Toolbar */}
                          <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                             <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                             </div>
                             <div className="flex-1 mx-4 h-6 bg-white border border-slate-200 rounded-md shadow-sm"></div>
                          </div>
                          
                          {/* Dashboard Mock Content */}
                          <div className="flex-1 bg-slate-50 p-6 flex flex-col items-center justify-center text-slate-400">
                              <LayoutDashboard size={64} className="mb-4 text-indigo-100"/>
                              <div className="grid grid-cols-3 gap-4 w-full max-w-3xl opacity-50 blur-[1px]">
                                  <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200"></div>
                                  <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200"></div>
                                  <div className="h-32 bg-white rounded-xl shadow-sm border border-slate-200"></div>
                                  <div className="col-span-2 h-48 bg-white rounded-xl shadow-sm border border-slate-200"></div>
                                  <div className="h-48 bg-white rounded-xl shadow-sm border border-slate-200"></div>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border border-slate-100 font-bold text-slate-800 text-sm">Dashboard Interativo</span>
                              </div>
                          </div>
                     </div>
                 </div>
             </div>
        </div>

        {/* Features Section */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que você precisa</h2>
                    <p className="text-slate-500 max-w-xl mx-auto">Ferramentas poderosas para alavancar suas vendas sem complexidade.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50", title: "Loja Virtual", desc: "Crie seu catálogo online em minutos e receba pedidos no WhatsApp." },
                        { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50", title: "Automação WhatsApp", desc: "Integração oficial para recuperar carrinhos e enviar promoções." },
                        { icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50", title: "CRM Inteligente", desc: "Gestão completa de clientes com funil de vendas e IA." }
                    ].map((feature, i) => (
                        <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className={`w-12 h-12 ${feature.bg} ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                                <feature.icon size={24} />
                            </div>
                            <h3 className="font-bold text-xl text-slate-900 mb-2">{feature.title}</h3>
                            <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <footer className="py-12 bg-white border-t border-slate-100 text-center">
            <div className="flex justify-center mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                <AppLogo />
            </div>
            <p className="text-slate-400 text-sm">© {new Date().getFullYear()} NovaCRM. Todos os direitos reservados.</p>
        </footer>
    </div>
  );
};

const AuthPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false); // State for Forgot Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsRegister(location.pathname === '/register');
    // Ensure we reset the reset state when switching modes
    if (location.pathname !== '/login') setIsReset(false);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Por favor, digite seu email.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Um email com um link de redefinição de senha foi enviado para você. Verifique sua caixa de entrada.");
      setIsReset(false); // Return to login view
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
          alert("Usuário não encontrado. Verifique o email digitado.");
      } else {
          alert("Erro ao enviar email: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Form Section */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, x: -50 },
          visible: { 
            opacity: 1, 
            x: 0,
            transition: { 
              duration: 0.5, 
              ease: "easeOut",
              staggerChildren: 0.1
            }
          }
        }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white relative z-10"
      >
        <div className="w-full max-w-sm space-y-8">
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="text-center lg:text-left">
               <div className="flex justify-center lg:justify-start mb-6"><AppLogo /></div>
               <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                 {isReset ? 'Recuperar Acesso' : isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
               </h2>
               <p className="text-slate-500 mt-3 text-lg">
                 {isReset 
                    ? 'Informe seu email para redefinir a senha.' 
                    : isRegister 
                        ? 'Comece a gerenciar seu negócio hoje.' 
                        : 'Entre com seus dados para acessar o painel.'
                 }
               </p>
            </motion.div>

            {isReset ? (
                // --- RESET PASSWORD FORM ---
                <motion.form variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} onSubmit={handleResetPassword} className="space-y-5">
                   <div>
                     <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Email Corporativo</label>
                     <div className="relative">
                        <input 
                            type="email" 
                            required 
                            className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="seu@email.com"
                        />
                        <Mail size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                     </div>
                   </div>
                   
                   <button disabled={loading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 transform active:scale-[0.98]">
                     {loading && <Loader2 className="animate-spin" size={20}/>}
                     Enviar Link de Redefinição
                   </button>

                   <button 
                     type="button" 
                     onClick={() => setIsReset(false)} 
                     className="w-full py-2 text-slate-500 font-semibold hover:text-slate-800 transition-colors text-sm"
                   >
                     <ArrowRight className="inline mr-1 rotate-180" size={16}/> Voltar para Login
                   </button>
                </motion.form>
            ) : (
                // --- LOGIN / REGISTER FORM ---
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                    <form onSubmit={handleAuth} className="space-y-5">
                       <div>
                         <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Email</label>
                         <input 
                            type="email" 
                            required 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="exemplo@loja.com"
                         />
                       </div>
                       <div>
                         <div className="flex justify-between items-center mb-1.5">
                             <label className="text-sm font-semibold text-slate-700">Senha</label>
                             {!isRegister && (
                                 <button type="button" onClick={() => setIsReset(true)} className="text-sm text-indigo-600 font-bold hover:text-indigo-800 hover:underline">
                                     Esqueceu?
                                 </button>
                             )}
                         </div>
                         <input 
                            type="password" 
                            required 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="••••••••"
                         />
                       </div>
                       
                       <button disabled={loading} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 shadow-xl shadow-indigo-200/50 transform active:scale-[0.98]">
                         {loading && <Loader2 className="animate-spin" size={20}/>}
                         {isRegister ? 'Criar Conta Grátis' : 'Entrar na Plataforma'}
                       </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-400 font-medium uppercase text-xs">Ou continue com</span>
                        </div>
                    </div>

                    <button onClick={handleGoogle} className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all flex justify-center items-center gap-3 transform active:scale-[0.98]">
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Google
                    </button>

                    <p className="text-center mt-8 text-slate-500 text-sm">
                       {isRegister ? 'Já é membro?' : 'Novo por aqui?'}
                       <span onClick={() => navigate(isRegister ? '/login' : '/register')} className="text-indigo-600 font-bold cursor-pointer ml-1 hover:underline hover:text-indigo-700">
                          {isRegister ? 'Fazer Login' : 'Criar conta agora'}
                       </span>
                    </p>
                </motion.div>
            )}
        </div>
      </motion.div>

      {/* Right Side - Visuals (Desktop Only) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden"
      >
         {/* Background Gradients/Blobs with movement */}
         <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 z-0"></div>
         
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[80px] animate-pulse" style={{animationDuration: '7s'}}></div>

         {/* Glassmorphism Card */}
         <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="relative z-10 p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-lg shadow-2xl mx-12"
         >
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/30">
                <BarChart3 className="text-white" size={32} />
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
               Escale suas vendas com inteligência de dados.
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
               "A plataforma ideal para quem quer parar de anotar pedidos no caderno e começar a gerenciar um negócio de verdade."
            </p>
            
            <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs text-white font-bold overflow-hidden`}>
                            <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full object-cover"/>
                        </div>
                    ))}
                </div>
                <div className="text-sm text-slate-400">
                    <span className="text-white font-bold">+2.000</span> lojistas ativos
                </div>
            </div>
         </motion.div>
      </motion.div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Update Document Title based on Device
  useEffect(() => {
    document.title = isMobile ? "Nova CRM Mobile" : "NovaCRM & Store Builder";
  }, [isMobile]);

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>;

  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
          <Route path="/dashboard/*" element={user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/store/:id/*" element={<PublicStore />} />
          <Route path="/marketplace" element={<Marketplace />} />
        </Routes>
      </BrowserRouter>
  );
};

export default App;
