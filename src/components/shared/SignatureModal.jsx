import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eraser, Save } from 'lucide-react';

export default function SignatureModal({ isOpen, onClose, onSave, documentName }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!signatureName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!hasDrawn) {
      alert('Please provide a signature');
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL();
    onSave(signatureData, signatureName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="glass-flat p-3 rounded-xl">
            <p className="text-sm font-medium mb-1">Document:</p>
            <p className="text-sm text-foreground-muted">{documentName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Your Name *</label>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full name"
              className="glass-inset"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Signature *</label>
              <Button
                type="button"
                onClick={clearSignature}
                className="glass-button text-xs flex items-center gap-1"
              >
                <Eraser className="w-3 h-3" />
                Clear
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="border-2 border-border rounded-xl cursor-crosshair bg-white w-full"
              style={{ touchAction: 'none' }}
            />
            <p className="text-xs text-foreground-muted mt-2">
              Draw your signature above using your mouse or touchpad
            </p>
          </div>

          <div className="glass-flat p-3 rounded-xl text-xs text-foreground-muted">
            <p className="font-semibold mb-1">By signing this document, you acknowledge:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>This signature is legally binding</li>
              <li>You have reviewed the document contents</li>
              <li>The timestamp and your details will be recorded</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={onClose} className="glass-button">
              Cancel
            </Button>
            <Button onClick={handleSave} className="glass-button text-accent flex items-center gap-2">
              <Save className="w-4 h-4" />
              Sign & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}