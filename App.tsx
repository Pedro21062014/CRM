import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import * as firebaseAuth from 'firebase/auth';
const { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = firebaseAuth as any;
type User = any;
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit, runTransaction } from 'firebase/firestore';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag, MapPin, Clock, Star, History, Menu, Phone
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus } from './types';
import { HeroSection, TextSection, ProductGridSection } from './components/StoreComponents';

// --- Shared Components ---

const LoadingSpinner = () => (
  <div className="flex h-64 w-full items-center justify-center text-slate-400">
    <Loader2 className="animate-spin mr-2" size={32} />
    <span className="font-medium text-slate-500">Carregando...</span>
  </div>
);

const AppLogo = ({ collapsed }: { collapsed?: boolean }) => (
  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300 group`}>
    <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-all duration-300 transform group-hover:scale-105">
      <Rocket size={20} strokeWidth={2.5} />
    </div>
    {!collapsed && (
      <div className="flex flex-col animate-in fade-in duration-300">
        <span className="font-bold text-xl text-slate-900 tracking-tight leading-none font-sans">Nova<span className="text-indigo-600">CRM</span></span>
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

const IconButton = ({ onClick, icon: Icon, colorClass = "text-slate-500 hover:text-slate-700", className }: any) => (
  <button onClick={onClick} className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${colorClass} ${className}`}>
    <Icon size={18} />
  </button>
);

// --- Auth Component ---
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError("Erro na autenticação. Verifique seus dados.");
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-10 border border-slate-100">
        <div className="flex justify-center mb-8">
          <AppLogo />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
        <p className="text-slate-500 mb-8 text-center text-sm">Gerencie seus clientes e vendas em um só lugar.</p>
        
        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2"><X size={16}/> {error}</div>}
        
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="seu@email.com"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold hover:shadow-lg hover:from-black hover:to-slate-900 transition-all duration-300 transform hover:-translate-y-0.5">
            {isLogin ? 'Entrar na Plataforma' : 'Criar Conta Grátis'}
          </button>
        </form>

        <div className="my-8 flex items-center">
          <div className="flex-1 border-t border-slate-100"></div>
          <span className="px-4 text-slate-400 text-xs uppercase tracking-widest font-medium">ou continue com</span>
          <div className="flex-1 border-t border-slate-100"></div>
        </div>

        <button onClick={handleGoogle} className="w-full py-3.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Google
        </button>

        <p className="mt-8 text-center text-sm text-slate-500">
          {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Dashboard Sub-Components ---

const StatCard = ({ title, value, icon: Icon, colorFrom, colorTo }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3.5 rounded-xl bg-gradient-to-br ${colorFrom} ${colorTo} shadow-lg text-white group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

// --- Store Editor ---
const StoreEditor = ({ user }: { user: User }) => {
  const [config, setConfig] = useState<StoreConfig>({
    storeName: 'Minha Loja',
    themeColor: '#ea1d2c',
    sections: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  // Fake products for preview
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'merchants', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().storeConfig) {
          setConfig(docSnap.data().storeConfig);
        } else {
          // Default Config
          setConfig({
            storeName: user.displayName || 'Minha Loja',
            description: 'A melhor comida da região! Entregamos rápido.',
            themeColor: '#ea1d2c',
            sections: [
              { id: '2', type: 'products', title: 'Destaques', backgroundColor: '#ffffff' }
            ]
          });
        }
        
        // Fetch a few products for preview
        const pQuery = query(collection(db, `merchants/${user.uid}/products`), limit(4));
        const pSnap = await getDocs(pQuery);
        const pList: Product[] = [];
        pSnap.forEach(d => pList.push({id: d.id, ...d.data()} as Product));
        setPreviewProducts(pList);

      } catch(e) {
        console.error("Error loading store config", e);
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
      content: type === 'text' ? 'Digite seu texto aqui...' : 'Subtítulo do banner',
      backgroundColor: '#ffffff',
      textColor: '#000000'
    };
    setConfig(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const updateSection = (id: string, updates: Partial<StoreSection>) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...config.sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    setConfig(prev => ({ ...prev, sections: newSections }));
  };

  const removeSection = (id: string) => {
    if(confirm('Remover esta seção?')) {
      setConfig(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
      if(activeSectionId === id) setActiveSectionId(null);
    }
  };

  const publicLink = `${window.location.origin}/#/store/${user.uid}`;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Editor Visual</h2>
        </div>
        <div className="flex gap-3">
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
            <ExternalLink size={14} /> Ver Loja
          </a>
          <button onClick={saveConfig} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md transition-all text-sm">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* LEFT COLUMN: Controls */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
            
            {/* Identity Control */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Settings size={18}/> Identidade Visual</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Loja</label>
                        <input className="w-full p-2 border rounded-lg mt-1" value={config.storeName} onChange={e => setConfig({...config, storeName: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição / Slogan</label>
                        <input className="w-full p-2 border rounded-lg mt-1" value={config.description || ''} onChange={e => setConfig({...config, description: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor Principal</label>
                            <div className="flex items-center gap-2 mt-1 border rounded-lg p-1">
                                <input type="color" className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" value={config.themeColor} onChange={e => setConfig({...config, themeColor: e.target.value})} />
                                <span className="text-xs text-slate-500">{config.themeColor}</span>
                            </div>
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logo & Banner</label>
                            <div className="flex flex-col gap-2 mt-1">
                                <input className="w-full p-2 text-xs border rounded-lg" placeholder="URL do Logo" value={config.logoUrl || ''} onChange={e => setConfig({...config, logoUrl: e.target.value})} />
                                <input className="w-full p-2 text-xs border rounded-lg" placeholder="URL do Banner" value={config.bannerUrl || ''} onChange={e => setConfig({...config, bannerUrl: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections List */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutGrid size={18}/> Seções da Loja</h3>
                     <div className="flex gap-2">
                         <button onClick={() => addSection('hero')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Banner"><ImageIcon size={16}/></button>
                         <button onClick={() => addSection('products')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Produtos"><ShoppingBag size={16}/></button>
                         <button onClick={() => addSection('text')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Texto"><Type size={16}/></button>
                     </div>
                </div>
                
                <div className="space-y-2">
                    {config.sections.map((section, idx) => (
                        <div key={section.id} className={`border rounded-lg transition-all ${activeSectionId === section.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setActiveSectionId(activeSectionId === section.id ? null : section.id)}>
                                <span className="font-medium text-sm text-slate-700">
                                    {section.type === 'hero' ? 'Banner' : section.type === 'products' ? 'Lista de Produtos' : 'Texto'}
                                    <span className="text-slate-400 font-normal ml-2 text-xs">#{idx+1}</span>
                                </span>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => {e.stopPropagation(); moveSection(idx, 'up')}} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ChevronUp size={14}/></button>
                                    <button onClick={(e) => {e.stopPropagation(); moveSection(idx, 'down')}} className="p-1 hover:bg-slate-200 rounded text-slate-400"><ChevronDown size={14}/></button>
                                    <button onClick={(e) => {e.stopPropagation(); removeSection(section.id)}} className="p-1 hover:bg-red-100 text-red-400 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            
                            {/* Inline Editor */}
                            {activeSectionId === section.id && (
                                <div className="p-3 border-t border-indigo-100 bg-white rounded-b-lg space-y-3 animate-in slide-in-from-top-2">
                                    <input className="w-full p-2 border rounded text-sm" placeholder="Título da Seção" value={section.title || ''} onChange={e => updateSection(section.id, {title: e.target.value})} />
                                    {(section.type === 'hero' || section.type === 'text') && (
                                        <textarea className="w-full p-2 border rounded text-sm" rows={2} placeholder="Conteúdo / Subtítulo" value={section.content || ''} onChange={e => updateSection(section.id, {content: e.target.value})} />
                                    )}
                                    {(section.type === 'hero' || section.type === 'image') && (
                                        <input className="w-full p-2 border rounded text-sm" placeholder="URL da Imagem de Fundo" value={section.imageUrl || ''} onChange={e => updateSection(section.id, {imageUrl: e.target.value})} />
                                    )}
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-bold uppercase text-slate-400">Fundo</label>
                                            <input type="color" className="w-6 h-6 border-none bg-transparent cursor-pointer" value={section.backgroundColor || '#ffffff'} onChange={e => updateSection(section.id, {backgroundColor: e.target.value})} />
                                        </div>
                                         <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-bold uppercase text-slate-400">Texto</label>
                                            <input type="color" className="w-6 h-6 border-none bg-transparent cursor-pointer" value={section.textColor || '#000000'} onChange={e => updateSection(section.id, {textColor: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {config.sections.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhuma seção adicionada.</p>}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Mobile Preview */}
        <div className="w-1/2 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded">Preview em Tempo Real</div>
            
            {/* Phone Mockup */}
            <div className="w-[340px] h-[680px] bg-white rounded-[40px] shadow-2xl border-8 border-slate-800 overflow-hidden relative flex flex-col">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-gray-50">
                    {/* Preview Header */}
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

                    {/* Preview Sections */}
                    <div className="pb-10">
                        {config.sections.map(section => {
                            if (section.type === 'products') {
                                return (
                                    <div key={section.id} className="p-4">
                                        <h2 className="font-bold text-slate-800 text-sm mb-3">{section.title || 'Produtos'}</h2>
                                        <div className="space-y-3">
                                            {(previewProducts.length > 0 ? previewProducts : [1,2]).map((p: any, i) => (
                                                <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3">
                                                    <div className="flex-1">
                                                        <div className="h-3 w-24 bg-slate-200 rounded mb-2"></div>
                                                        <div className="h-2 w-full bg-slate-100 rounded mb-1"></div>
                                                        <div className="h-2 w-16 bg-slate-100 rounded"></div>
                                                    </div>
                                                    <div className="w-16 h-16 bg-slate-100 rounded-lg"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }
                            if (section.type === 'hero') return (
                                <div key={section.id} className="mx-4 mt-4 h-32 rounded-xl flex items-center justify-center text-center p-4 bg-cover bg-center" style={{
                                    backgroundColor: section.backgroundColor, 
                                    backgroundImage: section.imageUrl ? `linear-gradient(rgba(0,0,0,0.3),rgba(0,0,0,0.3)), url(${section.imageUrl})` : 'none',
                                    color: section.textColor
                                }}>
                                    <div>
                                        <h2 className="font-bold text-lg leading-tight">{section.title}</h2>
                                        <p className="text-xs opacity-90">{section.content}</p>
                                    </div>
                                </div>
                            );
                            if (section.type === 'text') return (
                                <div key={section.id} className="p-4 text-center" style={{backgroundColor: section.backgroundColor, color: section.textColor}}>
                                    <h3 className="font-bold mb-1">{section.title}</h3>
                                    <p className="text-xs">{section.content}</p>
                                </div>
                            )
                            return null;
                        })}
                    </div>
                </div>

                {/* Fake Bottom Bar */}
                <div className="h-12 bg-white border-t flex justify-around items-center px-4">
                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Products Manager ---
const ProductsManager = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);

  // Form State
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
    if (!formData.name || !formData.price) return;
    
    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price),
        description: formData.description || '',
        category: formData.category || 'Geral',
        imageUrl: formData.imageUrl || '',
        stock: Number(formData.stock || 0),
        updatedAt: serverTimestamp()
      };

      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/products`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/products`), { ...payload, createdAt: serverTimestamp() });
      }
      setEditing(null);
      setFormData({});
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar produto: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteDoc(doc(db, `merchants/${user.uid}/products`, id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Produtos</h2>
          <p className="text-slate-500 text-sm">Gerencie seu catálogo de vendas</p>
        </div>
        <PrimaryButton onClick={() => { setEditing({} as Product); setFormData({}); }}>
          <Plus size={18} /> Novo Produto
        </PrimaryButton>
      </div>

      {(editing || Object.keys(formData).length > 0 && editing !== null) && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <h3 className="font-bold mb-6 text-xl text-slate-800">{editing?.id ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: X-Burguer" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preço (R$)</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="number" step="0.01" placeholder="0.00" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Lanches" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">URL da Imagem</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} placeholder="Pão, carne, queijo..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setEditing(null)} className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">Salvar Produto</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
           <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="p-5 font-bold text-xs text-slate-500 uppercase tracking-wider">Produto</th>
                  <th className="p-5 font-bold text-xs text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="p-5 font-bold text-xs text-slate-500 uppercase tracking-wider">Preço</th>
                  <th className="p-5 font-bold text-xs text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="p-5">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>}
                         </div>
                         <span className="font-semibold text-slate-800">{p.name}</span>
                       </div>
                     </td>
                     <td className="p-5">
                         <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">{p.category}</span>
                     </td>
                     <td className="p-5 text-slate-900 font-bold">R$ {p.price.toFixed(2)}</td>
                     <td className="p-5 text-right">
                       <IconButton onClick={() => { setEditing(p); setFormData(p); }} icon={Edit2} colorClass="text-indigo-500 hover:bg-indigo-50" />
                       <IconButton onClick={() => handleDelete(p.id)} icon={Trash2} colorClass="text-red-500 hover:bg-red-50" />
                     </td>
                   </tr>
                 ))}
                 {products.length === 0 && (
                   <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum produto cadastrado.</td></tr>
                 )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Clients Manager ---
const ClientsManager = ({ user }: { user: User }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/clients`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Client));
      setClients(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500 text-sm">Base de clientes gerada pelas vendas</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-100">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors">{client.name}</h4>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Cliente desde {client.createdAt ? new Date(client.createdAt.seconds * 1000).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <span className="text-sm">📧 {client.email}</span>
                </div>
                {client.address && (
                    <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <span className="text-sm">📍 {client.address.street}, {client.address.number} - {client.address.neighborhood}</span>
                    </div>
                )}
              </div>
            </div>
          ))}
          {clients.length === 0 && (
              <div className="col-span-full p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4"><Users size={32}/></div>
                <h3 className="text-slate-800 font-bold mb-1">Nenhum cliente ainda</h3>
                <p className="text-slate-400 max-w-xs mx-auto">Os clientes serão adicionados automaticamente aqui quando realizarem uma compra na sua loja.</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

// --- Orders Manager ---
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

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    await updateDoc(doc(db, `merchants/${user.uid}/orders`, orderId), { status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case OrderStatus.NEW: return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">NOVO</span>;
      case OrderStatus.PROCESSING: return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">PREPARANDO</span>;
      case OrderStatus.COMPLETED: return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">ENTREGUE</span>;
      case OrderStatus.CANCELLED: return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">CANCELADO</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800">Vendas</h2>
        <p className="text-slate-500 text-sm">Acompanhe e gerencie os pedidos da sua loja</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:shadow-md transition-all relative overflow-hidden">
               {/* Status Indicator Stripe */}
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                   order.status === OrderStatus.NEW ? 'bg-blue-500' : 
                   order.status === OrderStatus.COMPLETED ? 'bg-emerald-500' :
                   order.status === OrderStatus.PROCESSING ? 'bg-amber-500' : 'bg-red-400'
               }`}></div>
               
              <div className="pl-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">#{order.id.slice(-6)}</span>
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-slate-400 flex items-center gap-1">• {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : ''}</span>
                  {order.rating && (
                     <div className="flex items-center gap-1 ml-2 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                        <Star size={12} className="text-amber-500 fill-amber-500"/> <span className="text-xs font-bold text-amber-600">{order.rating}</span>
                     </div>
                  )}
                </div>
                <h4 className="font-bold text-slate-800 text-lg">{order.customerName}</h4>
                 <div className="text-sm text-slate-500 mb-3 flex flex-col">
                    <span>{order.customerPhone}</span>
                    {order.deliveryAddress && (
                        <span className="flex items-center gap-1"><MapPin size={12}/> {order.deliveryAddress.street}, {order.deliveryAddress.number} - {order.deliveryAddress.neighborhood}</span>
                    )}
                </div>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block min-w-[300px]">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                        <span>{item.quantity}x {item.productName}</span>
                        <span className="font-medium text-slate-900">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 pl-4 md:border-l md:border-slate-100 md:pl-8">
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total do Pedido</p>
                    <span className="text-3xl font-bold text-slate-900">R$ {order.total.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  {order.status === OrderStatus.NEW && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.PROCESSING)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">Aceitar Pedido</button>
                  )}
                  {order.status === OrderStatus.PROCESSING && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.COMPLETED)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all">Concluir Entrega</button>
                  )}
                  {(order.status === OrderStatus.NEW || order.status === OrderStatus.PROCESSING) && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.CANCELLED)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-red-600 transition-all">Cancelar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Dashboard Layout ---
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (!currentUser) navigate('/login');
      else setUser(currentUser);
    });
    return unsubscribe;
  }, [navigate]);

  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `merchants/${user.uid}/orders`), where('status', '==', 'new'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.docs.length);
    });
    return unsubscribe;
  }, [user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  const currentPath = location.pathname.split('/').pop() || 'overview';

  // FIX: Absolute paths to prevent nesting errors
  const NavItem = ({ to, pathName, icon: Icon, label }: any) => {
    // Check if the current path ENDS with the pathName (handling trailing slashes or sub-routes)
    const isActive = location.pathname === to || (to === '/dashboard' && location.pathname === '/dashboard');
    
    return (
      <Link 
        to={to} 
        title={collapsed ? label : ''}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
          isActive 
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
            : 'text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'
        } ${collapsed ? 'justify-center px-2' : ''}`}
      >
        <Icon size={20} className={isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
        {!collapsed && <span>{label}</span>}
        {!collapsed && pathName === 'sales' && notificationCount > 0 && (
          <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-rose-200">{notificationCount}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* Sidebar (Desktop) */}
      <aside 
        className={`bg-[#F8FAFC] hidden md:flex flex-col fixed h-full z-20 transition-all duration-300 ease-in-out border-r border-slate-200/60 ${
          collapsed ? 'w-24' : 'w-72'
        }`}
      >
        <div className={`p-8 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={collapsed ? 'scale-75' : ''}>
            <AppLogo collapsed={collapsed} />
          </div>
        </div>
        
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-24 bg-white border border-slate-200 p-1.5 rounded-full shadow-sm hover:bg-slate-50 text-slate-400 hover:text-indigo-600 z-30 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {/* USANDO CAMINHOS ABSOLUTOS PARA CORRIGIR ERRO DE ROTA */}
          <NavItem to="/dashboard" pathName="overview" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem to="/dashboard/products" pathName="products" icon={Package} label="Produtos" />
          <NavItem to="/dashboard/sales" pathName="sales" icon={ShoppingCart} label="Vendas" />
          <NavItem to="/dashboard/clients" pathName="clients" icon={Users} label="Clientes" />
          <div className="my-4 border-t border-slate-200/60 mx-2"></div>
          <NavItem to="/dashboard/store-editor" pathName="store-editor" icon={Store} label="Editor Loja" />
        </nav>
        
        <div className="p-4 mx-4 mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 p-[2px]">
               <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                   {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="font-bold text-indigo-600">{user.email?.charAt(0).toUpperCase()}</div>}
               </div>
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user.displayName || 'Lojista'}</p>
                <p className="text-[10px] text-slate-400 truncate font-medium uppercase tracking-wide">Plano Grátis</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => signOut(auth)} 
            title={collapsed ? "Sair" : ""}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-red-500 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} /> {!collapsed && 'Sair da conta'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-24' : 'md:ml-72'
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <AppLogo collapsed={true} />
          <div className="flex gap-4 items-center">
             <Link to="/dashboard/sales" className="relative p-2 rounded-full hover:bg-slate-50">
               <Bell size={24} className="text-slate-600"/>
               {notificationCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
             </Link>
             <button onClick={() => signOut(auth)}><LogOut size={24} className="text-slate-600"/></button>
          </div>
        </div>

        {/* Dynamic Mobile Nav - Absolute Paths */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
           <Link to="/dashboard" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Visão Geral</Link>
           <Link to="/dashboard/products" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Produtos</Link>
           <Link to="/dashboard/sales" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Vendas</Link>
           <Link to="/dashboard/store-editor" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Editor</Link>
        </div>

        <Routes>
          <Route path="/" element={<Overview user={user} />} />
          <Route path="/products" element={<ProductsManager user={user} />} />
          <Route path="/clients" element={<ClientsManager user={user} />} />
          <Route path="/sales" element={<OrdersManager user={user} />} />
          <Route path="/store-editor" element={<StoreEditor user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

const Overview = ({ user }: { user: User }) => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0 });

  useEffect(() => {
    const qOrders = query(collection(db, `merchants/${user.uid}/orders`));
    const unsubscribe = onSnapshot(qOrders, (snap) => {
      let rev = 0;
      snap.forEach(d => rev += d.data().total);
      setStats(prev => ({ ...prev, revenue: rev, orders: snap.size }));
    });
    return unsubscribe;
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Olá, {user.displayName?.split(' ')[0] || 'Lojista'} 👋</h1>
            <p className="text-slate-500 mt-1">Aqui está o resumo do desempenho da sua loja hoje.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita Total" value={`R$ ${stats.revenue.toFixed(2)}`} icon={ShoppingCart} colorFrom="from-emerald-400" colorTo="to-emerald-600" />
        <StatCard title="Vendas Realizadas" value={stats.orders} icon={Package} colorFrom="from-indigo-400" colorTo="to-indigo-600" />
        <StatCard title="Novos Clientes" value="-" icon={Users} colorFrom="from-violet-400" colorTo="to-violet-600" />
        <StatCard title="Visitas Loja" value="-" icon={Store} colorFrom="from-amber-400" colorTo="to-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Configure sua Loja</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">Adicione um banner e logo para passar mais credibilidade.</p>
                    <Link to="/dashboard/store-editor" className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                        Abrir Editor <ArrowRight size={16}/>
                    </Link>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Acesso Rápido</h3>
                <div className="space-y-3">
                    <button className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-slate-100 text-left" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/#/store/${user.uid}`);
                        alert('Link copiado!');
                    }}>
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <ExternalLink size={20} />
                        </div>
                        <span className="font-medium text-slate-600 group-hover:text-slate-900">Copiar Link da Loja</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- PUBLIC STORE FRONT ---
const PublicStore = () => {
  const { id } = useParams(); // Merchant ID
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  
  // Checkout & Customer State
  const [customerInfo, setCustomerInfo] = useState({ 
    name: '', email: '', phone: '',
    street: '', number: '', neighborhood: '', city: '', zip: '', complement: ''
  });

  const [localOrderHistory, setLocalOrderHistory] = useState<any[]>([]); // Static local storage data
  const [liveOrders, setLiveOrders] = useState<Order[]>([]); // Data fetched from firestore

  useEffect(() => {
    if (!id) return;
    
    // Load local history
    const saved = localStorage.getItem(`my_orders_${id}`);
    if(saved) setLocalOrderHistory(JSON.parse(saved));

    const fetchData = async () => {
      // 1. Get Store Config
      const merchantDoc = await getDoc(doc(db, 'merchants', id));
      if (merchantDoc.exists() && merchantDoc.data().storeConfig) {
        setConfig(merchantDoc.data().storeConfig);
      } else {
         setConfig({ storeName: 'Loja', themeColor: '#ea1d2c', sections: [] });
      }

      // 2. Get Products
      const q = query(collection(db, `merchants/${id}/products`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Product));
        setProducts(items);
      });
      return unsubscribe; 
    };
    fetchData();
  }, [id]);

  // Fetch live order status when modal is open
  useEffect(() => {
    if (isOrdersOpen && localOrderHistory.length > 0 && id) {
        const fetchStatus = async () => {
            const ordersList: Order[] = [];
            for (const localOrder of localOrderHistory) {
                try {
                    const docSnap = await getDoc(doc(db, `merchants/${id}/orders`, localOrder.id));
                    if(docSnap.exists()) {
                        ordersList.push({ id: docSnap.id, ...docSnap.data() } as Order);
                    }
                } catch(e) {
                    console.error("Error fetching order status", e);
                }
            }
            // Sort by date desc
            ordersList.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);
            setLiveOrders(ordersList);
        };
        fetchStatus();
    }
  }, [isOrdersOpen, localOrderHistory, id]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleRating = async (orderId: string, rating: number) => {
      if(!id) return;
      try {
          await runTransaction(db, async (transaction) => {
             // 1. Update Order
             const orderRef = doc(db, `merchants/${id}/orders`, orderId);
             transaction.update(orderRef, { rating });

             // 2. Update Merchant Stats
             const merchantRef = doc(db, 'merchants', id);
             const merchantDoc = await transaction.get(merchantRef);
             if(merchantDoc.exists()) {
                 const currentConfig = merchantDoc.data().storeConfig || {};
                 const newCount = (currentConfig.ratingCount || 0) + 1;
                 const newSum = (currentConfig.ratingSum || 0) + rating;
                 
                 transaction.update(merchantRef, {
                     "storeConfig.ratingCount": newCount,
                     "storeConfig.ratingSum": newSum
                 });
                 // Update local config state to reflect change immediately
                 setConfig(prev => prev ? ({...prev, ratingCount: newCount, ratingSum: newSum}) : null);
             }
          });
          // Refresh live orders
          setLiveOrders(prev => prev.map(o => o.id === orderId ? {...o, rating} : o));
          alert("Obrigado pela avaliação!");
      } catch (e) {
          console.error("Error rating", e);
          alert("Erro ao enviar avaliação.");
      }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || cart.length === 0) return;

    try {
      const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
      
      const orderPayload = {
        merchantId: id,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        deliveryAddress: {
            street: customerInfo.street,
            number: customerInfo.number,
            neighborhood: customerInfo.neighborhood,
            city: customerInfo.city,
            zip: customerInfo.zip,
            complement: customerInfo.complement || ''
        },
        items: cart.map(i => ({ 
          productId: i.product.id, 
          productName: i.product.name, 
          quantity: i.qty, 
          price: i.product.price,
          imageUrl: i.product.imageUrl || ''
        })),
        total,
        status: 'new',
        createdAt: serverTimestamp()
      };

      // 1. Create Order
      const orderRef = await addDoc(collection(db, `merchants/${id}/orders`), orderPayload);

      // 2. Handle Client (Deduplication)
      const clientsRef = collection(db, `merchants/${id}/clients`);
      const q = query(clientsRef, where("email", "==", customerInfo.email), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing client
        const clientDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, `merchants/${id}/clients`, clientDoc.id), {
          lastOrderDate: serverTimestamp(),
          phone: customerInfo.phone, // Update contact info
          address: orderPayload.deliveryAddress,
          totalOrders: (clientDoc.data().totalOrders || 0) + 1
        });
      } else {
        // Create new client
        await addDoc(clientsRef, {
            name: customerInfo.name,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: orderPayload.deliveryAddress,
            createdAt: serverTimestamp(),
            lastOrderDate: serverTimestamp(),
            totalOrders: 1
        });
      }

      // 3. Local History
      const newHistory = [{ id: orderRef.id, date: new Date().toISOString(), status: 'new', total }, ...localOrderHistory];
      setLocalOrderHistory(newHistory);
      localStorage.setItem(`my_orders_${id}`, JSON.stringify(newHistory));

      alert('Pedido realizado com sucesso!');
      setCart([]);
      setIsCheckoutOpen(false);
      setIsOrdersOpen(true); // Open orders view to show confirmation
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pedido.');
    }
  };

  if (!config) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  const averageRating = (config.ratingSum && config.ratingCount) ? (config.ratingSum / config.ratingCount).toFixed(1) : '5.0';

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* Header Style iFood */}
      <div className="bg-white shadow-sm">
          {/* Banner */}
          <div className="h-32 md:h-48 w-full bg-cover bg-center relative" style={{ 
              backgroundImage: config.bannerUrl ? `url(${config.bannerUrl})` : 'linear-gradient(to right, #ea1d2c, #b91c1c)',
              backgroundColor: config.themeColor 
          }}>
             <div className="absolute inset-0 bg-black/10"></div>
          </div>
          
          {/* Store Info */}
          <div className="max-w-5xl mx-auto px-4 pb-6 relative">
             <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-10 md:-mt-12 relative z-10">
                 <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                    {config.logoUrl ? (
                        <img src={config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Store size={40} style={{ color: config.themeColor }} />
                    )}
                 </div>
                 <div className="flex-1 pt-2 md:pt-0">
                     <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{config.storeName}</h1>
                     <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-amber-500 font-bold"><Star size={14} fill="currentColor" /> {averageRating}</span>
                        <span>• {config.description || 'Lanches • Bebidas • Sobremesas'}</span>
                     </div>
                 </div>
                 <div className="mt-4 md:mt-0 flex gap-2 w-full md:w-auto">
                    {localOrderHistory.length > 0 && (
                        <button onClick={() => setIsOrdersOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <History size={18}/> Pedidos
                        </button>
                    )}
                 </div>
             </div>
          </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-8">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-200" placeholder="Buscar no cardápio..." />
        </div>

        {/* Sections */}
        {config.sections.map(section => {
          // Custom Product Grid for iFood style
          if (section.type === 'products') {
             return (
                 <div key={section.id} className="mb-10">
                     <h2 className="text-xl font-bold text-slate-800 mb-4">{section.title || 'Produtos'}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {products.map(product => (
                             <div key={product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex justify-between gap-4 group cursor-pointer" onClick={() => addToCart(product)}>
                                 <div className="flex flex-col justify-between flex-1">
                                     <div>
                                         <h3 className="font-bold text-slate-800 mb-1">{product.name}</h3>
                                         <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
                                     </div>
                                     <p className="font-medium text-slate-900 mt-2">R$ {product.price.toFixed(2)}</p>
                                 </div>
                                 <div className="w-28 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                     {product.imageUrl ? (
                                         <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                                     )}
                                     <div className="absolute bottom-0 right-0 p-1.5 bg-white rounded-tl-lg shadow-sm">
                                         <Plus size={16} color={config.themeColor} />
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )
          }
          if (section.type === 'hero') return <div className="mb-8 rounded-2xl overflow-hidden"><HeroSection key={section.id} section={section} /></div>;
          if (section.type === 'text') return <TextSection key={section.id} section={section} />;
          return null;
        })}

        {config.sections.length === 0 && products.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between gap-4" onClick={() => addToCart(product)}>
                        <div className="flex flex-col justify-between flex-1">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-1">{product.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
                            </div>
                            <p className="font-medium text-slate-900 mt-2">R$ {product.price.toFixed(2)}</p>
                        </div>
                        <div className="w-28 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                                <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
        )}
      </main>

      {/* Floating Cart Button (Mobile) */}
      {cart.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-40">
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full bg-red-600 text-white p-4 rounded-xl shadow-lg flex justify-between items-center font-bold"
                style={{ backgroundColor: config.themeColor }}
              >
                  <span className="bg-black/20 px-3 py-1 rounded-full text-sm">{cart.reduce((a,b) => a + b.qty, 0)}</span>
                  <span>Ver Sacola</span>
                  <span>R$ {cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0).toFixed(2)}</span>
              </button>
          </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-10 duration-300 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800">Finalizar Pedido</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-slate-50 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-gray-50 pb-4">
                  <div className="flex gap-3">
                      <span className="font-bold text-slate-500">{item.qty}x</span>
                      <div>
                        <p className="font-medium text-slate-800">{item.product.name}</p>
                        <p className="text-sm text-slate-500">R$ {item.product.price.toFixed(2)}</p>
                      </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                       <span className="font-medium text-slate-900">R$ {(item.product.price * item.qty).toFixed(2)}</span>
                       <button onClick={() => removeFromCart(item.product.id)} className="text-xs text-red-500 font-medium">Remover</button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center py-2">
                 <span className="font-bold text-lg">Total</span>
                 <span className="font-bold text-xl text-slate-900">R$ {cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0).toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4 pt-2">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2"><Users size={16}/> Seus Dados</h4>
                <div className="grid grid-cols-1 gap-3">
                   <input className="input-field" placeholder="Nome Completo" required value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                   <input className="input-field" type="email" placeholder="Email" required value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
                   <input className="input-field" type="tel" placeholder="Telefone / WhatsApp" required value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                </div>

                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2 mt-4"><MapPin size={16}/> Endereço de Entrega</h4>
                <div className="grid grid-cols-4 gap-3">
                   <input className="input-field col-span-3" placeholder="Rua / Avenida" required value={customerInfo.street} onChange={e => setCustomerInfo({...customerInfo, street: e.target.value})} />
                   <input className="input-field col-span-1" placeholder="Nº" required value={customerInfo.number} onChange={e => setCustomerInfo({...customerInfo, number: e.target.value})} />
                   <input className="input-field col-span-2" placeholder="Bairro" required value={customerInfo.neighborhood} onChange={e => setCustomerInfo({...customerInfo, neighborhood: e.target.value})} />
                   <input className="input-field col-span-2" placeholder="Cidade" required value={customerInfo.city} onChange={e => setCustomerInfo({...customerInfo, city: e.target.value})} />
                   <input className="input-field col-span-4" placeholder="Complemento (Opcional)" value={customerInfo.complement} onChange={e => setCustomerInfo({...customerInfo, complement: e.target.value})} />
                </div>
                
                <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 hover:scale-[1.02] transition-all shadow-lg shadow-green-100 mt-4 text-lg">
                  Fazer Pedido
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* My Orders Modal */}
      {isOrdersOpen && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-slate-800">Meus Pedidos Recentes</h3>
                      <button onClick={() => setIsOrdersOpen(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-3 bg-gray-50">
                      {liveOrders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10">
                              <Loader2 className="animate-spin text-slate-300 mb-2"/>
                              <p className="text-center text-gray-400 text-sm">Buscando status...</p>
                          </div>
                      ) : (
                          liveOrders.map((o) => (
                              <div key={o.id} className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
                                  <div className="flex justify-between mb-2">
                                      <span className="font-mono text-xs text-slate-400">#{o.id.slice(-6)}</span>
                                      {o.status === OrderStatus.NEW && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">ENVIADO</span>}
                                      {o.status === OrderStatus.PROCESSING && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">PREPARANDO</span>}
                                      {o.status === OrderStatus.COMPLETED && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">ENTREGUE</span>}
                                      {o.status === OrderStatus.CANCELLED && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">CANCELADO</span>}
                                  </div>
                                  <div className="flex justify-between items-end mb-2">
                                      <p className="text-sm text-slate-500">{new Date(o.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                      <p className="font-bold text-slate-800">R$ {o.total.toFixed(2)}</p>
                                  </div>
                                  
                                  {/* RATING AREA */}
                                  {o.status === OrderStatus.COMPLETED && !o.rating && (
                                      <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
                                          <p className="text-xs text-center text-slate-500 mb-2">Avalie sua experiência:</p>
                                          <div className="flex justify-center gap-2">
                                              {[1,2,3,4,5].map(star => (
                                                  <button key={star} onClick={() => handleRating(o.id, star)} className="p-1 hover:scale-110 transition-transform">
                                                      <Star size={20} className="text-slate-300 hover:text-amber-400 hover:fill-amber-400"/>
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                                  {o.rating && (
                                     <div className="mt-2 text-center text-xs text-amber-500 font-bold flex items-center justify-center gap-1">
                                         <Star size={12} fill="currentColor"/> Você avaliou com {o.rating} estrelas
                                     </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .input-field {
            width: 100%;
            padding: 12px;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            outline: none;
            transition: all 0.2s;
        }
        .input-field:focus {
            border-color: ${config.themeColor};
            box-shadow: 0 0 0 2px ${config.themeColor}20;
        }
      `}</style>
    </div>
  );
};

// --- APP ENTRY ---
const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/store/:id" element={<PublicStore />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;