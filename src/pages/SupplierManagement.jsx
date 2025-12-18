import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Edit, 
  Trash2, 
  Upload,
  Download,
  Loader
} from 'lucide-react';
import AddSupplierModal from '../components/shared/AddSupplierModal';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleDelete = (supplier) => {
    if (window.confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      deleteMutation.mutate(supplier.id);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditingSupplier(null);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const suppliers = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const supplier = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          // Handle emails and manufacturer_associations - expect pipe-separated list
          if (header === 'emails' || header === 'manufacturer_associations') {
            supplier[header] = value ? value.split('|').map(m => m.trim()).filter(Boolean) : [];
          } else {
            supplier[header] = value;
          }
        });
        
        // Only add if required fields are present
        if (supplier.name && supplier.contact_name && supplier.phone && supplier.emails && supplier.emails.length > 0) {
          suppliers.push(supplier);
        }
      }

      // Bulk create suppliers
      await base44.entities.Supplier.bulkCreate(suppliers);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      alert(`Successfully imported ${suppliers.length} suppliers`);
    } catch (error) {
      console.error('CSV upload error:', error);
      alert('Failed to import suppliers: ' + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleExportCSV = () => {
    const headers = ['name', 'contact_name', 'phone', 'emails', 'address_line_1', 'address_line_2', 'town', 'county', 'postcode', 'website', 'account_number', 'manufacturer_associations', 'notes'];
    const csvContent = [
      headers.join(','),
      ...suppliers.map(s => 
        headers.map(h => {
          const value = s[h];
          // Join emails and manufacturer_associations with pipe separator
          if ((h === 'emails' || h === 'manufacturer_associations') && Array.isArray(value)) {
            return value.join('|');
          }
          // Backward compatibility: if old 'email' field exists, migrate it
          if (h === 'emails' && !value && s.email) {
            return s.email;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.emails?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) // Backward compatibility
  );

  return (
    <div className="space-y-4">
      <AddSupplierModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSuccess={() => {}}
        editingSupplier={editingSupplier}
      />

      <div className="neomorph p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("Settings")}>
            <Button className="neomorph-flat p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <Building2 className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Supplier Management</h1>
              <p className="text-xs text-foreground-muted">Manage suppliers and their manufacturer associations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
              id="csv-upload"
              disabled={isUploading}
            />
            <label htmlFor="csv-upload">
              <Button className="neomorph-flat gap-2" disabled={isUploading} as="span">
                {isUploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </>
                )}
              </Button>
            </label>
            <Button onClick={handleExportCSV} className="neomorph-flat gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="neomorph-flat gap-2 bg-accent/10 text-accent">
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neomorph-inset pl-10"
          />
        </div>
      </div>

      <div className="neomorph p-4">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
            <p className="text-foreground-muted">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-foreground-muted" />
            <p className="text-foreground-muted mb-4">No suppliers found</p>
            <Button onClick={() => setIsAddModalOpen(true)} className="neomorph-flat gap-2">
              <Plus className="w-4 h-4" />
              Add First Supplier
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="neomorph-flat p-4 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{supplier.name}</h3>
                    <p className="text-sm text-foreground-muted">{supplier.contact_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(supplier)}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier)}
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Phone className="w-3 h-3" />
                    <span>{supplier.phone}</span>
                  </div>
                  {(supplier.emails && supplier.emails.length > 0) ? (
                    <div className="space-y-1">
                      {supplier.emails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-foreground-muted">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{email}</span>
                        </div>
                      ))}
                    </div>
                  ) : supplier.email ? (
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  ) : null}
                  {supplier.postcode && (
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <MapPin className="w-3 h-3" />
                      <span>{supplier.postcode}</span>
                    </div>
                  )}
                </div>

                {supplier.manufacturer_associations && supplier.manufacturer_associations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-foreground-muted mb-2">Manufacturers:</p>
                    <div className="flex flex-wrap gap-1">
                      {supplier.manufacturer_associations.slice(0, 3).map((mfr, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                          {mfr}
                        </span>
                      ))}
                      {supplier.manufacturer_associations.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-foreground-muted">
                          +{supplier.manufacturer_associations.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}