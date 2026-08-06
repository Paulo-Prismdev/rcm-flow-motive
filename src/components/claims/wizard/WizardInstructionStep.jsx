import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader, CheckCircle, Save } from 'lucide-react';
import { BUILT_IN_PDF_TEMPLATES } from './WizardConstants';

export default function WizardInstructionStep({
  selectedBodyshop, pdfTemplates, selectedPdfTemplate,
  isGeneratingPdf, generatedPdfUrl,
  isSavingToDocs, savedToDocs,
  onSelectTemplate, onGeneratePdf, onSaveToDocs
}) {
  const activeCustomTemplates = pdfTemplates.filter(t => t.is_active);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium text-sm">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-xs text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      <h3 className="font-bold text-sm">Select Template</h3>
      <p className="text-xs text-muted-foreground">
      Select a template to generate the bodyshop instruction PDF. It opens in a new tab and is saved to the claim when you allocate the repairer.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BUILT_IN_PDF_TEMPLATES.map((template) => {
          const IconComponent = template.icon;
          return (
            <div key={template.id}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSelectTemplate(template.id)}>
              <div className="text-center">
                <IconComponent className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="font-medium text-sm">{template.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {activeCustomTemplates.length > 0 && (
        <>
          <h4 className="font-medium text-sm mt-2">Custom Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeCustomTemplates.map((template) => (
              <div key={template.id}
                className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onSelectTemplate(template.id)}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <p className="font-medium text-sm">{template.template_name}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Button onClick={onGeneratePdf} disabled={isGeneratingPdf} className="w-full h-10">
        {isGeneratingPdf ? (
          <><Loader className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><FileText className="w-4 h-4 mr-2" /> Generate & View Instruction PDF</>
        )}
      </Button>

      {generatedPdfUrl && (
        <>
          <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">
              {savedToDocs
                ? 'PDF saved to claim docs — it will be attached at allocation too.'
                : 'PDF generated — it will be saved to the claim when you allocate the repairer.'}
            </span>
          </div>
          {!savedToDocs && (
            <Button
              variant="outline"
              onClick={onSaveToDocs}
              disabled={isSavingToDocs}
              className="w-full h-10"
            >
              {isSavingToDocs ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save to Claim Docs Now</>
              )}
            </Button>
          )}
        </>
      )}

      <p className="text-xs text-muted-foreground text-center">
        You can skip this step if you don't need to generate an instruction document.
      </p>
    </div>
  );
}