import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle, Save, Download, RefreshCw } from 'lucide-react';

// Compact "generate instruction PDF + save to claim docs" control bar.
// Reused on the Review Details and Instruction & Email steps so the user
// can produce and persist the instruction without opening the email step.
export default function WizardGeneratePdfBar({
  isGeneratingPdf,
  generatedPdfUrl,
  onGeneratePdf,
  isSavingToDocs,
  savedToDocs,
  onSaveToDocs,
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-bold text-sm">Instruction PDF</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {generatedPdfUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(generatedPdfUrl, '_blank')} className="gap-2">
              <Download className="w-4 h-4" /> View PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onGeneratePdf} disabled={isGeneratingPdf} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isGeneratingPdf ? 'animate-spin' : ''}`} />
            {isGeneratingPdf ? 'Generating...' : generatedPdfUrl ? 'Regenerate PDF' : 'Generate PDF'}
          </Button>
        </div>
      </div>
      {generatedPdfUrl && !isGeneratingPdf && (
        <div className="rounded-lg border border-success/30 bg-success-bg p-2.5 space-y-2">
          <div className="flex items-center gap-2 text-success-fg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{savedToDocs ? 'Saved to claim docs.' : 'PDF generated — save it now or it saves at allocation.'}</span>
          </div>
          {!savedToDocs && (
            <Button variant="outline" size="sm" onClick={onSaveToDocs} disabled={isSavingToDocs} className="w-full gap-2 border-success/30 text-success-fg hover:bg-success-bg">
              {isSavingToDocs ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save to Claim Docs Now</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}