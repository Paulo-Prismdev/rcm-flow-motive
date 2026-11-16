import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Phone, Mail, CheckSquare, Square, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SupplierTrackingSection({ part, onUpdate, isOpen, onToggle }) {
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const contactedSuppliers = part.contacted_suppliers || [];
  const suppliersWithStock = part.suppliers_with_stock || [];

  const handleToggleContacted = (supplierName) => {
    const isCurrentlyContacted = contactedSuppliers.includes(supplierName);
    
    let updatedContacted;
    if (isCurrentlyContacted) {
      updatedContacted = contactedSuppliers.filter(name => name !== supplierName);
    } else {
      updatedContacted = [...contactedSuppliers, supplierName];
    }

    onUpdate({ ...part, contacted_suppliers: updatedContacted });
  };

  const handleToggleStock = (supplierName) => {
    const currentlyHasStock = suppliersWithStock.includes(supplierName);
    
    let updatedStock;
    if (currentlyHasStock) {
      updatedStock = suppliersWithStock.filter(name => name !== supplierName);
    } else {
      updatedStock = [...suppliersWithStock, supplierName];
      // If marking as having stock, also mark as contacted
      if (!contactedSuppliers.includes(supplierName)) {
        onUpdate({ 
          ...part, 
          contacted_suppliers: [...contactedSuppliers, supplierName],
          suppliers_with_stock: updatedStock
        });
        return;
      }
    }

    onUpdate({ ...part, suppliers_with_stock: updatedStock });
  };

  const handleContactAll = () => {
    const allSupplierNames = allSuppliers.map(s => s.name);
    onUpdate({ ...part, contacted_suppliers: allSupplierNames });
  };

  const handleClearContacted = () => {
    onUpdate({ ...part, contacted_suppliers: [] });
  };

  if (!isOpen) return null;

  return (
    <div className="neomorph p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            Supplier Search Tracking
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track which suppliers you've contacted and who has the part in stock
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="neomorph-flat px-4 py-2">
            <span className="text-sm text-muted-foreground">Contacted: </span>
            <span className="font-bold text-info-fg">{contactedSuppliers.length}</span>
            <span className="text-sm text-muted-foreground"> / </span>
            <span className="font-bold text-foreground">{allSuppliers.length}</span>
          </div>
          <div className="neomorph-flat px-4 py-2">
            <span className="text-sm text-muted-foreground">In Stock: </span>
            <span className="font-bold text-success-fg">{suppliersWithStock.length}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            onClick={handleContactAll}
            className="neomorph-flat px-4 py-2 text-sm"
            disabled={contactedSuppliers.length === allSuppliers.length}
          >
            Mark All Contacted
          </Button>
          <Button
            onClick={handleClearContacted}
            className="neomorph-flat px-4 py-2 text-sm"
            disabled={contactedSuppliers.length === 0}
          >
            Clear Contacted
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {allSuppliers.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-8">
            No suppliers in database. Add suppliers to track them here.
          </p>
        ) : (
          allSuppliers.map(supplier => {
            const isContacted = contactedSuppliers.includes(supplier.name);
            const hasStock = suppliersWithStock.includes(supplier.name);
            
            return (
              <div
                key={supplier.id}
                className={`neomorph-inset p-4 transition-all ${
                  hasStock ? 'border-2 border-success' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-medium text-foreground text-lg">{supplier.name}</h4>
                      {hasStock && (
                        <span className="neomorph-flat px-3 py-1 text-xs font-medium text-success-fg flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          In Stock
                        </span>
                      )}
                    </div>
                    
                    {supplier.contact_name && (
                      <p className="text-sm text-muted-foreground mb-2">Contact: {supplier.contact_name}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 mb-3">
                      {supplier.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${supplier.phone}`} className="hover:text-gold">
                            {supplier.phone}
                          </a>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${supplier.email}`} className="hover:text-gold">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 mt-3 pt-3 border-t border-border border-opacity-50">
                      <button
                        onClick={() => handleToggleContacted(supplier.name)}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:text-info-fg transition-colors"
                      >
                        {isContacted ? (
                          <CheckSquare className="w-5 h-5 text-info-fg" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={isContacted ? 'text-info-fg font-medium' : 'text-muted-foreground'}>
                          Contacted
                        </span>
                      </button>

                      <button
                        onClick={() => handleToggleStock(supplier.name)}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:text-success-fg transition-colors"
                      >
                        {hasStock ? (
                          <CheckSquare className="w-5 h-5 text-success-fg" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className={hasStock ? 'text-success-fg font-medium' : 'text-muted-foreground'}>
                          Has Stock
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}