import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function TyreRequestForm({ onClose }) {
  const [formData, setFormData] = useState({
    request_type: "price",
    tyre_make: "",
    tyre_size: "",
    tyre_quantity: 1,
    vehicle_reg: "",
    vehicle_make: "",
    vehicle_model: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    company_name: "",
    notes: ""
  });

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.TyreRequest.create(data),
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your tyre request has been submitted successfully.",
      });
      if (onClose) onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-accent" />
          <CardTitle>Tyre Request</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Request Type *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price Request</SelectItem>
                  <SelectItem value="order">Place Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tyre Quantity</Label>
              <Input
                type="number"
                min="1"
                value={formData.tyre_quantity}
                onChange={(e) => setFormData({ ...formData, tyre_quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Tyre Make/Model *</Label>
              <Input
                placeholder="e.g. Michelin Primacy 4"
                value={formData.tyre_make}
                onChange={(e) => setFormData({ ...formData, tyre_make: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Tyre Size *</Label>
              <Input
                placeholder="e.g. 205/55 R16"
                value={formData.tyre_size}
                onChange={(e) => setFormData({ ...formData, tyre_size: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Vehicle Registration</Label>
              <Input
                placeholder="e.g. AB12 CDE"
                value={formData.vehicle_reg}
                onChange={(e) => setFormData({ ...formData, vehicle_reg: e.target.value })}
              />
            </div>

            <div>
              <Label>Vehicle Make</Label>
              <Input
                placeholder="e.g. Ford"
                value={formData.vehicle_make}
                onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
              />
            </div>

            <div>
              <Label>Vehicle Model</Label>
              <Input
                placeholder="e.g. Focus"
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Contact Name *</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional requirements or information..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="h-24"
            />
          </div>

          <div className="flex justify-end gap-2">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}