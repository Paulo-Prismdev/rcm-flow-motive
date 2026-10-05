import React from 'react';
import { FileText } from 'lucide-react';
import { BUILT_IN_PDF_TEMPLATES } from './WizardConstants';

export default function WizardTemplatePicker({
  pdfTemplates,
  selectedPdfTemplate,
  onSelectTemplate,
  readOnly = false,
}) {
  const activeCustomTemplates = pdfTemplates.filter(t => t.is_active);

  return (
    <div>
      <h3 className="font-bold text-sm mb-1">Instruction Template</h3>
      <p className="text-xs text-muted-foreground mb-2">
        {readOnly
          ? 'Template selected on the previous step. Go back to change it.'
          : 'Pre-selected from your instruction type. Switch only if you need a different layout.'}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {BUILT_IN_PDF_TEMPLATES.map((template) => {
          const IconComponent = template.icon;
          const isSelected = selectedPdfTemplate === template.id;
          return (
            <div
              key={template.id}
              className={`p-2.5 rounded-lg border-2 transition-all text-center ${
                readOnly ? 'cursor-default' : 'cursor-pointer'
              } ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
              onClick={readOnly ? undefined : () => onSelectTemplate(template.id)}
            >
              <IconComponent className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="font-medium text-xs">{template.name}</p>
            </div>
          );
        })}
      </div>
      {activeCustomTemplates.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {activeCustomTemplates.map((template) => {
            const isSelected = selectedPdfTemplate === template.id;
            return (
              <div
                key={template.id}
                className={`p-2.5 rounded-lg border-2 transition-all flex items-center gap-2 ${
                  readOnly ? 'cursor-default' : 'cursor-pointer'
                } ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={readOnly ? undefined : () => onSelectTemplate(template.id)}
              >
                <FileText className="w-4 h-4 text-primary" />
                <p className="font-medium text-xs">{template.template_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}