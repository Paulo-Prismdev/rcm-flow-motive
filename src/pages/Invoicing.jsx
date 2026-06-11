import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileText, Calculator, Wrench, Package, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusBadge from "../components/shared/StatusBadge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Invoicing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const { data: claims = [] } = useQuery({
    queryKey: ['claims'],
    queryFn: () => base44.entities.Claim.list('-updated_date'),
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates'],
    queryFn: () => base44.entities.Estimate.list('-updated_date'),
  });

  const { data: engineering = [] } = useQuery({
    queryKey: ['engineering'],
    queryFn: () => base44.entities.Engineering.list('-updated_date'),
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-updated_date'),
  });

  // Combine all items with invoice information
  const allInvoiceItems = [
    ...claims.filter(c => !c.archived).map(c => ({
      ...c,
      type: 'Claim',
      icon: FileText,
      color: 'text-blue-600',
      link: createPageUrl(`Claims?view=${c.id}`),
      reference: c.reg || 'No Reg',
      client: c.client_name,
    })),
    ...estimates.filter(e => !e.archived).map(e => ({
      ...e,
      type: 'Estimate',
      icon: Calculator,
      color: 'text-green-600',
      link: createPageUrl(`Estimating?view=${e.id}`),
      reference: e.name || 'Untitled',
      client: e.repairer,
    })),
    ...engineering.filter(e => !e.archived).map(e => ({
      ...e,
      type: 'Engineering',
      icon: Wrench,
      color: 'text-purple-600',
      link: createPageUrl(`Engineering?view=${e.id}`),
      reference: e.reference || 'Untitled',
      client: e.client_name,
    })),
    ...parts.filter(p => !p.archived).map(p => ({
      ...p,
      type: 'Parts',
      icon: Package,
      color: 'text-orange-600',
      link: createPageUrl(`Parts?view=${p.id}`),
      reference: p.vehicle_ref || 'No Ref',
      client: p.bodyshop_company,
    })),
  ];

  const filteredItems = allInvoiceItems.filter(item => {
    const matchesSearch = item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.external_invoice_ref?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.invoice_status === filterStatus;
    const matchesDepartment = filterDepartment === "all" || item.type === filterDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Group by invoice status
  const readyToInvoice = filteredItems.filter(i => i.invoice_status === 'Ready to Invoice');
  const invoiced = filteredItems.filter(i => i.invoice_status === 'Invoiced');
  const paid = filteredItems.filter(i => i.invoice_status === 'Invoice Paid');
  const overdue = filteredItems.filter(i => i.invoice_status === 'Invoice Overdue');

  const totalReadyValue = readyToInvoice.reduce((sum, i) => sum + (i.invoice_amount || 0), 0);
  const totalInvoicedValue = invoiced.reduce((sum, i) => sum + (i.invoice_amount || 0), 0);
  const totalOverdueValue = overdue.reduce((sum, i) => sum + (i.invoice_amount || 0), 0);

  return (
    <div className="h-full flex flex-col gap-3 lg:gap-6 overflow-hidden">
      <div className="neomorph p-4 lg:p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div>
            <h1 className="text-lg lg:text-2xl font-bold text-gray-700">Invoicing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage invoices across all departments</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:mb-6">
          <div className="neomorph-flat p-4">
            <p className="text-sm text-gray-500 mb-1">Ready to Invoice</p>
            <p className="text-2xl font-bold text-green-600">{readyToInvoice.length}</p>
            <p className="text-xs text-gray-500 mt-1">£{totalReadyValue.toFixed(2)}</p>
          </div>
          <div className="neomorph-flat p-4">
            <p className="text-sm text-gray-500 mb-1">Invoiced</p>
            <p className="text-2xl font-bold text-blue-600">{invoiced.length}</p>
            <p className="text-xs text-gray-500 mt-1">£{totalInvoicedValue.toFixed(2)}</p>
          </div>
          <div className="neomorph-flat p-4">
            <p className="text-sm text-gray-500 mb-1">Paid</p>
            <p className="text-2xl font-bold text-gray-600">{paid.length}</p>
          </div>
          <div className="neomorph-flat p-4">
            <p className="text-sm text-gray-500 mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-xs text-gray-500 mt-1">£{totalOverdueValue.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-2 lg:gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by reference, client, or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neomorph-inset px-4 py-3 text-gray-700 border-0 focus:ring-0"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="neomorph-inset px-3 py-2 text-gray-700 border-0 rounded-xl text-sm"
          >
            <option value="all">All Departments</option>
            <option value="Claim">Claims</option>
            <option value="Estimate">Estimating</option>
            <option value="Engineering">Engineering</option>
            <option value="Parts">Parts</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="neomorph-inset px-3 py-2 text-gray-700 border-0 rounded-xl text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="Ready to Invoice">Ready to Invoice</option>
            <option value="Invoice Required - Pending">Pending</option>
            <option value="Invoiced">Invoiced</option>
            <option value="Invoice Paid">Paid</option>
            <option value="Invoice Overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoice Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="neomorph p-8 text-center text-gray-500">
            No invoice items found matching your criteria.
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link to={item.link} key={`${item.type}-${item.id}`}>
                <div className="neomorph card-hover p-4 lg:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 lg:gap-4 mb-2 lg:mb-3 flex-wrap">
                        <div className="neomorph-flat p-2 lg:p-3 flex-shrink-0">
                          <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${item.color}`} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm lg:text-lg font-bold text-gray-700 truncate">{item.reference}</h3>
                          <p className="text-xs text-gray-500 truncate">{item.type} - {item.client || 'N/A'}</p>
                        </div>
                        <StatusBadge status={item.invoice_status || 'Not Ready for Invoicing'} />
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4 text-sm mt-2 lg:mt-4">
                        <div>
                          <p className="text-gray-500">Invoice Amount</p>
                          <p className="font-medium text-gray-700">
                            {item.invoice_amount ? `£${item.invoice_amount.toFixed(2)}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">External Ref</p>
                          <p className="font-medium text-gray-700">{item.external_invoice_ref || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Sent Date</p>
                          <p className="font-medium text-gray-700">
                            {item.invoice_sent_date ? format(new Date(item.invoice_sent_date), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Due Date</p>
                          <p className="font-medium text-gray-700">
                            {item.invoice_due_date ? format(new Date(item.invoice_due_date), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Payment Received</p>
                          <p className="font-medium text-gray-700">
                            {item.invoice_payment_received ? format(new Date(item.invoice_payment_received), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                      </div>
                      {item.invoice_notes && (
                        <div className="mt-3 neomorph-inset p-3">
                          <p className="text-xs text-gray-500 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{item.invoice_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}