
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate, Outlet } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
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
import { GoogleGenAI, Type, Schema } from "@google/genai";
import XLSX from 'xlsx-js-style';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type as TypeIcon, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag, MapPin, Clock, Star, History, Menu, Phone,
  Zap, Globe, ShieldCheck, BarChart3, Smartphone, CheckCircle2, TrendingUp, TrendingDown, DollarSign, PieChart, Sparkles, MessageSquare, Send, Minus, Briefcase, User as UserIcon, Calendar, ClipboardList,
  FileSpreadsheet, Download, Upload, Filter, Target, List, MessageCircle, Bot, QrCode, Play, StopCircle, MoreVertical, Paperclip, Smile, Key, AlertTriangle, GripVertical, AlertCircle, Trophy, Save, Cpu, Timer, Lock, Mail, Wand2, TicketPercent, Tag, Utensils
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus, ClientType, ClientStatus, WhatsAppConfig, Coupon } from './types';
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
          <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Versão 3.0 Alpha</span>
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

  const handleDragOver = (e: React.DragEvent, index: number) => {
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
    themeColor: '#ea1d2c',
    sections: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
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
          Você é um especialista em Visual Merchandising e Web Design.
          Analise esta lista de produtos de uma loja: "${productSummary}".

          Gere um arquivo JSON de configuração para montar uma loja virtual atraente.
          
          Regras:
          1. Escolha uma 'themeColor' (hex) que combine com o nicho (ex: vermelho para comida, azul para tech, preto para moda).
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
                            backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #ea1d2c, #b91c1c)',
                            backgroundColor: config.themeColor 
                        }}></div>
                        <div className="px-4 -mt-8 flex flex-col items-center gap-3 relative z-10 text-center">
                            <div className="w-16 h-16 rounded-full border-2 border-white bg-white shadow overflow-hidden">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{color: config.themeColor}}><Store size={24}/></div>}
                            </div>
                            <div className="pt-1">
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
    const [stores, setStores] = useState<{id: string, config: StoreConfig}[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStores = async () => {
            try {
                // Fetch all merchants
                // Note: In a real production app, we would query only active/verified stores
                // For this MVP, we fetch the merchants collection
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

    const filteredStores = stores.filter(store => 
        store.config.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.config.description && store.config.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const categories = [
        { name: "Restaurantes", icon: Utensils, color: "bg-red-100 text-red-600" },
        { name: "Mercado", icon: ShoppingBag, color: "bg-green-100 text-green-600" },
        { name: "Lanches", icon: MapPin, color: "bg-orange-100 text-orange-600" }, // Using MapPin as placeholder for burger
        { name: "Doces", icon: Star, color: "bg-pink-100 text-pink-600" }, // Using Star as placeholder
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header / Search Area */}
            <div className="bg-white sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                             <div className="bg-red-600 text-white p-1.5 rounded-lg">
                                <Rocket size={20} fill="currentColor"/>
                             </div>
                             <span className="font-bold text-xl tracking-tight text-slate-900">Nova<span className="text-red-600">Delivery</span></span>
                        </div>
                        
                        <div className="flex gap-2">
                             <button onClick={() => navigate('/login')} className="text-sm font-bold text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                                 Sou Lojista
                             </button>
                        </div>
                    </div>

                    <div className="relative max-w-2xl mx-auto mb-2">
                        <input 
                            type="text" 
                            placeholder="Buscar loja ou item..." 
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-red-200 transition-all text-slate-700 font-medium placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
                {/* Categories */}
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                    {categories.map((cat, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer hover:scale-105 transition-transform">
                            <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                                <cat.icon size={24} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{cat.name}</span>
                        </div>
                    ))}
                </div>

                {/* Banner Promo */}
                <div className="w-full h-40 md:h-56 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl relative overflow-hidden shadow-lg flex items-center px-8 text-white">
                    <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 skew-x-12 transform translate-x-20"></div>
                    <div className="relative z-10 max-w-lg">
                        <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">Destaque</span>
                        <h2 className="text-2xl md:text-4xl font-extrabold mb-2">Fome de quê?</h2>
                        <p className="text-white/90 text-sm md:text-base mb-4">Descubra os melhores restaurantes e lojas da sua região.</p>
                    </div>
                </div>

                {/* Store List */}
                <div>
                    <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <Store size={20} className="text-slate-400"/> Lojas Disponíveis
                    </h3>
                    
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1,2,3,4,5,6].map(i => (
                                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-100 h-48 animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStores.length > 0 ? filteredStores.map((store) => (
                                <div 
                                    key={store.id} 
                                    onClick={() => navigate(`/store/${store.id}`)}
                                    className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group"
                                >
                                    {/* Store Banner */}
                                    <div className="h-24 w-full bg-slate-200 relative">
                                        {store.config.bannerUrl ? (
                                            <img src={store.config.bannerUrl} className="w-full h-full object-cover" alt="Capa" />
                                        ) : (
                                            <div className="w-full h-full" style={{backgroundColor: store.config.themeColor || '#ea1d2c'}}></div>
                                        )}
                                    </div>
                                    
                                    <div className="px-5 pb-5 relative">
                                        {/* Store Logo Overlapping Banner */}
                                        <div className="w-16 h-16 bg-white rounded-full border-4 border-white shadow-md -mt-8 mb-3 overflow-hidden flex items-center justify-center">
                                            {store.config.logoUrl ? (
                                                <img src={store.config.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                            ) : (
                                                <Store size={24} className="text-slate-300"/>
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800 leading-tight mb-1">{store.config.storeName}</h4>
                                                <p className="text-xs text-slate-500 line-clamp-1">{store.config.description || 'Loja de Conveniência'}</p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded text-xs font-bold text-yellow-700">
                                                <Star size={10} fill="currentColor" />
                                                <span>4.8</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 font-medium">
                                             <span className="flex items-center gap-1"><Clock size={12}/> 30-45 min</span>
                                             <span>•</span>
                                             <span className="text-green-600">Grátis</span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 text-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Search size={32}/>
                                    </div>
                                    <p className="text-slate-500 font-medium">Nenhuma loja encontrada.</p>
                                    <p className="text-sm text-slate-400">Tente buscar por outro nome.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... LandingPage and AuthPage unchanged ...

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
                     <Sparkles size={12} fill="currentColor" /> Nova Versão 3.0 Alpha
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
                     <button onClick={() => navigate('/marketplace')} className="px-8 py-4 bg-white hover:bg-slate-50 text-red-600 border border-red-100 text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2 hover:shadow-md shadow-sm">
                        <ShoppingBag size={20} /> Ver Lojas
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white relative z-10">
        <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-left duration-700">
            <div className="text-center lg:text-left">
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
            </div>

            {isReset ? (
                // --- RESET PASSWORD FORM ---
                <form onSubmit={handleResetPassword} className="space-y-5">
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
                </form>
            ) : (
                // --- LOGIN / REGISTER FORM ---
                <>
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
                </>
            )}
        </div>
      </div>

      {/* Right Side - Visuals (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
         {/* Background Gradients/Blobs with movement */}
         <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 z-0"></div>
         
         <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{animationDuration: '4s'}}></div>
         <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[80px] animate-pulse" style={{animationDuration: '7s'}}></div>

         {/* Glassmorphism Card */}
         <div className="relative z-10 p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-lg shadow-2xl mx-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
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
         </div>
      </div>
    </div>
  );
};

// ... PublicStore COMPONENT ...
const PublicStore = () => {
  const { id } = useParams();
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  
  // New State for Order logic
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', paymentMethod: 'pix' });
  const [orderPlaced, setOrderPlaced] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  
  // 2-Step Checkout State
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

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
              // Sort by orderIndex to respect merchant's arrangement
              pList.sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
              setProducts(pList);
          } catch(e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      
      // Load local history safely
      if (id) {
          const stored = localStorage.getItem(`my_orders_${id}`);
          if (stored) {
              try {
                  setLocalOrders(JSON.parse(stored));
              } catch (e) {
                  console.error("Failed to parse history", e);
                  setLocalOrders([]);
              }
          }
      }

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
      setCheckoutStep(1); // Ensure we start at step 1 when adding
      setAppliedCoupon(null); // Reset coupon on cart change just in case to force re-validate logic if needed, or keep it.
      // Better: keep coupon but re-validate total? For MVP, we remove coupon on cart changes to avoid inconsistencies.
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(p => p.product.id !== productId));
      setAppliedCoupon(null); // Reset coupon
  };

  // Calculate totals
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  let discount = 0;
  if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
          discount = subtotal * (appliedCoupon.value / 100);
      } else {
          discount = appliedCoupon.value;
      }
      // Ensure discount doesn't exceed subtotal
      if (discount > subtotal) discount = subtotal;
  }
  
  const total = subtotal - discount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setAppliedCoupon(null);

    try {
        // Query to find coupon by code
        const q = query(
            collection(db, `merchants/${id}/coupons`), 
            where("code", "==", couponCode.toUpperCase().trim())
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Cupom não encontrado.");
        } else {
            const couponData = querySnapshot.docs[0].data() as Coupon;
            const couponId = querySnapshot.docs[0].id;
            
            // Validation
            if (!couponData.active) {
                alert("Este cupom expirou ou está inativo.");
            } else if (couponData.minPurchase && subtotal < couponData.minPurchase) {
                alert(`Este cupom requer um valor mínimo de R$ ${couponData.minPurchase.toFixed(2)}.`);
            } else {
                setAppliedCoupon({ ...couponData, id: couponId });
            }
        }
    } catch (error) {
        console.error("Error applying coupon", error);
        alert("Erro ao validar cupom.");
    } finally {
        setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
        alert("Por favor, informe seu nome e telefone/WhatsApp.");
        return;
    }
    
    setSubmitting(true);
    
    try {
        const orderData = {
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            customerEmail: '',
            deliveryAddress: {
                street: customerInfo.address,
                number: 'N/A',
                neighborhood: '',
                city: '',
                zip: '',
                complement: ''
            },
            items: cart.map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
                imageUrl: item.product.imageUrl || ''
            })),
            total: total,
            subtotal: subtotal,
            discount: discount,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            status: 'new',
            createdAt: serverTimestamp(),
            paymentMethod: customerInfo.paymentMethod
        };

        const docRef = await addDoc(collection(db, `merchants/${id}/orders`), orderData);
        
        // Update coupon usage count if used
        if (appliedCoupon) {
            // Using a simple update here. In high concurrency, transaction is better.
            const couponRef = doc(db, `merchants/${id}/coupons`, appliedCoupon.id);
            // We use increment from firestore ideally, but for now standard update
            await updateDoc(couponRef, {
                 usageCount: (appliedCoupon.usageCount || 0) + 1
            });
        }

        // Explicitly set createdAt as string for local state to avoid serialization issues
        const fullOrder = { id: docRef.id, ...orderData, createdAt: new Date().toISOString() }; 
        
        setOrderPlaced(fullOrder);
        setCart([]); // Clear cart
        setCheckoutStep(1); // Reset step
        setAppliedCoupon(null);
        setCouponCode('');
        
        // Save to local history
        const updatedHistory = [fullOrder, ...localOrders];
        setLocalOrders(updatedHistory);
        localStorage.setItem(`my_orders_${id}`, JSON.stringify(updatedHistory));

    } catch (error: any) {
        console.error("Error placing order:", error);
        // User friendly error for permission denied
        if (error.code === 'permission-denied') {
            alert("Erro de segurança: Não foi possível enviar o pedido. Verifique se todos os dados estão corretos.");
        } else {
            alert("Ocorreu um erro ao enviar o pedido. Tente novamente.");
        }
    } finally {
        setSubmitting(false);
    }
  };

  const finalizeOnWhatsApp = () => {
    if (!orderPlaced) return;
    
    const message = `*Novo Pedido #${orderPlaced.id.slice(0,5)}* ✅\n\n` +
        `👤 *Cliente:* ${orderPlaced.customerName}\n` +
        `📱 *Contato:* ${orderPlaced.customerPhone}\n\n` +
        `🛒 *Resumo:*\n` +
        orderPlaced.items.map((i:any) => `${i.quantity}x ${i.productName}`).join('\n') +
        (orderPlaced.discount > 0 ? `\n\n🏷️ *Subtotal:* R$ ${orderPlaced.subtotal?.toFixed(2)}\n✂️ *Desconto (${orderPlaced.couponCode}):* -R$ ${orderPlaced.discount?.toFixed(2)}` : '') +
        `\n\n💰 *Total Final: R$ ${orderPlaced.total.toFixed(2)}*\n` +
        `📍 *Endereço:* ${orderPlaced.deliveryAddress.street || 'Retirada/Não informado'}\n` +
        `💳 *Pagamento:* ${orderPlaced.paymentMethod === 'pix' ? 'Pix' : orderPlaced.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}`;

    if (config?.whatsapp) {
        openWhatsApp(config.whatsapp, message);
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleCloseCart = () => {
      if(!orderPlaced) {
          setCartOpen(false);
          setCheckoutStep(1); // Reset step on close
      }
  };

  if (loading) return <LoadingSpinner />;
  if (!config) return <div className="text-center py-20">Loja não encontrada.</div>;

  return (
      <div className="min-h-screen bg-white font-sans text-slate-900">
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
             <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                 <div className="flex items-center gap-3 overflow-hidden">
                     {config.logoUrl && <img src={config.logoUrl} className="w-9 h-9 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"/>}
                     <span className="font-bold text-lg truncate text-slate-900">{config.storeName}</span>
                 </div>
                 <div className="flex gap-2 shrink-0">
                     <button onClick={() => setHistoryOpen(true)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" aria-label="Histórico">
                         <History size={22} />
                     </button>
                     <button onClick={() => { setCartOpen(true); setCheckoutStep(1); }} className="relative p-2.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors" aria-label="Carrinho">
                         <ShoppingBag size={22} />
                         {cart.length > 0 && <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm ring-2 ring-white">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
                     </button>
                 </div>
             </div>
          </header>

          {/* BANNER SECTION - Centered */}
          <div className="relative w-full">
              <div className="h-40 md:h-72 w-full bg-cover bg-center transition-all duration-500" style={{ 
                  backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #ea1d2c, #b91c1c)',
                  backgroundColor: config.themeColor 
              }}>
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
              <div className="max-w-7xl mx-auto px-4 relative -mt-16 md:-mt-20 mb-10 flex flex-col items-center gap-4 z-10 text-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white bg-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center transition-all duration-300">
                      {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className="text-slate-300"><Store size={48}/></div>}
                  </div>
                  <div className="pb-2 max-w-2xl px-2">
                      <h1 className="font-bold text-3xl md:text-4xl text-slate-900 leading-tight drop-shadow-sm mb-2 break-words">{config.storeName}</h1>
                      {config.description && <p className="text-slate-600 font-medium bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full inline-block shadow-sm text-sm md:text-base border border-slate-100/50 break-words">{config.description}</p>}
                  </div>
              </div>
          </div>

          {config.sections.map(section => {
              if (section.type === 'hero') return <HeroSection key={section.id} section={section} />;
              if (section.type === 'text') return <TextSection key={section.id} section={section} />;
              if (section.type === 'products') return <ProductGridSection key={section.id} section={section} products={products} onAddToCart={addToCart} />;
              return null;
          })}

          <footer className="py-10 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-slate-500 text-sm">© {new Date().getFullYear()} {config.storeName}. Powered by NovaCRM.</p>
          </footer>

          {/* History Sidebar */}
          {historyOpen && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setHistoryOpen(false)}></div>
                  <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-lg">Histórico de Pedidos</h3>
                          <button onClick={() => setHistoryOpen(false)}><X size={24}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                          {localOrders.length === 0 && (
                              <div className="text-center py-10 text-slate-400">
                                  <Clock size={48} className="mx-auto mb-4 opacity-20"/>
                                  <p>Nenhum pedido recente encontrado.</p>
                              </div>
                          )}
                          {localOrders.map((order, idx) => {
                              if (!order) return null;
                              return (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-sm">#{order.id?.slice(0, 8) || 'ID'}</span>
                                        <span className="text-xs text-slate-400">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Data N/A'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mb-3">
                                        {order.items?.map((item: any, i: number) => (
                                            <div key={i} className="text-xs text-slate-600 flex justify-between">
                                                <span>{item.quantity}x {item.productName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            order.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {order.status === 'new' ? 'Aguardando' : 
                                            order.status === 'processing' ? 'Preparando' :
                                            order.status === 'completed' ? 'Entregue' : 'Cancelado'}
                                        </span>
                                        <span className="font-bold text-indigo-600 text-sm">R$ {(order.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          )}

          {/* Shopping Cart Sidebar */}
          {cartOpen && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseCart}></div>
                  <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
                      
                      {/* Header */}
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                          <h3 className="font-bold text-lg text-slate-800">
                              {orderPlaced ? 'Pedido Confirmado' : checkoutStep === 1 ? 'Seu Pedido' : 'Finalizar Entrega'}
                          </h3>
                          <button onClick={() => { setCartOpen(false); if(orderPlaced) setOrderPlaced(null); setCheckoutStep(1); }} className="p-1 hover:bg-slate-200 rounded-full"><X size={24} className="text-slate-500"/></button>
                      </div>

                      {/* Content Area */}
                      {orderPlaced ? (
                          // SUCCESS VIEW
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 overflow-y-auto">
                              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                                  <CheckCircle2 size={48} strokeWidth={3} />
                              </div>
                              <div>
                                  <h2 className="text-2xl font-bold text-slate-800">Pedido Recebido!</h2>
                                  <p className="text-slate-500 mt-2">A loja já recebeu seu pedido.</p>
                                  <div className="inline-block bg-slate-100 px-3 py-1 rounded-full mt-2 font-mono text-sm font-bold text-slate-700">#{orderPlaced.id.slice(0,8)}</div>
                              </div>
                              
                              <div className="w-full bg-slate-50 p-5 rounded-2xl text-left text-sm text-slate-600 space-y-3 border border-slate-100 shadow-sm">
                                  <div className="flex justify-between border-b border-slate-200 pb-2 mb-2">
                                      <span className="font-bold text-slate-700">Resumo</span>
                                      <span>{orderPlaced.items.length} itens</span>
                                  </div>
                                  <p className="flex justify-between"><span>Subtotal:</span> <span>R$ {orderPlaced.subtotal?.toFixed(2)}</span></p>
                                  {orderPlaced.discount > 0 && (
                                     <p className="flex justify-between text-green-600 font-bold">
                                         <span>Desconto {orderPlaced.couponCode ? `(${orderPlaced.couponCode})` : ''}:</span> 
                                         <span>- R$ {orderPlaced.discount.toFixed(2)}</span>
                                     </p>
                                  )}
                                  <div className="border-t border-slate-200 pt-2 mt-2">
                                     <p className="flex justify-between text-base"><span>Total Final:</span> <span className="font-bold text-slate-900">R$ {orderPlaced.total.toFixed(2)}</span></p>
                                  </div>
                                  <p className="flex justify-between mt-2"><span>Pagamento:</span> <span className="uppercase font-bold text-xs bg-white px-2 py-0.5 rounded border">{orderPlaced.paymentMethod}</span></p>
                              </div>

                              <div className="w-full space-y-3">
                                  <button 
                                      onClick={finalizeOnWhatsApp} 
                                      className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200 flex items-center justify-center gap-2 animate-pulse"
                                  >
                                      <MessageCircle size={24}/> Enviar Comprovante
                                  </button>
                                  <p className="text-xs text-slate-400">Envie o comprovante no WhatsApp para agilizar a entrega.</p>
                              </div>
                          </div>
                      ) : (
                          // CART CHECKOUT FLOW
                          <>
                              {/* STEP 1: ITENS DO CARRINHO */}
                              {checkoutStep === 1 && (
                                  <>
                                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                          {cart.map(item => (
                                              <div key={item.product.id} className="flex gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                                                     {item.product.imageUrl && <img src={item.product.imageUrl} className="w-full h-full object-cover"/>}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                      <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight mb-1">{item.product.name}</h4>
                                                      <p className="text-xs text-slate-500 mb-2">Unitário: R$ {item.product.price.toFixed(2)}</p>
                                                      <div className="flex items-center justify-between">
                                                          <span className="font-bold text-indigo-600">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                                          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1">
                                                              <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 font-bold hover:bg-white rounded px-1 w-6 h-6 flex items-center justify-center">-</button>
                                                              <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                              <button onClick={() => addToCart(item.product)} className="text-green-600 font-bold hover:bg-white rounded px-1 w-6 h-6 flex items-center justify-center">+</button>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                          {cart.length === 0 && (
                                              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                                  <ShoppingBag size={48} className="mb-4 opacity-20"/>
                                                  <p>Seu carrinho está vazio</p>
                                              </div>
                                          )}
                                      </div>

                                      {cart.length > 0 && (
                                          <div className="p-5 border-t bg-slate-50 space-y-4">
                                              
                                              {/* Area de Cupom - Step 1 */}
                                              <div className="bg-white p-3 rounded-xl border border-dashed border-slate-300">
                                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                                                    <Tag size={12}/> Cupom de Desconto
                                                </label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={couponCode}
                                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                        placeholder="DIGITE O CÓDIGO"
                                                        className="flex-1 p-2 border rounded-lg text-sm uppercase font-mono tracking-wider outline-none focus:ring-2 focus:ring-indigo-100"
                                                        disabled={!!appliedCoupon}
                                                    />
                                                    {appliedCoupon ? (
                                                        <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="px-3 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">
                                                            <X size={16}/>
                                                        </button>
                                                    ) : (
                                                        <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} className="px-3 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50">
                                                            {couponLoading ? <Loader2 className="animate-spin" size={16}/> : 'Aplicar'}
                                                        </button>
                                                    )}
                                                </div>
                                                {appliedCoupon && (
                                                    <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                                        <Check size={12}/> Cupom {appliedCoupon.code} aplicado: 
                                                        {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% OFF` : `R$ ${appliedCoupon.value} OFF`}
                                                    </div>
                                                )}
                                              </div>

                                              <div className="space-y-1">
                                                  <div className="flex justify-between items-center text-sm text-slate-500">
                                                      <span>Subtotal</span>
                                                      <span>R$ {subtotal.toFixed(2)}</span>
                                                  </div>
                                                  {discount > 0 && (
                                                      <div className="flex justify-between items-center text-sm text-green-600 font-bold">
                                                          <span>Desconto</span>
                                                          <span>- R$ {discount.toFixed(2)}</span>
                                                      </div>
                                                  )}
                                                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                                      <span className="font-bold text-slate-800">Total</span>
                                                      <span className="font-bold text-2xl text-indigo-600">R$ {total.toFixed(2)}</span>
                                                  </div>
                                              </div>
                                              
                                              <button 
                                                  onClick={() => setCheckoutStep(2)} 
                                                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                              >
                                                  Continuar
                                                  <ArrowRight size={20}/>
                                              </button>
                                          </div>
                                      )}
                                  </>
                              )}

                              {/* STEP 2: DADOS DE ENTREGA */}
                              {checkoutStep === 2 && (
                                  <div className="flex flex-col flex-1 overflow-hidden">
                                      <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                          <button onClick={() => setCheckoutStep(1)} className="text-sm text-slate-500 flex items-center gap-1 hover:text-indigo-600 transition-colors mb-2 font-medium">
                                              <ChevronLeft size={16}/> Voltar para itens
                                          </button>
                                          
                                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                              <span className="text-xs font-bold text-indigo-800 uppercase">Total do Pedido</span>
                                              <div className="text-right">
                                                <span className="font-bold text-lg text-indigo-700">R$ {total.toFixed(2)}</span>
                                                {discount > 0 && <p className="text-[10px] text-indigo-400">Desconto aplicado</p>}
                                              </div>
                                          </div>

                                          <div className="space-y-4">
                                              <div>
                                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dados Pessoais</label>
                                                  <input 
                                                      className="w-full p-3 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 outline-none mb-2" 
                                                      placeholder="Seu Nome (Obrigatório)" 
                                                      value={customerInfo.name}
                                                      onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                                                  />
                                                  <input 
                                                      className="w-full p-3 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 outline-none" 
                                                      placeholder="WhatsApp / Telefone (Obrigatório)" 
                                                      value={customerInfo.phone}
                                                      onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                                      type="tel"
                                                  />
                                              </div>
                                              
                                              <div>
                                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço de Entrega</label>
                                                  <textarea 
                                                      className="w-full p-3 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                                      placeholder="Rua, Número, Bairro, Ponto de Referência..." 
                                                      rows={3}
                                                      value={customerInfo.address}
                                                      onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                                                  />
                                              </div>

                                              <div>
                                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Forma de Pagamento</label>
                                                  <select 
                                                      className="w-full p-3 border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                      value={customerInfo.paymentMethod}
                                                      onChange={e => setCustomerInfo({...customerInfo, paymentMethod: e.target.value})}
                                                  >
                                                      <option value="pix">Pagamento via Pix</option>
                                                      <option value="card">Cartão de Crédito/Débito (Maquininha)</option>
                                                      <option value="cash">Dinheiro</option>
                                                  </select>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="p-5 border-t bg-slate-50">
                                          <button 
                                              onClick={handlePlaceOrder} 
                                              disabled={submitting} 
                                              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                          >
                                              {submitting ? <Loader2 className="animate-spin"/> : <Check size={20}/>}
                                              Finalizar Pedido
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </>
                      )}
                  </div>
              </div>
          )}
      </div>
  );
};

const DashboardOverview = ({ user }: { user: User }) => {
    // Simple stats fetching
    const [stats, setStats] = useState({ orders: 0, revenue: 0, clients: 0, products: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            // This is not efficient for large datasets but works for small/mvp
            // Using count() or aggregations would be better with extensions or server side
            try {
                const ordersSnap = await getDocs(collection(db, `merchants/${user.uid}/orders`));
                const clientsSnap = await getDocs(collection(db, `merchants/${user.uid}/clients`));
                const productsSnap = await getDocs(collection(db, `merchants/${user.uid}/products`));
                
                let revenue = 0;
                ordersSnap.forEach(d => {
                    const data = d.data();
                    // Exclude cancelled orders for real revenue
                    if (data.status !== 'cancelled') {
                        revenue += (data.total || 0);
                    }
                });

                setStats({
                    orders: ordersSnap.size,
                    revenue,
                    clients: clientsSnap.size,
                    products: productsSnap.size
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.uid]);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Bom dia, {user.displayName?.split(' ')[0] || 'Lojista'}!</h1>
                <p className="text-slate-500">Aqui está o resumo do seu negócio hoje.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-green-500"/>
                    </div>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Faturamento Real</span>
                    <span className="text-3xl font-bold text-slate-800">
                        {stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    <div className="w-full bg-green-100 h-1 rounded-full mt-2"><div className="w-[70%] bg-green-500 h-full rounded-full"></div></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingBag size={64} className="text-indigo-500"/>
                    </div>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Pedidos Realizados</span>
                    <span className="text-3xl font-bold text-slate-800">{stats.orders}</span>
                     <div className="w-full bg-indigo-100 h-1 rounded-full mt-2"><div className="w-[45%] bg-indigo-500 h-full rounded-full"></div></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} className="text-amber-500"/>
                    </div>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Base de Clientes</span>
                    <span className="text-3xl font-bold text-slate-800">{stats.clients}</span>
                    <div className="w-full bg-amber-100 h-1 rounded-full mt-2"><div className="w-[30%] bg-amber-500 h-full rounded-full"></div></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package size={64} className="text-violet-500"/>
                    </div>
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Produtos Ativos</span>
                    <span className="text-3xl font-bold text-slate-800">{stats.products}</span>
                    <div className="w-full bg-violet-100 h-1 rounded-full mt-2"><div className="w-[85%] bg-violet-500 h-full rounded-full"></div></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Desempenho Semanal</h3>
                    <div className="h-64 flex items-end gap-2">
                         {/* Mock Chart */}
                         <SimpleBarChart data={[120, 300, 450, 200, 600, 400, 350]} height={240} />
                    </div>
                </div>
                
                <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 w-64 h-64"></div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-xl mb-2">Dica do Dia IA</h3>
                        <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                            Analisei seus pedidos e percebi que clientes que compram "Hambúrguer" geralmente levam "Refrigerante". Crie um combo promocional para aumentar seu ticket médio!
                        </p>
                        <button className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl text-sm hover:bg-indigo-50 transition-colors shadow-lg">
                            Criar Promoção com IA
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
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Pedidos', path: '/dashboard/orders' },
    { icon: Package, label: 'Produtos', path: '/dashboard/products' },
    { icon: Users, label: 'Clientes', path: '/dashboard/clients' },
    { icon: TicketPercent, label: 'Cupons', path: '/dashboard/coupons' },
    { icon: Store, label: 'Minha Loja', path: '/dashboard/store' },
    { icon: MessageSquare, label: 'WhatsApp Bot', path: '/dashboard/whatsapp' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 transition-all duration-300 hidden md:flex flex-col z-20 shadow-sm relative`}>
        <div className="h-20 flex items-center justify-center border-b border-slate-100">
             <AppLogo collapsed={collapsed}/>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-1">
           {menuItems.map((item) => {
             const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
             return (
               <button 
                 key={item.path}
                 onClick={() => navigate(item.path)}
                 className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'} py-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
               >
                  <item.icon size={20} className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} strokeWidth={active ? 2.5 : 2} />
                  {!collapsed && <span className="ml-3 text-sm">{item.label}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity">
                          {item.label}
                      </div>
                  )}
               </button>
             );
           })}
        </div>

        <div className="p-4 border-t border-slate-100">
            <button onClick={logout} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start px-4'} py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all`}>
                <LogOut size={20} />
                {!collapsed && <span className="ml-3 text-sm font-bold">Sair</span>}
            </button>
            <button 
                onClick={() => setCollapsed(!collapsed)} 
                className="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm z-50 flex"
            >
                {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Top Mobile Bar */}
          <div className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
               {/* We pass collapsed={false} here so the mobile version shows the text 'Nova CRM Mobile' instead of just icon */}
               <AppLogo collapsed={false}/>
               <button onClick={logout}><LogOut size={20} className="text-slate-500"/></button>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth">
             <Routes>
                <Route path="/" element={<DashboardOverview user={user} />} />
                <Route path="products" element={<ProductsManager user={user} />} />
                <Route path="clients" element={<ClientsManager user={user} />} />
                <Route path="orders" element={<OrdersManager user={user} />} />
                <Route path="coupons" element={<CouponsManager user={user} />} />
                <Route path="store" element={<StoreEditor user={user} />} />
                <Route path="whatsapp" element={<WhatsAppBot user={user} />} />
             </Routes>
          </div>
          
          {/* Mobile Bottom Navigation could go here, but sidebar approach is used for now */}
          <div className="md:hidden h-16 bg-white border-t flex items-center justify-around px-1 shrink-0 gap-1">
               {menuItems.slice(0, 6).map((item) => {
                 const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                 // Shorten labels for mobile
                 let label = item.label.split(' ')[0];
                 if (item.label === 'Minha Loja') label = 'Loja';
                 
                 return (
                    <button key={item.path} onClick={() => navigate(item.path)} className={`flex flex-col items-center justify-center w-full h-full ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                        <item.icon size={18} strokeWidth={active ? 2.5 : 2} />
                        <span className="text-[9px] font-bold mt-1 leading-none">{label}</span>
                    </button>
                 )
               })}
          </div>
      </main>
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
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />
        
        {/* New Marketplace Route */}
        <Route path="/marketplace" element={<Marketplace />} />
        
        <Route path="/store/:id" element={<PublicStore />} />
        
        <Route path="/dashboard/*" element={
            user ? <Dashboard user={user} logout={logout} /> : <Navigate to="/login" />
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;
