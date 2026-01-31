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

import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit, runTransaction, writeBatch } from 'firebase/firestore';
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
          orderIndex: nextIndex,
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

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedItem(index);
      // Required for Firefox to allow drag
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
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
                        <input required type="number" step="0.01" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Estoque</label>
                        <input type="number" className="w-full p-3 border rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} />
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

// ... LandingPage and AuthPage unchanged ...

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
        <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
            <AppLogo dark />
            <div className="flex gap-4">
                <button onClick={() => navigate('/login')} className="text-slate-300 hover:text-white font-bold text-sm transition-colors">Entrar</button>
                <button onClick={() => navigate('/register')} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20">Criar Conta</button>
            </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold mb-8 uppercase tracking-widest animate-in fade-in zoom-in">
                 <Sparkles size={12} /> Nova Versão 3.0 Alpha
             </div>
             
             <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-in slide-in-from-bottom-5 duration-700">
                 O CRM que <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">vende por você.</span>
             </h1>
             
             <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed animate-in slide-in-from-bottom-5 duration-1000">
                 Crie sua loja online, gerencie pedidos e use Inteligência Artificial para atender seus clientes no WhatsApp. Tudo em um só lugar.
             </p>

             <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-in slide-in-from-bottom-5 duration-1000 delay-200">
                 <button onClick={() => navigate('/register')} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                    <Rocket size={20} /> Começar Grátis
                 </button>
                 <button onClick={() => navigate('/login')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-lg font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                    <LayoutDashboard size={20} /> Acessar Painel
                 </button>
             </div>

             <div className="mt-24 relative w-full max-w-5xl mx-auto group animate-in slide-in-from-bottom-10 duration-1000 delay-300">
                 <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                 <div className="relative bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden aspect-[16/9] flex items-center justify-center">
                      <div className="text-center">
                          <div className="flex gap-2 justify-center mb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                          </div>
                          <LayoutDashboard size={64} className="mx-auto text-slate-800 mb-4"/>
                          <p className="text-slate-600 font-medium">Dashboard Preview</p>
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

// --- REPLACED PublicStore COMPONENT ---
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
      
      // Load local history
      if (id) {
          const stored = localStorage.getItem(`my_orders_${id}`);
          if (stored) {
              setLocalOrders(JSON.parse(stored));
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
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(p => p.product.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

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
            status: 'new',
            createdAt: serverTimestamp(),
            paymentMethod: customerInfo.paymentMethod
        };

        const docRef = await addDoc(collection(db, `merchants/${id}/orders`), orderData);
        const fullOrder = { id: docRef.id, ...orderData, createdAt: new Date().toISOString() }; // Use ISO string for local storage
        
        setOrderPlaced(fullOrder);
        setCart([]); // Clear cart
        
        // Save to local history
        const updatedHistory = [fullOrder, ...localOrders];
        setLocalOrders(updatedHistory);
        localStorage.setItem(`my_orders_${id}`, JSON.stringify(updatedHistory));

    } catch (error) {
        console.error("Error placing order:", error);
        alert("Ocorreu um erro ao enviar o pedido. Tente novamente.");
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
        `\n\n💰 *Total: R$ ${orderPlaced.total.toFixed(2)}*\n` +
        `📍 *Endereço:* ${orderPlaced.deliveryAddress.street || 'Retirada/Não informado'}\n` +
        `💳 *Pagamento:* ${orderPlaced.paymentMethod === 'pix' ? 'Pix' : orderPlaced.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}`;

    if (config?.whatsapp) {
        openWhatsApp(config.whatsapp, message);
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!config) return <div className="text-center py-20">Loja não encontrada.</div>;

  return (
      <div className="min-h-screen bg-white font-sans text-slate-900">
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
             <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                     {config.logoUrl && <img src={config.logoUrl} className="w-8 h-8 rounded-full object-cover"/>}
                     <span className="font-bold text-lg">{config.storeName}</span>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setHistoryOpen(true)} className="p-2 hover:bg-slate-100 rounded-full relative" title="Meus Pedidos">
                         <History size={24} className="text-slate-600"/>
                     </button>
                     <button onClick={() => setCartOpen(true)} className="relative p-2 hover:bg-slate-100 rounded-full">
                         <ShoppingBag size={24} className="text-slate-600"/>
                         {cart.length > 0 && <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">{cart.reduce((a,b)=>a+b.quantity,0)}</span>}
                     </button>
                 </div>
             </div>
          </header>

          {/* BANNER SECTION - Centered */}
          <div className="relative w-full">
              <div className="h-32 md:h-64 w-full bg-cover bg-center" style={{ 
                  backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #ea1d2c, #b91c1c)',
                  backgroundColor: config.themeColor 
              }}></div>
              <div className="max-w-7xl mx-auto px-4 relative -mt-12 md:-mt-16 mb-8 flex flex-col items-center gap-4 z-10 text-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden shrink-0 flex items-center justify-center">
                      {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className="text-slate-300"><Store size={40}/></div>}
                  </div>
                  <div className="pb-2">
                      <h1 className="font-bold text-3xl text-slate-900 leading-tight drop-shadow-sm">{config.storeName}</h1>
                      {config.description && <p className="text-slate-600 font-medium mt-1 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full inline-block shadow-sm">{config.description}</p>}
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
                          {localOrders.map((order, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="font-bold text-sm">#{order.id.slice(0, 8)}</span>
                                      <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="space-y-1 mb-3">
                                      {order.items.map((item: any, i: number) => (
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
                                      <span className="font-bold text-indigo-600 text-sm">R$ {order.total.toFixed(2)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* Shopping Cart Sidebar */}
          {cartOpen && (
              <div className="fixed inset-0 z-50 flex justify-end">
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !orderPlaced && setCartOpen(false)}></div>
                  <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
                      
                      {/* Header */}
                      <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
                          <h3 className="font-bold text-lg text-slate-800">{orderPlaced ? 'Pedido Confirmado' : 'Seu Pedido'}</h3>
                          <button onClick={() => { setCartOpen(false); if(orderPlaced) setOrderPlaced(null); }} className="p-1 hover:bg-slate-200 rounded-full"><X size={24} className="text-slate-500"/></button>
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
                                  <p className="flex justify-between"><span>Subtotal:</span> <span className="font-bold">R$ {orderPlaced.total.toFixed(2)}</span></p>
                                  <p className="flex justify-between"><span>Pagamento:</span> <span className="uppercase font-bold text-xs bg-white px-2 py-0.5 rounded border">{orderPlaced.paymentMethod}</span></p>
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
                          // CART & CHECKOUT VIEW
                          <>
                              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                  {cart.map(item => (
                                      <div key={item.product.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
                                             {item.product.imageUrl && <img src={item.product.imageUrl} className="w-full h-full object-cover"/>}
                                          </div>
                                          <div className="flex-1">
                                              <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{item.product.name}</h4>
                                              <p className="text-xs text-slate-500 mb-2">Unitário: R$ {item.product.price.toFixed(2)}</p>
                                              <div className="flex items-center justify-between">
                                                  <span className="font-bold text-indigo-600">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-2 py-1">
                                                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 font-bold hover:bg-white rounded px-1">-</button>
                                                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                      <button onClick={() => addToCart(item.product)} className="text-green-600 font-bold hover:bg-white rounded px-1">+</button>
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
                                      <div className="space-y-3">
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                              placeholder="Seu Nome (Obrigatório)" 
                                              value={customerInfo.name}
                                              onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                                          />
                                          <input 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                              placeholder="WhatsApp / Telefone (Obrigatório)" 
                                              value={customerInfo.phone}
                                              onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                          />
                                          <textarea 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                                              placeholder="Endereço de Entrega (Rua, Número, Bairro...)" 
                                              rows={2}
                                              value={customerInfo.address}
                                              onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                                          />
                                          <select 
                                              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                              value={customerInfo.paymentMethod}
                                              onChange={e => setCustomerInfo({...customerInfo, paymentMethod: e.target.value})}
                                          >
                                              <option value="pix">Pagamento via Pix</option>
                                              <option value="card">Cartão de Crédito/Débito (Maquininha)</option>
                                              <option value="cash">Dinheiro</option>
                                          </select>
                                      </div>

                                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                          <span className="font-bold text-slate-500">Total a Pagar</span>
                                          <span className="font-bold text-2xl text-slate-900">R$ {total.toFixed(2)}</span>
                                      </div>
                                      
                                      <button 
                                          onClick={handlePlaceOrder} 
                                          disabled={submitting} 
                                          className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                      >
                                          {submitting ? <Loader2 className="animate-spin"/> : <Check size={20}/>}
                                          Finalizar Pedido
                                      </button>
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
                ordersSnap.forEach(d => revenue += (d.data().total || 0));

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
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Faturamento Total</span>
                    <span className="text-3xl font-bold text-slate-800">R$ {stats.revenue.toFixed(2)}</span>
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
    { icon: Store, label: 'Minha Loja', path: '/dashboard/store' },
    { icon: MessageSquare, label: 'WhatsApp Bot', path: '/dashboard/whatsapp' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm relative`}>
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
                className="absolute top-1/2 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 shadow-sm z-50 hidden md:flex"
            >
                {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Top Mobile Bar */}
          <div className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 shrink-0">
               <AppLogo collapsed={true}/>
               <button onClick={logout}><LogOut size={20} className="text-slate-500"/></button>
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth">
             <Routes>
                <Route path="/" element={<DashboardOverview user={user} />} />
                <Route path="products" element={<ProductsManager user={user} />} />
                <Route path="clients" element={<ClientsManager user={user} />} />
                <Route path="orders" element={<OrdersManager user={user} />} />
                <Route path="store" element={<StoreEditor user={user} />} />
                <Route path="whatsapp" element={<WhatsAppBot user={user} />} />
             </Routes>
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