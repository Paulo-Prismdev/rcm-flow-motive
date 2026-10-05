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
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-2.5 space-y-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{savedToDocs ? 'Saved to claim docs.' : 'PDF generated — save it now or it saves at allocation.'}</span>
          </div>
          {!savedToDocs && (
            <Button variant="outline" size="sm" onClick={onSaveToDocs} disabled={isSavingToDocs} className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30">
              {isSavingToDocs ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save to Claim Docs Now</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}