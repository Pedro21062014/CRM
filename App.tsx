import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import * as firebaseAuth from 'firebase/auth';
const { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } = firebaseAuth as any;
type User = any;
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, limit, runTransaction, writeBatch } from 'firebase/firestore';
import { GoogleGenAI, Type, FunctionDeclaration, Schema } from "@google/genai";
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Store, Settings, 
  LogOut, Plus, Trash2, Edit2, ChevronUp, ChevronDown, Check, X,
  ExternalLink, Bell, Image as ImageIcon, Type as TypeIcon, LayoutGrid, ChevronLeft, ChevronRight, Loader2, Rocket, Search, ArrowRight, ShoppingBag, MapPin, Clock, Star, History, Menu, Phone,
  Zap, Globe, ShieldCheck, BarChart3, Smartphone, CheckCircle2, TrendingUp, TrendingDown, DollarSign, PieChart, Sparkles, MessageSquare, Send, Minus, Briefcase, User as UserIcon, Calendar, ClipboardList,
  Download, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus, ClientType } from './types';
import { HeroSection, TextSection, ProductGridSection } from './components/StoreComponents';

// --- AI CONFIGURATION ---
// Inicializa o Google GenAI. Assume que process.env.API_KEY está disponível.
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
    <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-all duration-300 transform group-hover:scale-105">
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

const IconButton = ({ onClick, icon: Icon, colorClass = "text-slate-500 hover:text-slate-700", className }: any) => (
  <button onClick={onClick} className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${colorClass} ${className}`}>
    <Icon size={18} />
  </button>
);

// --- CHARTS & ANALYTICS COMPONENTS (SVG Based) ---

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

// --- AI ASSISTANT COMPONENT ---

const AIAssistant = ({ user }: { user: User }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Olá! Sou a Nova AI. Posso criar produtos, mudar a cor da loja ou analisar suas vendas. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // TOOLS DECLARATIONS
  const tools: FunctionDeclaration[] = [
    {
      name: 'createProduct',
      description: 'Cria um novo produto no catálogo da loja.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Nome do produto' },
          price: { type: Type.NUMBER, description: 'Preço do produto' },
          category: { type: Type.STRING, description: 'Categoria do produto (ex: Lanches, Bebidas)' },
          description: { type: Type.STRING, description: 'Descrição curta do produto' }
        },
        required: ['name', 'price']
      }
    },
    {
      name: 'updateStoreTheme',
      description: 'Atualiza a cor principal do tema da loja.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          colorHex: { type: Type.STRING, description: 'Código hexadecimal da cor (ex: #ff0000)' }
        },
        required: ['colorHex']
      }
    },
    {
      name: 'getSalesSummary',
      description: 'Retorna o resumo das vendas e faturamento.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    }
  ];

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setThinking(true);

    try {
      // Create chat history for context
      const historyContents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      // Add current message
      historyContents.push({ role: 'user', parts: [{ text: userMsg }] });

      // Call Gemini using new SDK
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: historyContents,
        config: {
            tools: [{ functionDeclarations: tools }],
        }
      });

      const calls = response.functionCalls;

      if (calls && calls.length > 0) {
        const results: string[] = [];
        for (const call of calls) {
          if (call.name === 'createProduct') {
            const args = call.args as any;
            await addDoc(collection(db, `merchants/${user.uid}/products`), {
              name: args.name,
              price: args.price,
              category: args.category || 'Geral',
              description: args.description || '',
              stock: 100,
              imageUrl: '',
              createdAt: serverTimestamp()
            });
            results.push(`✅ Criei o produto: ${args.name} (R$ ${args.price})`);
          } 
          else if (call.name === 'updateStoreTheme') {
            const args = call.args as any;
            await setDoc(doc(db, 'merchants', user.uid), { 
              storeConfig: { themeColor: args.colorHex } 
            }, { merge: true });
            results.push(`🎨 Atualizei a cor da loja para ${args.colorHex}`);
          }
          else if (call.name === 'getSalesSummary') {
             const q = query(collection(db, `merchants/${user.uid}/orders`));
             const snap = await getDocs(q);
             let total = 0;
             let count = 0;
             snap.forEach(d => { total += d.data().total; count++; });
             results.push(`📊 Total de vendas: R$ ${total.toFixed(2)} em ${count} pedidos.`);
          }
        }
        setMessages(prev => [...prev, { role: 'model', text: results.join('\n') }]);
      } else {
        // Just text response
        setMessages(prev => [...prev, { role: 'model', text: response.text || "Desculpe, não entendi." }]);
      }

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Desculpe, tive um erro ao processar seu pedido. Tente novamente." }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-40 border-2 border-white/20"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <Sparkles size={16}/>
             </div>
             <div>
               <h3 className="text-white font-bold text-sm">Assistente Nova AI</h3>
               <p className="text-indigo-100 text-xs">Online • Gemini 3.0</p>
             </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
               </div>
             ))}
             {thinking && (
               <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                    <Loader2 className="animate-spin text-indigo-500" size={16}/>
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
             <input 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && handleSend()}
               placeholder="Ex: Crie um produto X-Salada..." 
               className="flex-1 bg-slate-100 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
             />
             <button onClick={handleSend} disabled={thinking} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
               <Send size={18}/>
             </button>
          </div>
        </div>
      )}
    </>
  );
};


// --- Clients Manager ---
const ClientsManager = ({ user }: { user: User }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<ClientType>('common');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/clients`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({ 
          id: doc.id, 
          ...data,
          // Default to common if not set (legacy data)
          clientType: data.clientType || 'common' 
        } as Client);
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
        address: {
          street: formData.address?.street || '',
          number: formData.address?.number || '',
          neighborhood: formData.address?.neighborhood || '',
          city: formData.address?.city || '',
          zip: formData.address?.zip || '',
          complement: formData.address?.complement || '',
        },
        updatedAt: serverTimestamp()
      };

      if (formData.clientType === 'commercial') {
        payload.contactPerson = formData.contactPerson || '';
        payload.purchasePotential = Number(formData.purchasePotential || 0);
        payload.bestBuyDay = formData.bestBuyDay || '';
        payload.lastVisit = formData.lastVisit || '';
        payload.nextVisit = formData.nextVisit || '';
        payload.notes = formData.notes || '';
      }

      // CORREÇÃO AQUI: Verifica se editing existe E se editing.id existe
      if (editing && editing.id) {
        await updateDoc(doc(db, `merchants/${user.uid}/clients`, editing.id), payload);
      } else {
        await addDoc(collection(db, `merchants/${user.uid}/clients`), { 
          ...payload, 
          createdAt: serverTimestamp(),
          totalOrders: 0 
        });
      }
      setEditing(null);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente: ' + (err as Error).message);
    }
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormData(client);
  };

  const openNew = () => {
    setEditing({} as Client);
    setFormData({ clientType: activeTab });
  };

  // --- EXPORT TO EXCEL ---
  const handleExport = () => {
    if (clients.length === 0) {
      alert("Nenhum cliente para exportar.");
      return;
    }

    const exportData = clients.map(client => ({
      'Tipo': client.clientType === 'commercial' ? 'Comercial' : 'Consumidor',
      'Nome': client.name,
      'Email': client.email || '',
      'Telefone': client.phone,
      'Responsável': client.contactPerson || '',
      'Potencial (R$)': client.purchasePotential || '',
      'Rua': client.address?.street || '',
      'Número': client.address?.number || '',
      'Bairro': client.address?.neighborhood || '',
      'Cidade': client.address?.city || '',
      'CEP': client.address?.zip || '',
      'Complemento': client.address?.complement || '',
      'Última Visita': client.lastVisit || '',
      'Próxima Visita': client.nextVisit || '',
      'Notas': client.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    
    XLSX.writeFile(workbook, `Clientes_NovaCRM_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- IMPORT FROM EXCEL ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert("A planilha está vazia.");
        setIsProcessingFile(false);
        return;
      }

      // Firestore Batch Limit is 500
      const batchSize = 450;
      let batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const row of jsonData) {
        // Map common columns (trying to be flexible with names)
        const name = row['Nome'] || row['Nome Completo'] || row['name'];
        if (!name) continue; // Skip invalid rows

        const isCommercial = (row['Tipo'] || '').toLowerCase().includes('comercial');
        
        const newClientData = {
          name: String(name),
          email: String(row['Email'] || row['email'] || ''),
          phone: String(row['Telefone'] || row['phone'] || row['Celular'] || ''),
          clientType: isCommercial ? 'commercial' : 'common',
          address: {
            street: String(row['Rua'] || row['Endereço'] || row['street'] || ''),
            number: String(row['Número'] || row['Numero'] || row['number'] || ''),
            neighborhood: String(row['Bairro'] || row['neighborhood'] || ''),
            city: String(row['Cidade'] || row['city'] || ''),
            zip: String(row['CEP'] || row['zip'] || ''),
            complement: String(row['Complemento'] || row['complement'] || ''),
          },
          // Commercial fields
          contactPerson: String(row['Responsável'] || row['contactPerson'] || ''),
          purchasePotential: Number(row['Potencial (R$)'] || row['Potencial'] || 0),
          lastVisit: row['Última Visita'] || '',
          nextVisit: row['Próxima Visita'] || '',
          notes: String(row['Notas'] || row['Observações'] || ''),
          
          createdAt: serverTimestamp(),
          totalOrders: 0
        };

        const docRef = doc(collection(db, `merchants/${user.uid}/clients`));
        currentBatch.set(docRef, newClientData);
        count++;

        if (count % batchSize === 0) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
        }
      }

      // Add final batch
      if (count % batchSize !== 0) {
        batches.push(currentBatch);
      }

      // Commit all
      await Promise.all(batches.map(b => b.commit()));
      
      alert(`${count} clientes importados com sucesso!`);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err) {
      console.error(err);
      alert("Erro ao processar o arquivo. Verifique se é um Excel válido.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Clientes</h2>
          <p className="text-slate-500 text-sm">Gerencie consumidores e pontos comerciais</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {/* Hidden File Input */}
           <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
           />
           
           <button 
              onClick={handleImportClick} 
              disabled={isProcessingFile}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
           >
              {isProcessingFile ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16} />} 
              Importar
           </button>
           
           <button 
              onClick={handleExport}
              className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 font-medium py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
           >
              <Download size={16} /> Exportar
           </button>
           
           <PrimaryButton onClick={openNew}>
             <Plus size={18} /> Novo Cliente
           </PrimaryButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-full max-w-md mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('common')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'common' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserIcon size={16}/> Consumidores
        </button>
        <button 
          onClick={() => setActiveTab('commercial')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'commercial' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase size={16}/> Pontos Comerciais
        </button>
      </div>

      {/* Form Modal/Section */}
      {editing && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-xl text-slate-800">{editing.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
             <button onClick={() => setEditing(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Cliente</label>
               <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" value="common" checked={formData.clientType === 'common' || !formData.clientType} onChange={() => setFormData({...formData, clientType: 'common'})} className="text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Consumidor Final</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="clientType" value="commercial" checked={formData.clientType === 'commercial'} onChange={() => setFormData({...formData, clientType: 'commercial'})} className="text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-slate-700">Ponto Comercial (B2B)</span>
                  </label>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{formData.clientType === 'commercial' ? 'Nome do Estabelecimento' : 'Nome Completo'}</label>
                  <input className="w-full p-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Telefone / WhatsApp</label>
                  <input className="w-full p-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email (Opcional)</label>
                  <input className="w-full p-3 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
               </div>
            </div>

            {/* Address Fields */}
            <div className="pt-2 border-t border-slate-100">
               <h4 className="text-sm font-bold text-slate-700 mb-3">Endereço</h4>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input className="md:col-span-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Rua / Avenida" value={formData.address?.street || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), street: e.target.value}})} />
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Número" value={formData.address?.number || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), number: e.target.value}})} />
                  <input className="md:col-span-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Bairro" value={formData.address?.neighborhood || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), neighborhood: e.target.value}})} />
                  <input className="md:col-span-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Cidade" value={formData.address?.city || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), city: e.target.value}})} />
               </div>
            </div>

            {/* Commercial Specific Fields */}
            {formData.clientType === 'commercial' && (
               <div className="pt-2 border-t border-slate-100 bg-indigo-50/50 p-4 rounded-xl -mx-4 md:mx-0">
                  <h4 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><Briefcase size={16}/> Detalhes Comerciais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Responsável pela Compra</label>
                        <input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ex: Sr. João" value={formData.contactPerson || ''} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Potencial de Compra (Mensal)</label>
                        <input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="number" placeholder="0.00" value={formData.purchasePotential || ''} onChange={e => setFormData({...formData, purchasePotential: parseFloat(e.target.value)})} />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Melhor Dia de Compra</label>
                        <select className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl outline-none" value={formData.bestBuyDay || ''} onChange={e => setFormData({...formData, bestBuyDay: e.target.value})}>
                           <option value="">Selecione...</option>
                           <option value="Segunda-feira">Segunda-feira</option>
                           <option value="Terça-feira">Terça-feira</option>
                           <option value="Quarta-feira">Quarta-feira</option>
                           <option value="Quinta-feira">Quinta-feira</option>
                           <option value="Sexta-feira">Sexta-feira</option>
                           <option value="Sábado">Sábado</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Observações</label>
                        <input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl outline-none" placeholder="Obs..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
                     </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-indigo-100">
                     <h5 className="text-xs font-bold text-indigo-800 mb-3 uppercase tracking-wide">Cronograma de Visitas</h5>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs text-indigo-500 mb-1 block">Última Visita</label>
                           <input type="date" className="w-full p-2 rounded-lg border border-indigo-100 text-sm" value={formData.lastVisit || ''} onChange={e => setFormData({...formData, lastVisit: e.target.value})} />
                        </div>
                        <div>
                           <label className="text-xs text-indigo-500 mb-1 block font-bold">Próxima Visita (Agendar)</label>
                           <input type="date" className="w-full p-2 rounded-lg border-2 border-indigo-200 text-sm font-medium text-indigo-900" value={formData.nextVisit || ''} onChange={e => setFormData({...formData, nextVisit: e.target.value})} />
                        </div>
                     </div>
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setEditing(null)} className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">Salvar Cliente</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col justify-between h-full relative overflow-hidden">
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${client.clientType === 'commercial' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                      {client.clientType === 'commercial' ? <Briefcase size={18}/> : <UserIcon size={18}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-indigo-700 transition-colors line-clamp-1">{client.name}</h4>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-0.5">{client.clientType === 'commercial' ? 'Ponto Comercial' : 'Consumidor'}</p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(client)} className="text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                   <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {client.phone}</p>
                   {client.address?.neighborhood && (
                      <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {client.address.neighborhood}, {client.address.city}</p>
                   )}
                </div>

                {/* Commercial Specific Info */}
                {client.clientType === 'commercial' && (
                   <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                      {client.contactPerson && <div className="text-xs"><span className="font-bold text-slate-500">Resp:</span> {client.contactPerson}</div>}
                      {client.purchasePotential && (
                         <div className="text-xs flex justify-between items-center">
                            <span className="font-bold text-slate-500">Potencial:</span> 
                            <span className="font-bold text-emerald-600">R$ {client.purchasePotential.toFixed(2)}</span>
                         </div>
                      )}
                      {client.nextVisit && (
                         <div className={`mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs font-bold ${new Date(client.nextVisit) < new Date() ? 'text-rose-500' : 'text-indigo-600'}`}>
                            <Calendar size={14}/> Próxima Visita: {new Date(client.nextVisit + 'T12:00:00').toLocaleDateString('pt-BR')}
                         </div>
                      )}
                   </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                 <span className="text-xs text-slate-400">Cadastrado em {client.createdAt?.seconds ? new Date(client.createdAt.seconds * 1000).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          ))}
          
          {filteredClients.length === 0 && (
              <div className="col-span-full p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                   {activeTab === 'commercial' ? <Briefcase size={32}/> : <Users size={32}/>}
                </div>
                <h3 className="text-slate-800 font-bold mb-1">Nenhum {activeTab === 'commercial' ? 'ponto comercial' : 'cliente'} encontrado</h3>
                <p className="text-slate-400 max-w-xs mx-auto text-sm">Adicione um novo cadastro para começar a gerenciar.</p>
                <button onClick={openNew} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Adicionar Agora</button>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

const OrdersManager = ({ user }: { user: User }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `merchants/${user.uid}/orders`), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as Order));
      setOrders(items);
      setLoading(false);
    });
    return unsubscribe;
  }, [user.uid]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Pedidos</h2>
          <p className="text-slate-500 text-sm">Gerencie seus pedidos recentes</p>
       </div>
       <div className="grid gap-4">
         {orders.length === 0 && <p className="text-slate-500 text-center py-10">Nenhum pedido encontrado.</p>}
         {orders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                  <h3 className="font-bold text-slate-800">#{order.id.slice(-6).toUpperCase()}</h3>
                  <p className="text-sm text-slate-500">{order.customerName} • {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                  <p className="font-bold text-indigo-600 mt-1">R$ {order.total.toFixed(2)}</p>
               </div>
               <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === OrderStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 
                    order.status === OrderStatus.NEW ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status === OrderStatus.NEW ? 'Novo' : order.status === OrderStatus.COMPLETED ? 'Concluído' : order.status}
                  </span>
               </div>
            </div>
         ))}
       </div>
    </div>
  );
};

const Dashboard = ({ user }: { user: User }) => {
  return (
    <div className="p-8 text-center">
       <h2 className="text-3xl font-bold text-slate-800 mb-4">Bem-vindo ao NovaCRM</h2>
       <p className="text-slate-500">Selecione uma opção no menu para começar.</p>
    </div>
  );
};

const Login = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Erro ao fazer login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8"><AppLogo /></div>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
         <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso ao Sistema</h2>
         <p className="text-slate-500 mb-8">Faça login para gerenciar sua loja</p>
         <button onClick={handleLogin} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-2.15-.15-2.15z"/></svg>
            Entrar com Google
         </button>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u: User) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  if (!user) return <Login />;

  return (
    <HashRouter>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <nav className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10 transition-all">
           <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
              <AppLogo collapsed={false} />
           </div>
           <div className="flex-1 py-6 flex flex-col gap-2 px-3">
              <Link to="/" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors">
                 <LayoutDashboard size={20} /> <span className="hidden lg:block font-medium">Dashboard</span>
              </Link>
              <Link to="/clients" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors">
                 <Users size={20} /> <span className="hidden lg:block font-medium">Clientes</span>
              </Link>
              <Link to="/orders" className="flex items-center gap-3 p-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors">
                 <ShoppingBag size={20} /> <span className="hidden lg:block font-medium">Pedidos</span>
              </Link>
           </div>
           <div className="p-4 border-t border-slate-100">
              <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                 <LogOut size={20} /> <span className="hidden lg:block font-medium">Sair</span>
              </button>
           </div>
        </nav>
        <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8">
           <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/clients" element={<ClientsManager user={user} />} />
              <Route path="/orders" element={<OrdersManager user={user} />} />
           </Routes>
        </main>
        <AIAssistant user={user} />
      </div>
    </HashRouter>
  );
};

export default App;