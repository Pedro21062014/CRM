import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, CreditCard, User, CheckCircle2, Loader2, ArrowRight, ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Product, StoreConfig } from '../types';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CheckoutFlowProps {
  cart: { product: Product; quantity: number }[];
  total: number;
  config: StoreConfig | null;
  onClose: () => void;
  onConfirm: (data: { name: string; phone: string; cpf: string; address: string; coordinates: { lat: number, lng: number } | null }) => Promise<void>;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  initialData: { name: string; phone: string; cpf: string; address: string };
}

const LocationMarker = ({ position, setPosition, setAddress }: any) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      // Reverse geocoding could be added here
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16);
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  cart,
  total,
  config,
  onClose,
  onConfirm,
  updateQuantity,
  removeFromCart,
  initialData
}) => {
  const [step, setStep] = useState(0); // 0: Cart, 1: Info, 2: Location, 3: Payment/Confirm, 4: Success
  const [name, setName] = useState(initialData.name);
  const [phone, setPhone] = useState(initialData.phone);
  const [cpf, setCpf] = useState(initialData.cpf);
  const [address, setAddress] = useState(initialData.address);
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchAddress = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setPosition(new L.LatLng(parseFloat(lat), parseFloat(lon)));
        setAddress(display_name);
      } else {
        alert("Endereço não encontrado.");
      }
    } catch (error) {
      console.error("Error searching address:", error);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name || !phone) {
        alert("Preencha nome e telefone.");
        return;
      }
      if (config?.enableNativePayment && !cpf) {
        alert("CPF é obrigatório para pagamento via PIX.");
        return;
      }
    }
    if (step === 2) {
      if (!address) {
        alert("Informe o endereço de entrega.");
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        name,
        phone,
        cpf,
        address,
        coordinates: position ? { lat: position.lat, lng: position.lng } : null
      });
      setStep(4); // Success
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / (config?.enableNativePayment ? 3 : 2)) * 100;

  if (step === 4) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Pedido Concluído!</h2>
        <p className="text-slate-500 text-center max-w-md mb-8">
          Seu pedido foi recebido com sucesso. Acompanhe o status pelo seu painel ou aguarde nosso contato.
        </p>
        <button 
          onClick={onClose}
          className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
        >
          Voltar para a Loja
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="font-bold text-lg text-slate-800">
            {step === 0 && 'Sua Sacola'}
            {step === 1 && 'Seus Dados'}
            {step === 2 && 'Local de Entrega'}
            {step === 3 && 'Pagamento'}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
          <X size={24} />
        </button>
      </div>

      {/* Progress Bar */}
      {step > 0 && (
        <div className="h-1.5 bg-slate-200 w-full shrink-0">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {cart.length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                    <ShoppingBag size={64} className="mx-auto mb-4"/>
                    <p className="text-lg">Sua sacola está vazia.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                          {item.product.imageUrl && <img src={item.product.imageUrl} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800">{item.product.name}</h4>
                            <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 size={18}/></button>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-indigo-600 font-bold">R$ {item.product.price.toFixed(2)}</p>
                            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-100">
                              <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm font-bold text-slate-600">-</button>
                              <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm font-bold text-slate-600">+</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Informações Pessoais</h3>
                    <p className="text-sm text-slate-500">Como podemos chamar você?</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</label>
                    <input 
                      className="w-full p-4 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
                      placeholder="João da Silva" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">WhatsApp</label>
                    <input 
                      className="w-full p-4 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
                      placeholder="(11) 99999-9999" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                    />
                  </div>
                  {config?.enableNativePayment && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">CPF (Necessário para PIX)</label>
                      <input 
                        className="w-full p-4 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
                        placeholder="000.000.000-00" 
                        value={cpf} 
                        onChange={e => setCpf(e.target.value)} 
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Onde entregar?</h3>
                    <p className="text-sm text-slate-500">Busque no mapa ou digite o endereço.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
                    placeholder="Rua, Número, Bairro, Cidade" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchAddress()}
                  />
                  <button 
                    onClick={handleSearchAddress}
                    className="px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Buscar
                  </button>
                </div>

                <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                  <MapContainer center={[-23.5505, -46.6333]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker position={position} setPosition={setPosition} setAddress={setAddress} />
                  </MapContainer>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Endereço Confirmado</label>
                  <input 
                    className="w-full p-4 border border-slate-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" 
                    placeholder="Confirme o endereço completo" 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Resumo e Pagamento</h3>
                    <p className="text-sm text-slate-500">Confirme os dados do seu pedido.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Itens ({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
                    <span className="font-bold text-slate-700">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Entrega</span>
                    <span className="font-bold text-green-600">Grátis</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total a Pagar</span>
                    <span className="text-2xl font-bold text-indigo-600">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-sm text-slate-700 mb-2">Dados de Entrega</h4>
                  <p className="text-sm text-slate-600">{name} - {phone}</p>
                  <p className="text-sm text-slate-600 mt-1">{address}</p>
                </div>

                {config?.enableNativePayment && (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="mt-0.5 text-indigo-600">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900 text-sm">Pagamento via PIX</h4>
                      <p className="text-xs text-indigo-700 mt-1">
                        Ao confirmar, você receberá o QR Code e o código Copia e Cola para realizar o pagamento.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white p-4 border-t border-slate-200 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase">Total</span>
            <span className="text-xl font-bold text-slate-800">R$ {total.toFixed(2)}</span>
          </div>
          
          {step === 0 ? (
            <button 
              onClick={() => setStep(1)}
              disabled={cart.length === 0}
              className="px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              Continuar <ArrowRight size={18} />
            </button>
          ) : step < (config?.enableNativePayment ? 3 : 2) ? (
            <button 
              onClick={handleNext}
              className="px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 flex items-center gap-2"
            >
              Próximo <ArrowRight size={18} />
            </button>
          ) : (
            <button 
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-8 py-3.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 disabled:opacity-70 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Confirmar Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
