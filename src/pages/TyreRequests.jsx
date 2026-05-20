import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, Filter, Mail, CheckCircle, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function TyreRequests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: tyreRequests = [], isLoading } = useQuery({
    queryKey: ["tyreRequests"],
    queryFn: () => base44.entities.TyreRequest.list("-created_date"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TyreRequest.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tyreRequests"] });
      toast({
        title: "Status Updated",
        description: "The tyre request status has been updated.",
      });
    },
  });

  const filteredRequests = tyreRequests.filter((req) => {
    const matchesSearch =
      req.claim_reg?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.repairer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.tyre_make?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesType = requestTypeFilter === "all" || req.request_type === requestTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColors = {
    Pending: "bg-yellow-500",
    Processed: "bg-blue-500",
    Completed: "bg-green-500",
  };

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleEmailClick = (req) => {
    const subject = `${req.request_type === 'price' ? 'Price Request' : 'Order'} - ${req.tyre_make} (${req.tyre_size})`;
    const body = `TYRE ${req.request_type === 'price' ? 'PRICE REQUEST' : 'ORDER'}

Vehicle Details:
- Registration: ${req.vehicle_reg || 'N/A'}
- Make: ${req.vehicle_make || 'N/A'}
- Model: ${req.vehicle_model || 'N/A'}

Tyre Details:
- Tyre Make/Model: ${req.tyre_make}
- Tyre Size: ${req.tyre_size}
- Quantity: ${req.tyre_quantity || 1}

Customer Details:
- Company: ${req.company_name || 'N/A'}
- Contact Name: ${req.customer_name}
- Phone: ${req.customer_phone}
- Email: ${req.customer_email}

Additional Notes:
${req.notes || 'None'}

Request Type: ${req.request_type === 'price' ? 'Price Request' : 'Order'}
`;
    
    window.open(`mailto:paul@rcmautomotive.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold">Tyre Requests</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reg, repairer, or tyre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processed">Processed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={requestTypeFilter} onValueChange={setRequestTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="price">Price Request</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-foreground-muted">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tyre requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredRequests.map((req) => (
              <Card key={req.id} className="card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[req.status]}>
                          {req.status}
                        </Badge>
                        <Badge variant="outline">
                          {req.request_type === 'price' ? 'Price Request' : 'Order'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEmailClick(req)}
                        className="gap-1"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </Button>
                      <Select
                        value={req.status}
                        onValueChange={(value) => handleStatusChange(req.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Processed">Processed</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                      <p className="font-semibold">{req.vehicle_reg || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{req.vehicle_make} {req.vehicle_model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tyre Details</p>
                      <p className="font-semibold">{req.tyre_make}</p>
                      <p className="text-sm text-muted-foreground">{req.tyre_size} (Qty: {req.tyre_quantity || 1})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer</p>
                      <p className="font-semibold">{req.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{req.company_name}</p>
                      <p className="text-xs text-muted-foreground">{req.customer_phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}