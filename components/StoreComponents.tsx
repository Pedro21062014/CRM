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
    className={`w-full py-12 md:py-24 px-4 md:px-8 text-center flex flex-col items-center justify-center min-h-[300px] md:min-h-[450px] bg-cover bg-center transition-all relative group ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
    style={{ 
      backgroundColor: section.backgroundColor || '#1e293b', 
      backgroundImage: section.imageUrl ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${section.imageUrl})` : 'none',
      color: section.textColor || '#ffffff' 
    }}
  >
    {isEditable && isActive && <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow z-10">Editando</div>}
    
    <div className="max-w-5xl w-full relative z-0">
        {isEditable ? (
            <input 
                value={section.title || ''}
                onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
                className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight bg-transparent border-none text-center w-full focus:ring-2 focus:ring-white/20 rounded outline-none placeholder-white/50"
                placeholder="Título do Banner"
            />
        ) : (
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight break-words tracking-tight">{section.title || 'Bem-vindo'}</h1>
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
            <p className="text-base md:text-xl opacity-90 max-w-3xl mx-auto break-words whitespace-pre-wrap leading-relaxed">{section.content}</p>
        )}
    </div>
  </div>
);

export const TextSection: React.FC<SectionProps> = ({ section, isEditable, onUpdate, isActive, onClick }) => (
  <div 
    onClick={onClick}
    className={`w-full py-12 md:py-20 px-4 md:px-8 transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
    style={{ backgroundColor: section.backgroundColor || '#ffffff', color: section.textColor || '#0f172a' }}
  >
    <div className="max-w-4xl mx-auto text-center">
      {isEditable ? (
          <input 
            value={section.title || ''}
            onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
            className="text-2xl md:text-4xl font-bold mb-6 bg-transparent border-none text-center w-full focus:ring-2 focus:ring-slate-400/20 rounded outline-none"
            placeholder="Título da Seção"
            style={{ color: section.textColor }}
          />
      ) : (
          section.title && <h2 className="text-2xl md:text-4xl font-bold mb-6 break-words tracking-tight">{section.title}</h2>
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
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words">{section.content}</p>
      )}
    </div>
  </div>
);

export const ProductGridSection: React.FC<SectionProps> = ({ section, products = [], onAddToCart, isEditable, onUpdate, isActive, onClick }) => {
  // Filter products if a category is defined in the section
  const displayProducts = section.filterCategory 
    ? products.filter(p => p.category?.toLowerCase().trim() === section.filterCategory?.toLowerCase().trim())
    : products;

  return (
    <div 
      onClick={onClick}
      className={`w-full py-12 md:py-20 px-4 md:px-8 transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
      style={{ backgroundColor: section.backgroundColor || '#f8fafc' }}
    >
      <div className="max-w-7xl mx-auto">
        {isEditable ? (
           <input 
              value={section.title || ''}
              onChange={(e) => onUpdate && onUpdate({ title: e.target.value })}
              className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center w-full bg-transparent border-none focus:ring-2 focus:ring-slate-400/20 rounded outline-none block"
              style={{ color: section.textColor }}
              placeholder="Título dos Produtos"
           />
        ) : (
           section.title && <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center break-words" style={{ color: section.textColor }}>{section.title}</h2>
        )}
        
        {displayProducts.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-300 rounded-xl">
              <p className="text-gray-500 mb-2">
                 {section.filterCategory 
                    ? `Nenhum produto encontrado na categoria "${section.filterCategory}".` 
                    : "Nenhum produto cadastrado."}
              </p>
              {isEditable && <p className="text-xs text-indigo-500">Dica: Verifique se o nome da categoria nos produtos corresponde ao filtro da seção.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {displayProducts.map(product => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col h-full border border-slate-100">
                <div className="h-48 sm:h-52 bg-gray-100 relative overflow-hidden shrink-0">
                  <img 
                    src={product.imageUrl || `https://picsum.photos/400/300?random=${product.id}`} 
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {!isEditable && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-slate-800 mb-1 leading-snug break-words">{product.name}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                    <span className="text-xl font-extrabold text-slate-900">R$ {product.price.toFixed(2)}</span>
                    <button 
                      onClick={() => onAddToCart && onAddToCart(product)}
                      className={`p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors active:scale-95 shadow-lg shadow-slate-200 ${isEditable ? 'pointer-events-none opacity-50' : ''}`}
                      aria-label="Adicionar ao carrinho"
                    >
                      <ShoppingBag size={20} strokeWidth={2.5} />
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
};