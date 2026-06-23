import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader, CheckCircle } from 'lucide-react';
import { BUILT_IN_PDF_TEMPLATES } from './WizardConstants';

export default function WizardInstructionStep({
  selectedBodyshop, pdfTemplates, selectedPdfTemplate,
  isGeneratingPdf, generatedPdfUrl,
  onSelectTemplate, onGeneratePdf
}) {
  const activeCustomTemplates = pdfTemplates.filter(t => t.is_active);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <p className="font-medium">Selected Repairer: {selectedBodyshop?.name}</p>
        <p className="text-sm text-muted-foreground">{selectedBodyshop?.email}</p>
      </div>

      <h3 className="font-bold text-lg">Select Template</h3>
      <p className="text-sm text-muted-foreground">
        Select a template to generate the bodyshop instruction PDF. This will open in a new tab and be saved to the claim.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUILT_IN_PDF_TEMPLATES.map((template) => {
          const IconComponent = template.icon;
          return (
            <div key={template.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSelectTemplate(template.id)}>
              <div className="text-center">
                <IconComponent className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">{template.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {activeCustomTemplates.length > 0 && (
        <>
          <h4 className="font-medium mt-4">Custom Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCustomTemplates.map((template) => (
              <div key={template.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPdfTemplate === template.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onSelectTemplate(template.id)}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <p className="font-medium">{template.template_name}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Button onClick={onGeneratePdf} disabled={isGeneratingPdf} className="w-full py-3">
        {isGeneratingPdf ? (
          <><Loader className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><FileText className="w-4 h-4 mr-2" /> Generate & View Instruction PDF</>
        )}
      </Button>

      {generatedPdfUrl && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          PDF generated successfully and saved to claim attachments
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        You can skip this step if you don't need to generate an instruction document.
      </p>
    </div>
  );
}