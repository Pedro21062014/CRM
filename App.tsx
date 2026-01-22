import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag
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
    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300 transform group-hover:scale-105">
      <Rocket size={22} strokeWidth={2.5} />
    </div>
    {!collapsed && (
      <div className="flex flex-col animate-in fade-in duration-300">
        <span className="font-bold text-xl text-slate-900 tracking-tight leading-none font-sans">Nova<span className="text-indigo-600">CRM</span></span>
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Store Builder</span>
      </div>
    )}
  </div>
);

const PrimaryButton = ({ children, onClick, className, disabled, type = 'button' }: any) => (
  <button 
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
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
    themeColor: '#0f172a',
    sections: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'merchants', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().storeConfig) {
          setConfig(docSnap.data().storeConfig);
        } else {
          const initialConfig: StoreConfig = {
            storeName: 'Nova Loja',
            themeColor: '#0f172a',
            sections: [
              { id: '1', type: 'hero', title: 'Bem Vindo', content: 'Os melhores produtos para você', backgroundColor: '#1e293b', textColor: '#ffffff' },
              { id: '2', type: 'products', title: 'Produtos em Destaque', backgroundColor: '#f8fafc' }
            ]
          };
          setConfig(initialConfig);
        }
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
      title: type === 'hero' ? 'Novo Banner' : type === 'products' ? 'Meus Produtos' : 'Nova Seção de Texto',
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Editor de Loja</h2>
          <p className="text-slate-500 text-sm">Personalize a aparência da sua loja virtual</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 flex-1 md:flex-none">
            <ExternalLink size={16} /> Ver Loja
          </a>
          <button onClick={saveConfig} disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-50 transition-all flex-1 md:flex-none">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Geral</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Loja</label>
                <input 
                  type="text" 
                  value={config.storeName} 
                  onChange={e => setConfig({...config, storeName: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Adicionar Elemento</h3>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => addSection('hero')} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm transition-all flex flex-col items-center gap-2 text-xs font-medium text-slate-600 group">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform"><ImageIcon size={20} /></div> Banner
              </button>
              <button onClick={() => addSection('products')} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm transition-all flex flex-col items-center gap-2 text-xs font-medium text-slate-600 group">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><LayoutGrid size={20} /></div> Produtos
              </button>
              <button onClick={() => addSection('text')} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 hover:shadow-sm transition-all flex flex-col items-center gap-2 text-xs font-medium text-slate-600 group">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><Type size={20} /></div> Texto
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Camadas</h3>
             <div className="space-y-2">
               {config.sections.map((section, idx) => (
                 <div key={section.id} className={`p-3 border rounded-xl flex items-center justify-between transition-all ${activeSectionId === section.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setActiveSectionId(section.id)}>
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-700 capitalize">{section.type === 'hero' ? 'Banner' : section.type === 'products' ? 'Grade Produtos' : 'Texto'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-30"><ChevronUp size={14}/></button>
                      <button onClick={() => moveSection(idx, 'down')} disabled={idx === config.sections.length - 1} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-30"><ChevronDown size={14}/></button>
                      <button onClick={() => removeSection(section.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md ml-1"><Trash2 size={14}/></button>
                    </div>
                 </div>
               ))}
               {config.sections.length === 0 && <div className="text-center py-6 text-sm text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhuma seção adicionada.</div>}
             </div>
          </div>
        </div>

        {/* Live Preview / Detail Editor */}
        <div className="lg:col-span-2 flex flex-col h-full">
          {activeSectionId ? (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 h-full overflow-y-auto animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit2 size={18} className="text-indigo-600"/> Editando Detalhes</h3>
                <button onClick={() => setActiveSectionId(null)} className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">Concluir</button>
              </div>
              
              {(() => {
                const section = config.sections.find(s => s.id === activeSectionId);
                if (!section) return null;

                return (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Título da Seção</label>
                      <input 
                        type="text" 
                        value={section.title || ''} 
                        onChange={e => updateSection(section.id, { title: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {(section.type === 'hero' || section.type === 'text') && (
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1.5">Conteúdo / Subtítulo</label>
                         <textarea 
                           rows={4}
                           value={section.content || ''} 
                           onChange={e => updateSection(section.id, { content: e.target.value })}
                           className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                         />
                      </div>
                    )}
                    {(section.type === 'hero' || section.type === 'image') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">URL da Imagem de Fundo</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <ImageIcon size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                <input 
                                type="text" 
                                placeholder="https://exemplo.com/imagem.jpg"
                                value={section.imageUrl || ''} 
                                onChange={e => updateSection(section.id, { imageUrl: e.target.value })}
                                className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Recomendamos usar imagens hospedadas (ex: Imgur, Unsplash).</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cor de Fundo</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <input 
                            type="color" 
                            value={section.backgroundColor || '#ffffff'}
                            onChange={e => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="w-10 h-10 border-none rounded-lg cursor-pointer bg-transparent"
                          />
                          <span className="text-sm font-mono text-slate-500 uppercase">{section.backgroundColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cor do Texto</label>
                         <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <input 
                            type="color" 
                            value={section.textColor || '#000000'}
                            onChange={e => updateSection(section.id, { textColor: e.target.value })}
                            className="w-10 h-10 border-none rounded-lg cursor-pointer bg-transparent"
                          />
                          <span className="text-sm font-mono text-slate-500 uppercase">{section.textColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
             <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-full flex flex-col items-center justify-center text-slate-400 gap-4">
               <div className="p-4 bg-white rounded-full shadow-sm">
                 <Edit2 size={32} className="text-slate-300" />
               </div>
               <p className="font-medium">Selecione uma seção à esquerda para editar</p>
             </div>
          )}
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

      if (editing) {
        await updateDoc(doc(db, `merchants/${user.uid}/products`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/products`), { ...payload, createdAt: serverTimestamp() });
      }
      setEditing(null);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto');
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
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Camiseta Básica" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Preço (R$)</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="number" step="0.01" placeholder="0.00" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoria</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Roupas" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Estoque</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="number" placeholder="0" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">URL da Imagem</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Descrição</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" rows={3} placeholder="Detalhes do produto..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
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
                  <th className="p-5 font-bold text-xs text-slate-500 uppercase tracking-wider">Estoque</th>
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
                     <td className="p-5">
                        <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${p.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                             <span className="text-slate-600 text-sm">{p.stock} unid.</span>
                        </div>
                     </td>
                     <td className="p-5 text-right">
                       <IconButton onClick={() => { setEditing(p); setFormData(p); }} icon={Edit2} colorClass="text-indigo-500 hover:bg-indigo-50" />
                       <IconButton onClick={() => handleDelete(p.id)} icon={Trash2} colorClass="text-red-500 hover:bg-red-50" />
                     </td>
                   </tr>
                 ))}
                 {products.length === 0 && (
                   <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhum produto cadastrado. Clique em "Novo Produto" para começar.</td></tr>
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
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Cliente desde {new Date(client.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50 space-y-3">
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">@</div>
                    <span className="text-sm">{client.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">#</div>
                    <span className="text-sm">{client.phone || 'Sem telefone'}</span>
                </div>
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
      case OrderStatus.PROCESSING: return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">EM ANDAMENTO</span>;
      case OrderStatus.COMPLETED: return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">CONCLUÍDO</span>;
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
                  <span className="text-xs text-slate-400 flex items-center gap-1">• {new Date(order.createdAt?.seconds * 1000).toLocaleString()}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">{order.customerName}</h4>
                <p className="text-sm text-slate-500 mb-3">{order.customerEmail}</p>
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
          {orders.length === 0 && (
              <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                 <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-6 animate-pulse"><ShoppingCart size={40}/></div>
                 <h3 className="text-xl font-bold text-slate-800">Nenhuma venda ainda</h3>
                 <p className="text-slate-500 mb-6 max-w-sm">Compartilhe o link da sua loja nas redes sociais para começar a receber pedidos!</p>
              </div>
            )}
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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

  const NavItem = ({ to, pathName, icon: Icon, label }: any) => {
    const isActive = currentPath === pathName || (pathName === 'overview' && currentPath === 'dashboard');
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
        {collapsed && pathName === 'sales' && notificationCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-50"></span>
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
          <NavItem to="/dashboard" pathName="overview" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem to="products" pathName="products" icon={Package} label="Produtos" />
          <NavItem to="sales" pathName="sales" icon={ShoppingCart} label="Vendas" />
          <NavItem to="clients" pathName="clients" icon={Users} label="Clientes" />
          <div className="my-4 border-t border-slate-200/60 mx-2"></div>
          <NavItem to="store-editor" pathName="store-editor" icon={Store} label="Editor Loja" />
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
             <Link to="sales" className="relative p-2 rounded-full hover:bg-slate-50">
               <Bell size={24} className="text-slate-600"/>
               {notificationCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
             </Link>
             <button onClick={() => signOut(auth)}><LogOut size={24} className="text-slate-600"/></button>
          </div>
        </div>

        {/* Dynamic Mobile Nav */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
           <Link to="/dashboard" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Visão Geral</Link>
           <Link to="products" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Produtos</Link>
           <Link to="sales" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Vendas</Link>
           <Link to="store-editor" className="px-5 py-2.5 bg-white rounded-xl text-sm font-medium shadow-sm whitespace-nowrap border border-slate-100 text-slate-600 active:bg-indigo-50 active:text-indigo-600 active:border-indigo-200">Editor</Link>
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
        <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Receita Total" value={`R$ ${stats.revenue.toFixed(2)}`} icon={ShoppingCart} colorFrom="from-emerald-400" colorTo="to-emerald-600" />
        <StatCard title="Vendas Realizadas" value={stats.orders} icon={Package} colorFrom="from-indigo-400" colorTo="to-indigo-600" />
        <StatCard title="Novos Clientes" value="0" icon={Users} colorFrom="from-violet-400" colorTo="to-violet-600" />
        <StatCard title="Visitas Loja" value="-" icon={Store} colorFrom="from-amber-400" colorTo="to-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400 min-h-[400px] relative overflow-hidden">
           <div className="absolute top-0 right-0 p-32 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
           <div className="relative z-10 text-center">
                <div className="bg-slate-50 p-4 rounded-full inline-block mb-4"><LayoutGrid size={32} className="text-slate-300"/></div>
                <h3 className="text-lg font-bold text-slate-700">Gráfico de Desempenho</h3>
                <p className="text-sm">Os dados aparecerão aqui conforme você realizar vendas.</p>
           </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2">Configure sua Loja</h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">Personalize cores, banners e produtos para deixar sua loja incrível.</p>
                    <Link to="store-editor" className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                        Abrir Editor <ArrowRight size={16}/>
                    </Link>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">Acesso Rápido</h3>
                <div className="space-y-3">
                    <Link to="products" className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Plus size={20} />
                        </div>
                        <span className="font-medium text-slate-600 group-hover:text-slate-900">Adicionar Produto</span>
                    </Link>
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
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      // 1. Get Store Config
      const merchantDoc = await getDoc(doc(db, 'merchants', id));
      if (merchantDoc.exists() && merchantDoc.data().storeConfig) {
        setConfig(merchantDoc.data().storeConfig);
      } else {
         // Fallback default
         setConfig({ storeName: 'Loja', themeColor: '#000', sections: [] });
      }

      // 2. Get Products
      const q = query(collection(db, `merchants/${id}/products`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Product));
        setProducts(items);
      });
      return unsubscribe; // clean up listener
    };
    fetchData();
  }, [id]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
    const btn = document.getElementById('cart-btn');
    if(btn) {
      btn.classList.add('scale-110');
      setTimeout(() => btn.classList.remove('scale-110'), 200);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || cart.length === 0) return;

    try {
      const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
      
      await addDoc(collection(db, `merchants/${id}/orders`), {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        items: cart.map(i => ({ 
          productId: i.product.id, 
          productName: i.product.name, 
          quantity: i.qty, 
          price: i.product.price 
        })),
        total,
        status: 'new',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, `merchants/${id}/clients`), {
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        createdAt: serverTimestamp()
      });

      alert('Pedido realizado com sucesso! O lojista entrará em contato.');
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pedido.');
    }
  };

  if (!config) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Store Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-10 w-auto rounded-lg" />}
             <span className="font-bold text-2xl tracking-tight" style={{ color: config.themeColor }}>{config.storeName}</span>
          </div>
          <button 
            id="cart-btn"
            onClick={() => setIsCheckoutOpen(true)}
            className="relative p-3 rounded-full hover:bg-gray-50 transition-all duration-300 group"
          >
            <ShoppingCart size={26} color={config.themeColor} className="group-hover:scale-110 transition-transform" />
            {cart.length > 0 && (
              <span className="absolute top-1 right-0 bg-slate-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md border-2 border-white transform translate-x-1 -translate-y-1">
                {cart.reduce((a, b) => a + b.qty, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Render Sections */}
      <main>
        {config.sections.map(section => {
          if (section.type === 'hero' || section.type === 'image') return <HeroSection key={section.id} section={section} />;
          if (section.type === 'text') return <TextSection key={section.id} section={section} />;
          if (section.type === 'products') return <ProductGridSection key={section.id} section={section} products={products} onAddToCart={addToCart} />;
          return null;
        })}
        {config.sections.length === 0 && (
          <div className="py-24 text-center bg-slate-50">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">Nossos Produtos</h2>
            <p className="text-slate-500 mb-12 max-w-2xl mx-auto">Confira nossa seleção exclusiva abaixo.</p>
            <ProductGridSection section={{id:'default', type:'products', backgroundColor: 'transparent'}} products={products} onAddToCart={addToCart} />
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-slate-800">Seu Carrinho</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-8 space-y-8">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <ShoppingBag size={32}/>
                    </div>
                    <p className="text-gray-500 font-medium">Seu carrinho está vazio.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{item.product.name}</p>
                          <p className="text-sm text-slate-500 font-medium">{item.qty}x R$ {item.product.price.toFixed(2)}</p>
                        </div>
                        <p className="font-bold text-slate-900 text-lg">R$ {(item.product.price * item.qty).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-gray-300 pt-6 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Total a pagar</span>
                      <span className="text-2xl font-bold text-slate-900">R$ {cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4 pt-6">
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-2">Dados para Entrega</h4>
                    <input className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-800 outline-none transition-all" placeholder="Seu Nome Completo" required value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    <input className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-800 outline-none transition-all" type="email" placeholder="Seu Email" required value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
                    <input className="w-full p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-800 outline-none transition-all" type="tel" placeholder="Seu WhatsApp (com DDD)" required value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                    
                    <button type="submit" className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-black hover:scale-[1.02] transition-all shadow-lg shadow-slate-200 mt-4">
                      Finalizar Pedido
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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