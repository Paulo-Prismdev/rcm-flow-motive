import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calculator, Package, FileText, TrendingUp, Wrench, Gift, CheckCircle2 } from 'lucide-react';

const ICONS = { Calculator, Package, FileText, TrendingUp, Wrench };

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  pink: 'bg-pink-100 text-pink-600',
};

export default function RepairerProductsTab() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['portalProducts'],
    queryFn: async () => {
      const all = await base44.entities.PortalProduct.list('sort_order');
      return all.filter(p => p.is_active !== false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="neomorph p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">ARTURA Products & Services</h2>
        <p className="text-foreground-muted">Explore our range of services designed to help your business grow</p>
      </div>

      {products.length === 0 ? (
        <div className="neomorph p-12 text-center">
          <Gift className="w-16 h-16 mx-auto mb-4 text-foreground-muted" />
          <p className="text-foreground-muted">No products available at this time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(product => {
            const IconComp = ICONS[product.icon] || Package;
            const colorClass = COLOR_CLASSES[product.color] || COLOR_CLASSES.blue;
            return (
              <div key={product.id} className="neomorph p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-sm text-foreground-muted mb-4">{product.description}</p>
                    {product.features?.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {product.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {product.link_url && (
                      <button
                        onClick={() => window.open(product.link_url, '_blank')}
                        className="neomorph-flat px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 rounded-xl"
                      >
                        Learn More →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="neomorph p-6 text-center bg-accent/5">
        <h3 className="font-bold text-lg mb-2">Interested in partnering with ARTURA?</h3>
        <p className="text-foreground-muted mb-4">Contact us to discuss how we can support your business</p>
        <button className="neomorph-flat px-6 py-3 font-medium bg-accent text-accent-foreground rounded-xl">
          Contact Us
        </button>
      </div>
    </div>
  );
}