import React from 'react';
import { StoreSection, Product } from '../types';
import { ShoppingBag, Plus } from 'lucide-react';

interface SectionProps {
  section: StoreSection;
  products?: Product[];
  onAddToCart?: (product: Product) => void;
  isEditable?: boolean;
  onUpdate?: (updates: Partial<StoreSection>) => void;
  isActive?: boolean;
  onClick?: () => void;
}

export const HeroSection: React.FC<SectionProps> = ({ section, isEditable, onUpdate, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`w-full py-12 md:py-20 px-4 md:px-6 text-center flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] bg-cover bg-center transition-all relative group ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
    style={{ 
      backgroundColor: section.backgroundColor || '#1e293b', 
      backgroundImage: section.imageUrl ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${section.imageUrl})` : 'none',
      color: section.textColor || '#ffffff' 
    }}
  >
    {isEditable && isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow">Editando</div>}
    
    <div className="max-w-4xl w-full">
        {isEditable ? (
            <input 
                value={section.title || ''}
                onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
                className="text-3xl md:text-6xl font-bold mb-4 leading-tight bg-transparent border-none text-center w-full focus:ring-2 focus:ring-white/20 rounded outline-none placeholder-white/50"
                placeholder="Título do Banner"
            />
        ) : (
            <h1 className="text-3xl md:text-6xl font-bold mb-4 leading-tight">{section.title || 'Bem-vindo'}</h1>
        )}

        {isEditable ? (
            <textarea 
                value={section.content || ''}
                onChange={(e) => onUpdate && onUpdate({ content: e.target.value })}
                className="text-base md:text-xl opacity-90 w-full bg-transparent border-none text-center focus:ring-2 focus:ring-white/20 rounded outline-none resize-none placeholder-white/50"
                rows={2}
                placeholder="Subtítulo ou descrição curta"
            />
        ) : (
            <p className="text-base md:text-xl opacity-90 max-w-2xl mx-auto">{section.content}</p>
        )}
    </div>
  </div>
);

export const TextSection: React.FC<SectionProps> = ({ section, isEditable, onUpdate, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`w-full py-10 md:py-16 px-4 md:px-6 transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
    style={{ backgroundColor: section.backgroundColor || '#ffffff', color: section.textColor || '#0f172a' }}
  >
    <div className="max-w-4xl mx-auto text-center">
      {isEditable ? (
          <input 
            value={section.title || ''}
            onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
            className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 bg-transparent border-none text-center w-full focus:ring-2 focus:ring-slate-400/20 rounded outline-none"
            placeholder="Título da Seção"
            style={{ color: section.textColor }}
          />
      ) : (
          section.title && <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">{section.title}</h2>
      )}
      
      {isEditable ? (
          <textarea
            value={section.content || ''}
            onChange={(e) => onUpdate && onUpdate({ content: e.target.value })}
            className="text-base md:text-lg leading-relaxed whitespace-pre-wrap w-full bg-transparent border-none text-center focus:ring-2 focus:ring-slate-400/20 rounded outline-none resize-none min-h-[100px]"
            placeholder="Digite seu texto aqui..."
            style={{ color: section.textColor }}
          />
      ) : (
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">{section.content}</p>
      )}
    </div>
  </div>
);

export const ProductGridSection: React.FC<SectionProps> = ({ section, products = [], onAddToCart, isEditable, onUpdate, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`w-full py-10 md:py-16 px-4 md:px-6 transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
    style={{ backgroundColor: section.backgroundColor || '#f8fafc' }}
  >
    <div className="max-w-7xl mx-auto">
      {isEditable ? (
         <input 
            value={section.title || ''}
            onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
            className="text-2xl md:text-3xl font-bold mb-8 md:mb-10 text-center w-full bg-transparent border-none focus:ring-2 focus:ring-slate-400/20 rounded outline-none block"
            style={{ color: section.textColor }}
            placeholder="Título dos Produtos"
         />
      ) : (
         section.title && <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-10 text-center" style={{ color: section.textColor }}>{section.title}</h2>
      )}
      
      {products.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl">
            <p className="text-gray-500 mb-2">Nenhum produto cadastrado.</p>
            {isEditable && <p className="text-xs text-indigo-500">Adicione produtos no menu "Produtos" para vê-los aqui.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col">
              <div className="h-40 md:h-48 bg-gray-100 relative overflow-hidden shrink-0">
                <img 
                  src={product.imageUrl || `https://picsum.photos/400/300?random=${product.id}`} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 md:p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-lg text-slate-800 mb-1">{product.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{product.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-lg md:text-xl font-bold text-slate-900">R$ {product.price.toFixed(2)}</span>
                  <button 
                    onClick={() => onAddToCart && onAddToCart(product)}
                    className={`p-2 md:p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors active:scale-95 ${isEditable ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <ShoppingBag size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);