import React from 'react';
import { StoreSection, Product } from '../types';
import { ShoppingBag } from 'lucide-react';

interface SectionProps {
  section: StoreSection;
  products?: Product[];
  onAddToCart?: (product: Product) => void;
}

export const HeroSection: React.FC<SectionProps> = ({ section }) => (
  <div 
    className="w-full py-20 px-6 text-center flex flex-col items-center justify-center min-h-[400px] bg-cover bg-center transition-all"
    style={{ 
      backgroundColor: section.backgroundColor || '#1e293b', 
      backgroundImage: section.imageUrl ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${section.imageUrl})` : 'none',
      color: section.textColor || '#ffffff' 
    }}
  >
    <h1 className="text-4xl md:text-6xl font-bold mb-4">{section.title || 'Bem-vindo'}</h1>
    <p className="text-xl opacity-90 max-w-2xl">{section.content}</p>
  </div>
);

export const TextSection: React.FC<SectionProps> = ({ section }) => (
  <div 
    className="w-full py-16 px-6"
    style={{ backgroundColor: section.backgroundColor || '#ffffff', color: section.textColor || '#0f172a' }}
  >
    <div className="max-w-4xl mx-auto text-center">
      {section.title && <h2 className="text-3xl font-bold mb-6">{section.title}</h2>}
      <p className="text-lg leading-relaxed whitespace-pre-wrap">{section.content}</p>
    </div>
  </div>
);

export const ProductGridSection: React.FC<SectionProps> = ({ section, products = [], onAddToCart }) => (
  <div 
    className="w-full py-16 px-6"
    style={{ backgroundColor: section.backgroundColor || '#f8fafc' }}
  >
    <div className="max-w-7xl mx-auto">
      {section.title && <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: section.textColor }}>{section.title}</h2>}
      
      {products.length === 0 ? (
        <p className="text-center text-gray-500">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                <img 
                  src={product.imageUrl || `https://picsum.photos/400/300?random=${product.id}`} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg text-slate-800 mb-1">{product.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-900">R$ {product.price.toFixed(2)}</span>
                  <button 
                    onClick={() => onAddToCart && onAddToCart(product)}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
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
