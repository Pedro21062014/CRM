import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
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
  FileSpreadsheet, Download, Upload, Filter, Target, List
} from 'lucide-react';
import { Product, Client, Order, StoreConfig, StoreSection, OrderStatus, ClientType, ClientStatus } from './types';
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
        <div className="fixed bottom-24 right-4 md:right-6 w-[calc(100%-2rem)] md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <Sparkles size={16}/>
             </div>
             <div>
               <h3 className="text-white font-bold text-sm">Assistente Nova AI</h3>
               <p className="text-indigo-100 text-xs">Online • Gemini 3.0</p>
             </div>
             <button onClick={() => setIsOpen(false)} className="ml-auto text-white/70 hover:text-white"><X size={18}/></button>
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

// --- CONSTANTS FOR CLIENT STATUS ---
const CLIENT_STATUSES = {
    'potential': { label: 'Potencial', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'negotiation': { label: 'Em Negociação', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    'converted': { label: 'Recém Convertido', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'active': { label: 'Cliente Ativo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'loyal': { label: 'Fidelizado', color: 'bg-violet-100 text-violet-700 border-violet-200' }
};

// --- Clients Manager ---
const ClientsManager = ({ user }: { user: User }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState<ClientType>('common');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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
          clientType: data.clientType || 'common',
          status: data.status || 'potential'
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
        payload.status = formData.status || 'potential';
      }

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

  const handleDelete = async (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este cliente/ponto comercial?')) {
        try {
            await deleteDoc(doc(db, `merchants/${user.uid}/clients`, clientId));
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir o cliente.");
        }
    }
  };

  const handleExport = () => {
    if (clients.length === 0) {
      alert("Nenhum cliente para exportar.");
      return;
    }

    const headers = [
      "Tipo", "Nome / Razão Social", "Email", "Telefone", 
      "Responsável", "Potencial (R$)", "Status/Classificação", "Dia Compra", 
      "Endereço Completo", "Cidade", "Notas"
    ];

    const dataRows = clients.map(c => [
      c.clientType === 'commercial' ? 'Comercial' : 'Consumidor',
      c.name,
      c.email || '',
      c.phone,
      c.contactPerson || '-',
      c.purchasePotential || 0,
      c.status ? CLIENT_STATUSES[c.status as keyof typeof CLIENT_STATUSES]?.label || c.status : '-',
      c.bestBuyDay || '-',
      `${c.address?.street || ''}, ${c.address?.number || ''} - ${c.address?.neighborhood || ''}`,
      c.address?.city || '',
      c.notes || ''
    ]);

    const wsData = [
      ["NOVA CRM"],
      ["Relatório de Clientes e Parceiros"],
      [`Gerado em: ${new Date().toLocaleDateString()}`],
      [""],
      headers,
      ...dataRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }
    ];
    ws['!cols'] = [
        { wch: 15 }, { wch: 35 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
        { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 30 }
    ];

    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cell_address]) continue;
            const cell = ws[cell_address];
            cell.s = {
                font: { name: "Arial", sz: 10, color: { rgb: "333333" } },
                alignment: { vertical: "center" },
                border: { top: { style: "thin", color: { rgb: "E2E8F0" } }, bottom: { style: "thin", color: { rgb: "E2E8F0" } }, left: { style: "thin", color: { rgb: "E2E8F0" } }, right: { style: "thin", color: { rgb: "E2E8F0" } } }
            };
            if (R === 0) cell.s = { fill: { fgColor: { rgb: "4F46E5" } }, font: { name: "Arial", sz: 28, bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
            else if (R === 1) cell.s = { fill: { fgColor: { rgb: "4338CA" } }, font: { name: "Arial", sz: 14, color: { rgb: "E0E7FF" } }, alignment: { horizontal: "center", vertical: "center" } };
            else if (R === 2) cell.s = { fill: { fgColor: { rgb: "F8FAFC" } }, font: { name: "Arial", sz: 10, italic: true, color: { rgb: "64748B" } }, alignment: { horizontal: "center", vertical: "center" } };
            else if (R === 4) cell.s = { fill: { fgColor: { rgb: "1E293B" } }, font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "medium", color: { rgb: "000000" } } } };
            else if (R > 4) {
                 if (R % 2 === 0) cell.s.fill = { fgColor: { rgb: "F1F5F9" } };
                 if (C === 5) cell.z = '"R$" #,##0.00';
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, `Relatorio_NovaCRM_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      let headerRowIndex = 0;
      rawData.forEach((row, index) => {
          if (row.some((cell: any) => typeof cell === 'string' && (cell.includes('Nome') || cell.includes('Tipo')))) headerRowIndex = index;
      });
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
      let count = 0;
      for (const row of json) {
        if (!row['Nome / Razão Social'] && !row['Nome']) continue;
        const type = (row['Tipo'] || '').toLowerCase().includes('comercial') ? 'commercial' : 'common';
        const statusRaw = (row['Status/Classificação'] || '').toLowerCase();
        let status = 'potential';
        if(statusRaw.includes('negocia')) status = 'negotiation';
        else if(statusRaw.includes('convert')) status = 'converted';
        else if(statusRaw.includes('ativo')) status = 'active';
        else if(statusRaw.includes('fiel') || statusRaw.includes('fidel')) status = 'loyal';

        const clientData = {
          clientType: type,
          name: row['Nome / Razão Social'] || row['Nome'] || 'Cliente Importado',
          email: row['Email'] || '',
          phone: row['Telefone'] || '',
          contactPerson: row['Responsável'] || '',
          purchasePotential: Number(row['Potencial (R$)'] || row['Potencial Compra'] || 0),
          notes: row['Notas'] || '',
          status: status,
          address: { street: '', number: '', neighborhood: '', city: row['Cidade'] || '', zip: '', complement: '' },
          createdAt: serverTimestamp(),
          totalOrders: 0
        };
        const fullAddr = row['Endereço Completo'] || row['Endereço'] || '';
        if (fullAddr) {
            const parts = fullAddr.split(',');
            if (parts[0]) clientData.address.street = parts[0].trim();
            if (parts[1]) {
                const numParts = parts[1].trim().split('-');
                clientData.address.number = numParts[0].trim();
                if (numParts[1]) clientData.address.neighborhood = numParts[1].trim();
            }
        }
        await addDoc(collection(db, `merchants/${user.uid}/clients`), clientData);
        count++;
      }
      alert(`${count} clientes importados com sucesso!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Erro ao importar:", error);
      alert("Erro ao processar arquivo.");
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormData(client);
  };

  const openNew = () => {
    setEditing({} as Client);
    setFormData({ clientType: activeTab, status: 'potential' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Clientes</h2>
          <p className="text-slate-500 text-sm">Gerencie consumidores e pontos comerciais</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <SecondaryButton onClick={handleImportClick} disabled={importing} className="flex-1 xl:flex-none">
             {importing ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} 
             Importar
          </SecondaryButton>
          <SecondaryButton onClick={handleExport} className="flex-1 xl:flex-none">
             <Download size={18} /> Exportar
          </SecondaryButton>
          <PrimaryButton onClick={openNew} className="flex-1 xl:flex-none w-full xl:w-auto">
            <Plus size={18} /> Novo Cliente
          </PrimaryButton>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-full max-w-md">
            <button onClick={() => setActiveTab('common')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'common' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <UserIcon size={16}/> Consumidores
            </button>
            <button onClick={() => setActiveTab('commercial')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all ${activeTab === 'commercial' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Briefcase size={16}/> Pontos Comerciais
            </button>
          </div>

          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={18}/></button>
          </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl border border-indigo-100 w-full max-w-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden my-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-xl text-slate-800">{editing.id ? 'Editar Cliente' : 'Novo Cliente'}</h3>
               <button onClick={() => setEditing(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Cliente</label>
                 <div className="flex flex-col sm:flex-row gap-4">
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
                 <div className="md:col-span-2">
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

              <div className="pt-2 border-t border-slate-100">
                 <h4 className="text-sm font-bold text-slate-700 mb-3">Endereço</h4>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input className="md:col-span-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Rua / Avenida" value={formData.address?.street || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), street: e.target.value}})} />
                    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Número" value={formData.address?.number || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), number: e.target.value}})} />
                    <input className="md:col-span-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Bairro" value={formData.address?.neighborhood || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), neighborhood: e.target.value}})} />
                    <input className="md:col-span-2 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Cidade" value={formData.address?.city || ''} onChange={e => setFormData({...formData, address: {...(formData.address || {}), city: e.target.value}})} />
                 </div>
              </div>

              {formData.clientType === 'commercial' && (
                 <div className="pt-2 border-t border-slate-100 bg-indigo-50/50 p-4 rounded-xl -mx-2 md:mx-0">
                    <h4 className="text-sm font-bold text-indigo-800 mb-4 flex items-center gap-2"><Briefcase size={16}/> Detalhes Comerciais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="md:col-span-2 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm mb-2">
                          <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-2"><Target size={14} className="inline mr-1"/> Classificação (Funil de Vendas)</label>
                          <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.status || 'potential'} onChange={e => setFormData({...formData, status: e.target.value as ClientStatus})}>
                             <option value="potential">🟡 Potencial (Prospecção)</option>
                             <option value="negotiation">🟠 Em Negociação (Visitado)</option>
                             <option value="converted">🔵 Recém Convertido (Primeiras Compras)</option>
                             <option value="active">🟢 Cliente Ativo (Comprador Frequente)</option>
                             <option value="loyal">🟣 Fidelizado (Parceiro VIP)</option>
                          </select>
                       </div>
                       <div><label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Responsável</label><input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.contactPerson || ''} onChange={e => setFormData({...formData, contactPerson: e.target.value})} /></div>
                       <div><label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Potencial (R$)</label><input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" type="number" value={formData.purchasePotential || ''} onChange={e => setFormData({...formData, purchasePotential: parseFloat(e.target.value)})} /></div>
                       <div className="md:col-span-2"><label className="text-xs font-bold text-indigo-400 uppercase tracking-wider ml-1">Observações</label><input className="w-full p-3 mt-1 bg-white border border-indigo-100 rounded-xl outline-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
                    </div>
                 </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(null)} className="w-full sm:w-auto px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col justify-between h-full relative overflow-hidden">
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
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(client)} className="text-slate-300 hover:text-indigo-600 transition-colors p-1"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(client.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                            </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                            <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {client.phone}</p>
                            {client.address?.neighborhood && <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {client.address.neighborhood}</p>}
                            </div>
                            {client.clientType === 'commercial' && (
                            <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${CLIENT_STATUSES[client.status as ClientStatus]?.color || 'bg-slate-100 text-slate-500'}`}>
                                        {CLIENT_STATUSES[client.status as ClientStatus]?.label || 'Potencial'}
                                    </span>
                                </div>
                                {client.contactPerson && <div className="text-xs"><span className="font-bold text-slate-500">Resp:</span> {client.contactPerson}</div>}
                            </div>
                            )}
                        </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-100">
                             <tr>
                               <th className="px-6 py-4">Cliente</th>
                               <th className="px-6 py-4">Contato</th>
                               <th className="px-6 py-4">Status</th>
                               <th className="px-6 py-4">Local</th>
                               <th className="px-6 py-4 text-right">Ações</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                             {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-6 py-4">
                                     <div className="font-bold text-slate-800 flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${client.clientType === 'commercial' ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                                            {client.clientType === 'commercial' ? <Briefcase size={10}/> : <UserIcon size={10}/>}
                                        </div>
                                        {client.name}
                                     </div>
                                     <div className="text-xs text-slate-400 ml-8">{client.clientType === 'commercial' ? 'Comercial' : 'Consumidor'}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                     <div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-300"/> {client.phone}</div>
                                     {client.email && <div className="text-xs text-slate-400 mt-1">{client.email}</div>}
                                   </td>
                                   <td className="px-6 py-4">
                                      {client.clientType === 'commercial' ? (
                                         <span className={`px-2 py-1 rounded-full text-xs font-bold border ${CLIENT_STATUSES[client.status as ClientStatus]?.color || 'bg-slate-100 text-slate-500'}`}>
                                           {CLIENT_STATUSES[client.status as ClientStatus]?.label || 'Potencial'}
                                         </span>
                                      ) : <span className="text-slate-400">-</span>}
                                   </td>
                                   <td className="px-6 py-4 text-slate-600">
                                      {client.address?.city ? (
                                        <span>{client.address.city} <span className="text-slate-300 mx-1">•</span> {client.address.neighborhood}</span>
                                      ) : <span className="text-slate-400 italic">Sem endereço</span>}
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-2">
                                           <button onClick={() => openEdit(client)} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors"><Edit2 size={16}/></button>
                                           <button onClick={() => handleDelete(client.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 size={16}/></button>
                                       </div>
                                   </td>
                                </tr>
                             ))}
                           </tbody>
                        </table>
                    </div>
                </div>
            )}

            {filteredClients.length === 0 && (
                <div className="col-span-full p-10 md:p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    {activeTab === 'commercial' ? <Briefcase size={32}/> : <Users size={32}/>}
                    </div>
                    <h3 className="text-slate-800 font-bold mb-1">Nenhum cliente encontrado</h3>
                    <p className="text-slate-400 max-w-xs mx-auto text-sm mb-4">Adicione um novo cadastro para começar a gerenciar.</p>
                    <button onClick={openNew} className="text-indigo-600 font-bold text-sm hover:underline">Adicionar Manualmente</button>
                </div>
            )}
        </>
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
            description: 'A melhor comida da região! Entregamos rápido.',
            themeColor: '#ea1d2c',
            sections: [
              { id: '2', type: 'products', title: 'Destaques', backgroundColor: '#ffffff' }
            ]
          });
        }
        
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Editor Visual</h2>
        </div>
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
        <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
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

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutGrid size={18}/> Seções da Loja</h3>
                     <div className="flex gap-2">
                         <button onClick={() => addSection('hero')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Banner"><ImageIcon size={16}/></button>
                         <button onClick={() => addSection('products')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Produtos"><ShoppingBag size={16}/></button>
                         <button onClick={() => addSection('text')} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600" title="Add Texto"><TypeIcon size={16}/></button>
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

        <div className="w-full lg:w-1/2 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center p-4 md:p-8 relative overflow-hidden min-h-[500px]">
            <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded">Preview em Tempo Real</div>
            
            <div className="w-full max-w-[340px] h-[600px] md:h-[680px] bg-white rounded-[40px] shadow-2xl border-8 border-slate-800 overflow-hidden relative flex flex-col mx-auto">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
                
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-gray-50">
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
                            return null;
                        })}
                    </div>
                </div>

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

  return (
      <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Pedidos</h2>
                  <p className="text-slate-500 text-sm">Gerencie os pedidos da sua loja</p>
              </div>
          </div>
          
          {loading ? <LoadingSpinner /> : (
            <div className="grid gap-4">
                {orders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-lg text-slate-800">#{order.id.slice(0, 8)}</span>
                                <span className="text-sm text-slate-500">{new Date(order.createdAt?.seconds * 1000).toLocaleString()}</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600"><UserIcon size={16}/> {order.customerName}</div>
                                {order.deliveryAddress ? (
                                  <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin size={16}/> {order.deliveryAddress.street}, {order.deliveryAddress.number}</div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm text-slate-400 italic"><MapPin size={16}/> Endereço não disponível</div>
                                )}
                            </div>
                            <div className="border-t border-slate-100 pt-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                        <span className="text-slate-600">{item.quantity}x {item.productName}</span>
                                        <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                             <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                <span className="font-bold text-slate-800">Total</span>
                                <span className="font-bold text-xl text-indigo-600">R$ {order.total.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="w-full md:w-64 flex flex-col gap-3 justify-center border-l border-slate-100 md:pl-6">
                             <label className="text-xs font-bold text-slate-400 uppercase">Status do Pedido</label>
                             <select 
                                value={order.status}
                                onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                                className={`w-full p-3 rounded-xl border font-bold outline-none ${
                                    order.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    order.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                             >
                                <option value="new">Novo Pedido</option>
                                <option value="processing">Em Preparo</option>
                                <option value="completed">Concluído</option>
                                <option value="cancelled">Cancelado</option>
                             </select>
                        </div>
                    </div>
                ))}
                {orders.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4"/>
                        <p className="text-slate-500 font-medium">Nenhum pedido recebido ainda.</p>
                    </div>
                )}
            </div>
          )}
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
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
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

// --- DASHBOARD ---

const DashboardHome = ({ user }: { user: User }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    salesToday: 0,
    ordersToday: 0,
    newClientsToday: 0,
    avgTicketToday: 0,
    weeklySales: [0,0,0,0,0,0,0],
    monthlyRevenue: 0,
    monthlyGoal: 20000 // Hardcoded goal for now
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

      // Fetch Orders
      const ordersQ = query(collection(db, `merchants/${user.uid}/orders`));
      const ordersSnap = await getDocs(ordersQ);
      
      let salesT = 0;
      let ordersT = 0;
      let monthlyRev = 0;
      const weeklyData = [0,0,0,0,0,0,0]; // Last 7 days

      ordersSnap.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()); // Handle Firestore Timestamp
        const total = data.total || 0;

        // Today
        if (date >= today) {
           salesT += total;
           ordersT += 1;
        }

        // Monthly
        if (date >= firstDayOfMonth) {
          monthlyRev += total;
        }

        // Weekly (Last 7 days)
        if (date >= sevenDaysAgo) {
           const dayDiff = Math.floor((date.getTime() - sevenDaysAgo.getTime()) / (1000 * 3600 * 24));
           if (dayDiff >= 0 && dayDiff < 7) {
             weeklyData[dayDiff] += total;
           }
        }
      });

      // Fetch Clients (for New Clients Today)
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
        navigate('/login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600"/></div>;
  if (!user) return null;

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral', exact: true },
    { path: '/dashboard/orders', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/dashboard/clients', icon: Users, label: 'Clientes' },
    { path: '/dashboard/store', icon: Store, label: 'Loja Virtual' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
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
             {/* Mobile Close Button */}
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

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 overflow-y-auto h-screen relative w-full">
         {/* Mobile Header */}
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
              <Route path="/store" element={<StoreEditor user={user} />} />
            </Routes>
         </div>
      </main>
      
      <AIAssistant user={user} />
    </div>
  );
};

// --- LANDING PAGE ---
const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between p-4 md:p-6 max-w-7xl mx-auto">
        <AppLogo />
        <div className="flex gap-2 md:gap-4">
          <button onClick={() => navigate('/login')} className="px-3 md:px-5 py-2 text-sm md:text-base text-slate-600 font-medium hover:text-indigo-600 transition-colors">Entrar</button>
          <button onClick={() => navigate('/register')} className="px-3 md:px-5 py-2 text-sm md:text-base bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Começar</button>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h1 className="text-4xl md:text-7xl font-bold text-slate-900 leading-tight">
            Gerencie seu negócio <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">com inteligência.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-lg leading-relaxed mx-auto md:mx-0">
            CRM, Vendas e Loja Virtual em uma única plataforma. Potencialize seus resultados com nossa IA integrada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
             <button onClick={() => navigate('/register')} className="px-8 py-4 bg-slate-900 text-white text-lg font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                Criar Conta Grátis <ArrowRight size={20}/>
             </button>
             <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 text-lg font-bold rounded-2xl hover:bg-slate-50 transition-all">
                Ver Demonstração
             </button>
          </div>
        </div>
        <div className="flex-1 relative w-full max-w-md md:max-w-full">
           <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full blur-3xl opacity-50 -z-10"></div>
           <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 transform rotate-2 hover:rotate-0 transition-all duration-500">
               <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                   <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                   <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
               </div>
               <div className="space-y-4 opacity-50">
                   <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                   <div className="grid grid-cols-3 gap-4">
                       <div className="h-24 bg-indigo-50 rounded"></div>
                       <div className="h-24 bg-purple-50 rounded"></div>
                       <div className="h-24 bg-emerald-50 rounded"></div>
                   </div>
                   <div className="h-40 bg-slate-50 rounded"></div>
               </div>
           </div>
        </div>
      </div>
      
      <div className="bg-slate-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo que você precisa</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Uma suíte completa de ferramentas para modernizar sua operação comercial.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                  { icon: <Store size={32} className="text-indigo-600"/>, title: "Loja Virtual", desc: "Crie seu catálogo online em minutos e receba pedidos no WhatsApp ou Painel." },
                  { icon: <Users size={32} className="text-violet-600"/>, title: "CRM de Clientes", desc: "Organize sua carteira de clientes, histórico de compras e funil de vendas." },
                  { icon: <Sparkles size={32} className="text-emerald-600"/>, title: "IA Integrada", desc: "Nossa IA ajuda você a criar descrições, analisar dados e tomar decisões." }
              ].map((item, i) => (
                  <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">{item.icon}</div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                      <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- APP ENTRY ---
const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/store/:id" element={<PublicStore />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;