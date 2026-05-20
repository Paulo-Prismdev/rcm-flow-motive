import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendTyreRequestEmail } from "@/functions/sendTyreRequestEmail";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export default function TyreRequestForm({ claim }) {
    const [requestType, setRequestType] = useState("price");
    const [tyreMake, setTyreMake] = useState("");
    const [tyreSize, setTyreSize] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!tyreMake || !tyreSize) {
            toast({
                title: "Missing Information",
                description: "Please enter both tyre make and size.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await sendTyreRequestEmail({
                claimId: claim.id,
                tyreMake,
                tyreSize,
                requestType
            });

            toast({
                title: "Request Sent",
                description: `Your tyre ${requestType === 'price' ? 'price request' : 'order'} has been submitted successfully.`,
            });

            // Reset form
            setTyreMake("");
            setTyreSize("");
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit request.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Tyre Pricing & Ordering</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Request Type */}
                    <div className="space-y-2">
                        <Label>Request Type</Label>
                        <RadioGroup
                            value={requestType}
                            onValueChange={setRequestType}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="price" id="price" />
                                <Label htmlFor="price" className="cursor-pointer">Request Price</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="order" id="order" />
                                <Label htmlFor="order" className="cursor-pointer">Order Tyre</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Vehicle Info (Read-only) */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                            <Label className="text-xs text-muted-foreground">Vehicle Reg</Label>
                            <p className="font-medium">{claim.reg || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Make</Label>
                            <p className="font-medium">{claim.vehicle_make || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Model</Label>
                            <p className="font-medium">{claim.vehicle_model || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Tyre Make */}
                    <div className="space-y-2">
                        <Label htmlFor="tyreMake">Tyre Make/Model *</Label>
                        <Input
                            id="tyreMake"
                            value={tyreMake}
                            onChange={(e) => setTyreMake(e.target.value)}
                            placeholder="e.g. Michelin Primacy 4"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Tyre Size */}
                    <div className="space-y-2">
                        <Label htmlFor="tyreSize">Tyre Size *</Label>
                        <Input
                            id="tyreSize"
                            value={tyreSize}
                            onChange={(e) => setTyreSize(e.target.value)}
                            placeholder="e.g. 205/55 R16"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {requestType === 'price' ? 'Request Price' : 'Order Tyre'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}