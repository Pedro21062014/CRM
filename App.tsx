import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus } from './types';
import { HeroSection, TextSection, ProductGridSection } from './components/StoreComponents';

// --- Shared Components ---

const LoadingSpinner = () => (
  <div className="flex h-64 w-full items-center justify-center text-slate-400">
    <Loader2 className="animate-spin mr-2" size={32} />
    <span>Carregando dados...</span>
  </div>
);

const AppLogo = ({ collapsed }: { collapsed?: boolean }) => (
  <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} transition-all duration-300`}>
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
      <Rocket size={24} strokeWidth={2.5} />
    </div>
    {!collapsed && (
      <div className="flex flex-col animate-in fade-in duration-300">
        <span className="font-bold text-xl text-slate-900 tracking-tight leading-none">NovaCRM</span>
        <span className="text-[10px] font-semibold text-indigo-600 tracking-wider uppercase">Store Builder</span>
      </div>
    )}
  </div>
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
      setError(err.message);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <AppLogo />
        </div>
        <p className="text-slate-500 mb-8 text-center">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</p>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required 
            />
          </div>
          <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-200">
            {isLogin ? 'Entrar' : 'Registrar'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-4 text-slate-400 text-sm">ou</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        <button onClick={handleGoogle} className="w-full py-3 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-indigo-600 font-medium hover:underline">
            {isLogin ? 'Criar conta' : 'Fazer login'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- Dashboard Sub-Components ---

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} shadow-sm`}>
        <Icon size={20} className="text-white" />
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
          // Initial setup
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
      alert('Loja atualizada com sucesso!');
    } catch (e) {
      console.error(e);
      // If doc doesn't exist, set it
      await setDoc(doc(db, 'merchants', user.uid), { storeConfig: config }, { merge: true });
    }
    setSaving(false);
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
    setConfig(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
  };

  const publicLink = `${window.location.origin}/#/store/${user.uid}`;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Editor de Loja</h2>
          <p className="text-slate-500 text-sm">Personalize a aparência da sua loja virtual</p>
        </div>
        <div className="flex gap-3">
          <a href={publicLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2">
            <ExternalLink size={16} /> Ver Loja
          </a>
          <button onClick={saveConfig} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Configurações Gerais</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Nome da Loja</label>
                <input 
                  type="text" 
                  value={config.storeName} 
                  onChange={e => setConfig({...config, storeName: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Adicionar Seção</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => addSection('hero')} className="p-3 border rounded-lg hover:bg-slate-50 flex flex-col items-center gap-2 text-sm text-slate-600">
                <ImageIcon size={20} /> Banner
              </button>
              <button onClick={() => addSection('products')} className="p-3 border rounded-lg hover:bg-slate-50 flex flex-col items-center gap-2 text-sm text-slate-600">
                <LayoutGrid size={20} /> Produtos
              </button>
              <button onClick={() => addSection('text')} className="p-3 border rounded-lg hover:bg-slate-50 flex flex-col items-center gap-2 text-sm text-slate-600">
                <Type size={20} /> Texto
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
             <h3 className="font-semibold text-slate-800 mb-4">Estrutura</h3>
             <div className="space-y-2">
               {config.sections.map((section, idx) => (
                 <div key={section.id} className={`p-3 border rounded-lg flex items-center justify-between ${activeSectionId === section.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => setActiveSectionId(section.id)}>
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-700 capitalize">{section.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronUp size={14}/></button>
                      <button onClick={() => moveSection(idx, 'down')} disabled={idx === config.sections.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronDown size={14}/></button>
                      <button onClick={() => removeSection(section.id)} className="p-1 text-red-400 hover:text-red-600 ml-1"><Trash2 size={14}/></button>
                    </div>
                 </div>
               ))}
               {config.sections.length === 0 && <p className="text-sm text-slate-400 italic">Nenhuma seção adicionada.</p>}
             </div>
          </div>
        </div>

        {/* Live Preview / Detail Editor */}
        <div className="lg:col-span-2 space-y-6">
          {activeSectionId ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-indigo-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800">Editando Seção</h3>
                <button onClick={() => setActiveSectionId(null)} className="text-sm text-indigo-600 hover:underline">Fechar Edição</button>
              </div>
              
              {(() => {
                const section = config.sections.find(s => s.id === activeSectionId);
                if (!section) return null;

                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-600 mb-1">Título</label>
                      <input 
                        type="text" 
                        value={section.title || ''} 
                        onChange={e => updateSection(section.id, { title: e.target.value })}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                    {(section.type === 'hero' || section.type === 'text') && (
                      <div>
                         <label className="block text-sm text-slate-600 mb-1">Conteúdo/Subtítulo</label>
                         <textarea 
                           rows={3}
                           value={section.content || ''} 
                           onChange={e => updateSection(section.id, { content: e.target.value })}
                           className="w-full p-2 border rounded-md"
                         />
                      </div>
                    )}
                    {(section.type === 'hero' || section.type === 'image') && (
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">URL da Imagem</label>
                        <input 
                          type="text" 
                          placeholder="https://..."
                          value={section.imageUrl || ''} 
                          onChange={e => updateSection(section.id, { imageUrl: e.target.value })}
                          className="w-full p-2 border rounded-md"
                        />
                        <p className="text-xs text-slate-400 mt-1">Cole um link direto de uma imagem.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Cor de Fundo</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={section.backgroundColor || '#ffffff'}
                            onChange={e => updateSection(section.id, { backgroundColor: e.target.value })}
                            className="w-10 h-10 border rounded cursor-pointer"
                          />
                          <span className="text-sm text-slate-500">{section.backgroundColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Cor do Texto</label>
                         <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={section.textColor || '#000000'}
                            onChange={e => updateSection(section.id, { textColor: e.target.value })}
                            className="w-10 h-10 border rounded cursor-pointer"
                          />
                          <span className="text-sm text-slate-500">{section.textColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
             <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400">
               Selecione uma seção na barra lateral para editar os detalhes
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
       <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Produtos</h2>
          <p className="text-slate-500 text-sm">Gerencie seu catálogo de vendas</p>
        </div>
        <button onClick={() => { setEditing({} as Product); setFormData({}); }} className="px-4 py-2 bg-slate-900 text-white rounded-lg flex items-center gap-2 hover:bg-slate-800">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {(editing || Object.keys(formData).length > 0 && editing !== null) && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold mb-4 text-lg">{editing?.id ? 'Editar Produto' : 'Novo Produto'}</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="p-2 border rounded" placeholder="Nome do Produto" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input className="p-2 border rounded" type="number" step="0.01" placeholder="Preço" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
            <input className="p-2 border rounded" placeholder="Categoria" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
            <input className="p-2 border rounded" type="number" placeholder="Estoque" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
            <input className="p-2 border rounded md:col-span-2" placeholder="URL da Imagem" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
            <textarea className="p-2 border rounded md:col-span-2" rows={3} placeholder="Descrição" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
           <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">Produto</th>
                  <th className="p-4 font-semibold text-slate-600">Categoria</th>
                  <th className="p-4 font-semibold text-slate-600">Preço</th>
                  <th className="p-4 font-semibold text-slate-600">Estoque</th>
                  <th className="p-4 font-semibold text-slate-600 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50 transition">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         {p.imageUrl && <img src={p.imageUrl} className="w-10 h-10 rounded object-cover bg-slate-200" alt="" />}
                         <span className="font-medium text-slate-900">{p.name}</span>
                       </div>
                     </td>
                     <td className="p-4 text-slate-600">{p.category}</td>
                     <td className="p-4 text-slate-900 font-medium">R$ {p.price.toFixed(2)}</td>
                     <td className="p-4 text-slate-600">{p.stock}</td>
                     <td className="p-4 text-right">
                       <button onClick={() => { setEditing(p); setFormData(p); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full mr-2"><Edit2 size={16} /></button>
                       <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                     </td>
                   </tr>
                 ))}
                 {products.length === 0 && (
                   <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>
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
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500 text-sm">Base de clientes gerada pelas vendas</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{client.name}</h4>
                  <p className="text-xs text-slate-500">Adicionado em {new Date(client.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-sm space-y-2">
                <p className="text-slate-600 flex items-center gap-2"><span className="text-slate-400">Email:</span> {client.email}</p>
                <p className="text-slate-600 flex items-center gap-2"><span className="text-slate-400">Tel:</span> {client.phone || 'N/A'}</p>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Nenhum cliente registrado ainda. As vendas geram clientes automaticamente.
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

  const getStatusColor = (status: string) => {
    switch(status) {
      case OrderStatus.NEW: return 'bg-blue-100 text-blue-700';
      case OrderStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Vendas</h2>
        <p className="text-slate-500 text-sm">Gerencie os pedidos recebidos</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-indigo-100 transition-colors">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-sm text-slate-400">#{order.id.slice(-6)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(order.status)}`}>{order.status}</span>
                  <span className="text-xs text-slate-400">{new Date(order.createdAt?.seconds * 1000).toLocaleString()}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">{order.customerName}</h4>
                <p className="text-sm text-slate-500 mb-2">{order.items.length} itens • {order.customerEmail}</p>
                <div className="text-sm text-slate-600">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="mr-3">{item.quantity}x {item.productName}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-2xl font-bold text-slate-900">R$ {order.total.toFixed(2)}</span>
                <div className="flex gap-2">
                  {order.status === OrderStatus.NEW && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.PROCESSING)} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">Aceitar</button>
                  )}
                  {order.status === OrderStatus.PROCESSING && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.COMPLETED)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Concluir</button>
                  )}
                  {(order.status === OrderStatus.NEW || order.status === OrderStatus.PROCESSING) && (
                    <button onClick={() => updateStatus(order.id, OrderStatus.CANCELLED)} className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300">Cancelar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
              <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Nenhuma venda registrada ainda. Compartilhe o link da sua loja!
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

  // Notification Listener
  useEffect(() => {
    if (!user) return;
    // Listen for new orders with status 'new'
    const q = query(collection(db, `merchants/${user.uid}/orders`), where('status', '==', 'new'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.docs.length);
      if(snapshot.docChanges().some(change => change.type === 'added')) {
        // Simple browser alert or sound could go here
        // new Audio('/ping.mp3').play().catch(e => {}); 
      }
    });
    return unsubscribe;
  }, [user]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Autenticando...</div>;

  const currentPath = location.pathname.split('/').pop() || 'overview';

  const NavItem = ({ to, pathName, icon: Icon, label }: any) => {
    const isActive = currentPath === pathName || (pathName === 'overview' && currentPath === 'dashboard');
    return (
      <Link 
        to={to} 
        title={collapsed ? label : ''}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
          isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
        } ${collapsed ? 'justify-center px-2' : ''}`}
      >
        <Icon size={20} className={isActive ? 'text-white' : ''} />
        {!collapsed && <span>{label}</span>}
        {!collapsed && pathName === 'sales' && notificationCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{notificationCount}</span>
        )}
        {collapsed && pathName === 'sales' && notificationCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar (Desktop) */}
      <aside 
        className={`bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-20 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-6 border-b border-slate-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={collapsed ? 'scale-75' : ''}>
            <AppLogo collapsed={collapsed} />
          </div>
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 p-1 rounded-full shadow-sm hover:bg-slate-50 text-slate-500 z-30"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <NavItem to="/dashboard" pathName="overview" icon={LayoutDashboard} label="Visão Geral" />
          <NavItem to="products" pathName="products" icon={Package} label="Produtos" />
          <NavItem to="sales" pathName="sales" icon={ShoppingCart} label="Vendas" />
          <NavItem to="clients" pathName="clients" icon={Users} label="Clientes" />
          <NavItem to="store-editor" pathName="store-editor" icon={Store} label="Minha Loja" />
        </nav>
        
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
               {user.photoURL && <img src={user.photoURL} alt="User" />}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                <p className="text-sm font-medium text-slate-900 truncate">{user.displayName || 'Lojista'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => signOut(auth)} 
            title={collapsed ? "Sair" : ""}
            className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} /> {!collapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <AppLogo />
          <div className="flex gap-4">
             <Link to="sales" className="relative">
               <Bell size={24} className="text-slate-600"/>
               {notificationCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></span>}
             </Link>
             <button onClick={() => signOut(auth)}><LogOut size={24} className="text-slate-600"/></button>
          </div>
        </div>

        {/* Dynamic Mobile Nav (Simple) */}
        <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar">
           <Link to="/dashboard" className="px-4 py-2 bg-white rounded-full text-sm shadow-sm whitespace-nowrap border border-slate-100">Visão Geral</Link>
           <Link to="products" className="px-4 py-2 bg-white rounded-full text-sm shadow-sm whitespace-nowrap border border-slate-100">Produtos</Link>
           <Link to="sales" className="px-4 py-2 bg-white rounded-full text-sm shadow-sm whitespace-nowrap border border-slate-100">Vendas</Link>
           <Link to="store-editor" className="px-4 py-2 bg-white rounded-full text-sm shadow-sm whitespace-nowrap border border-slate-100">Editor</Link>
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
  const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0, clients: 0 });

  useEffect(() => {
    // This is a simplified fetch for overview. Real app would aggregate properly or use counters.
    const fetchStats = async () => {
      // Let's just fetch orders to calculate revenue
      const qOrders = query(collection(db, `merchants/${user.uid}/orders`));
      const unsubscribe = onSnapshot(qOrders, (snap) => {
        let rev = 0;
        snap.forEach(d => rev += d.data().total);
        setStats(prev => ({ ...prev, revenue: rev, orders: snap.size }));
      });
      return unsubscribe;
    };
    fetchStats();
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Receita Total" value={`R$ ${stats.revenue.toFixed(2)}`} icon={ShoppingCart} color="bg-emerald-500" />
        <StatCard title="Vendas" value={stats.orders} icon={Package} color="bg-indigo-500" />
        <StatCard title="Clientes" value="-" icon={Users} color="bg-purple-500" />
        <StatCard title="Avaliação" value="4.8" icon={Store} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[300px] flex flex-col items-center justify-center text-slate-400">
           <Package size={48} className="mb-4 opacity-20" />
           <p>Gráfico de Vendas (Em Breve)</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
             <Link to="products" className="flex items-center gap-3 w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition group">
                <div className="bg-white p-2 rounded-md shadow-sm group-hover:scale-110 transition-transform"><Plus size={16}/></div>
                Adicionar Produto
             </Link>
             <Link to="store-editor" className="flex items-center gap-3 w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition group">
                <div className="bg-white p-2 rounded-md shadow-sm group-hover:scale-110 transition-transform"><Edit2 size={16}/></div>
                Personalizar Loja
             </Link>
             <button className="flex items-center gap-3 w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition group" onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/#/store/${user.uid}`);
                alert('Link copiado!');
             }}>
                <div className="bg-white p-2 rounded-md shadow-sm group-hover:scale-110 transition-transform"><ExternalLink size={16}/></div>
                Copiar Link da Loja
             </button>
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
    // Visual feedback
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
      
      // 1. Create Order
      const orderRef = await addDoc(collection(db, `merchants/${id}/orders`), {
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

      // 2. Create/Update Client (simplified, assumes email is unique key roughly)
      // Ideally we check if client exists by email first.
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

  if (!config) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Store Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-8 w-auto" />}
             <span className="font-bold text-xl" style={{ color: config.themeColor }}>{config.storeName}</span>
          </div>
          <button 
            id="cart-btn"
            onClick={() => setIsCheckoutOpen(true)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-transform duration-200"
          >
            <ShoppingCart size={24} color={config.themeColor} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
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
        {/* If no sections, show default product grid */}
        {config.sections.length === 0 && (
          <div className="py-20 text-center">
            <h2 className="text-3xl font-bold mb-8">Nossos Produtos</h2>
            <ProductGridSection section={{id:'default', type:'products', backgroundColor: '#fff'}} products={products} onAddToCart={addToCart} />
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Seu Carrinho</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <div className="p-6 space-y-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Seu carrinho está vazio.</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800">{item.product.name}</p>
                          <p className="text-sm text-slate-500">{item.qty}x R$ {item.product.price.toFixed(2)}</p>
                        </div>
                        <p className="font-bold">R$ {(item.product.price * item.qty).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                      <span>Total</span>
                      <span>R$ {cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="font-semibold text-slate-700">Dados para Entrega</h4>
                    <input className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Seu Nome" required value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    <input className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" type="email" placeholder="Seu Email" required value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
                    <input className="w-full p-3 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" type="tel" placeholder="Seu Telefone / WhatsApp" required value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} />
                    
                    <button type="submit" className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg">
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
