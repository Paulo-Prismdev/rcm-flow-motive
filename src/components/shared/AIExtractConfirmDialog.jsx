import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { X, Sparkles, ArrowRight, ArrowLeft, Check, Link as LinkIcon, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DocumentPreview from './DocumentPreview';

const LINKED_ENTITY_FIELDS = {
  client: ['client_name', 'client_phone', 'client_email', 'client_address_line_1', 'client_address_line_2', 'client_town', 'client_county', 'client_postcode'],
  referrer: ['referrer', 'referrer_email'],
  bodyshop: ['bodyshop', 'bodyshop_email'],
};

export default function AIExtractConfirmDialog({ isOpen, onClose, onConfirm, extractedData, existingData = {}, linkedEntityTypes = [], title = 'AI Data Extraction', fileUrl }) {
  const lockedFields = useMemo(
    () => new Set(linkedEntityTypes.flatMap(t => LINKED_ENTITY_FIELDS[t] || [])),
    [linkedEntityTypes]
  );

  const [selectedFields, setSelectedFields] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use refs so the init effect only fires when the dialog actually opens,
  // not every time the parent passes new object references (which was resetting
  // the user's toggle selections on every parent re-render).
  const extractedDataRef = useRef(extractedData);
  const existingDataRef = useRef(existingData);
  const lockedFieldsRef = useRef(lockedFields);
  extractedDataRef.current = extractedData;
  existingDataRef.current = existingData;
  lockedFieldsRef.current = lockedFields;

  useEffect(() => {
    if (!isOpen) return;
    const ed = extractedDataRef.current || {};
    const ex = existingDataRef.current || {};
    const lf = lockedFieldsRef.current;
    const initial = {};
    Object.keys(ed).forEach(key => {
      const value = ed[key];
      if (value !== null && value !== undefined && value !== '' && key !== '_source_snippets') {
        if (!lf.has(key)) {
          const valuesMatch = String(ex[key] || '') === String(value);
          initial[key] = !valuesMatch;
        }
      }
    });
    setSelectedFields(initial);
    setCurrentIndex(0);
  }, [isOpen]);

  // Fetch source snippets via AI when the dialog opens, so the user can see
  // where each extracted value came from in the document.
  const [fetchedSnippets, setFetchedSnippets] = useState({});
  const [isFetchingSnippets, setIsFetchingSnippets] = useState(false);
  const snippetsFetchedForRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !fileUrl || !extractedData) return;
    // Skip if the extraction already includes source snippets
    if (extractedData._source_snippets) return;
    // Skip if we already fetched for this file
    if (snippetsFetchedForRef.current === fileUrl) return;
    snippetsFetchedForRef.current = fileUrl;

    const fieldsList = Object.entries(extractedData)
      .filter(([key, value]) => key !== '_source_snippets' && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    if (!fieldsList) return;

    setIsFetchingSnippets(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `Look at this document. For each field below, find the exact text in the document where that value appears. Return a JSON object mapping field names to short text snippets (the surrounding text, about 10-30 words, showing where the value was found in the document). Include a few words before and after the value for context. If you cannot find where a value came from in the document, omit that field.\n\nFields to find:\n${fieldsList}`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {},
        additionalProperties: { type: "string" }
      }
    }).then(result => {
      setFetchedSnippets(result || {});
    }).catch(err => {
      console.error('Failed to fetch source snippets:', err);
    }).finally(() => {
      setIsFetchingSnippets(false);
    });
  }, [isOpen, fileUrl, extractedData]);

  if (!isOpen || !extractedData) return null;

  const sourceSnippets = { ...(fetchedSnippets || {}), ...(extractedData._source_snippets || {}) };
  const fields = Object.entries(extractedData).filter(([key, value]) =>
    key !== '_source_snippets' && value !== null && value !== undefined && value !== ''
  );

  const isFieldSelected = (key) => lockedFields.has(key) || !!selectedFields[key];

  const getLinkedEntityLabel = (fieldName) => {
    for (const [entityType, fieldNames] of Object.entries(LINKED_ENTITY_FIELDS)) {
      if (fieldNames.includes(fieldName) && linkedEntityTypes.includes(entityType)) {
        return entityType.charAt(0).toUpperCase() + entityType.slice(1);
      }
    }
    return null;
  };

  const toggleField = (fieldName) => {
    if (lockedFields.has(fieldName)) return;
    setSelectedFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handleConfirm = () => {
    const dataToApply = {};
    fields.forEach(([key]) => {
      if (isFieldSelected(key)) {
        dataToApply[key] = extractedData[key];
      }
    });
    onConfirm(dataToApply);
    onClose();
  };

  const formatFieldName = (key) =>
    key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const formatValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string' && value.length > 200) return value.substring(0, 200) + '...';
    return value;
  };

  const renderHighlightedSnippet = (snippet, value) => {
    if (!value || !snippet) return snippet;
    const valueStr = String(value).trim();
    if (!valueStr) return snippet;
    const idx = snippet.toLowerCase().indexOf(valueStr.toLowerCase());
    if (idx === -1) return snippet;
    return (
      <>
        {snippet.substring(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-700/50 text-gray-900 dark:text-yellow-100 rounded px-0.5 font-semibold">
          {snippet.substring(idx, idx + valueStr.length)}
        </mark>
        {snippet.substring(idx + valueStr.length)}
      </>
    );
  };

  const compareValues = (key, extractedValue) => {
    const existingValue = existingData[key];
    const hasExisting = existingValue !== null && existingValue !== undefined && existingValue !== '';
    const valuesMatch = hasExisting && String(existingValue) === String(extractedValue);
    return { hasExisting, existingValue, valuesMatch };
  };

  const [currentKey, currentValue] = fields[currentIndex] || [null, null];
  const { hasExisting, existingValue, valuesMatch } = currentKey ? compareValues(currentKey, currentValue) : {};
  const isLocked = currentKey ? lockedFields.has(currentKey) : false;
  const linkedEntity = currentKey ? getLinkedEntityLabel(currentKey) : null;
  const selectedCount = fields.filter(([key]) => isFieldSelected(key)).length;
  const isLastField = currentIndex === fields.length - 1;

  const goNext = () => {
    if (isLastField) {
      handleConfirm();
    } else {
      setCurrentIndex(i => Math.min(i + 1, fields.length - 1));
    }
  };

  const goBack = () => setCurrentIndex(i => Math.max(i - 1, 0));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl mx-4 h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reviewing field {currentIndex + 1} of {fields.length} • {selectedCount} selected to apply
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / fields.length) * 100}%` }}
          />
        </div>

        {/* Split Pane: Document | Field Review */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Document Preview */}
          <div className="md:w-1/2 h-52 md:h-full border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-0">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Source Document</span>
            </div>
            <div className="flex-1 min-h-0">
              <DocumentPreview fileUrl={fileUrl} />
            </div>
          </div>

          {/* Field Review */}
          <div className="md:w-1/2 flex-1 overflow-y-auto p-5">
            {currentKey && (
              <div className="flex flex-col h-full">
                {/* Field Name & Toggle */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                      Field {currentIndex + 1} of {fields.length}
                    </p>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">
                      {formatFieldName(currentKey)}
                    </h4>
                    {isLocked && linkedEntity && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        <LinkIcon className="w-3 h-3 mr-1" />
                        From linked {linkedEntity}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Switch
                        checked={isFieldSelected(currentKey)}
                        onCheckedChange={() => toggleField(currentKey)}
                        disabled={isLocked}
                      />
                      <span className={`text-sm font-medium whitespace-nowrap ${
                        isLocked
                          ? 'text-blue-600 dark:text-blue-400'
                          : isFieldSelected(currentKey)
                            ? 'text-purple-700 dark:text-purple-300'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {isLocked ? 'Locked' : isFieldSelected(currentKey) ? 'Will apply' : 'Skip'}
                      </span>
                    </label>
                    {!isLocked && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Click toggle to change</span>
                    )}
                  </div>
                </div>

                {/* AI Extracted Value */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Extracted
                  </p>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 break-words">
                      {formatValue(currentValue)}
                    </p>
                  </div>
                </div>

                {/* Source Snippet — where in the document this value came from */}
                {sourceSnippets[currentKey] ? (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Found in Document
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {renderHighlightedSnippet(sourceSnippets[currentKey], currentValue)}
                    </div>
                  </div>
                ) : isFetchingSnippets && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Searching document for source...
                    </p>
                  </div>
                )}

                {/* Existing Value Comparison */}
                {hasExisting && (
                  <div className="mb-4">
                    {valuesMatch ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          Values match — no change needed
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Current Value</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-through break-words">
                              {formatValue(existingValue)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        </div>
                        {!isLocked && isFieldSelected(currentKey) && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                            ⚠️ Will overwrite existing data
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!hasExisting && !isLocked && isFieldSelected(currentKey) && (
                  <div className="mb-4">
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
                      ✨ New data — will be added
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentIndex === 0}
            className="gap-1.5 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Field dots — quick navigation */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[40%]">
            {fields.map(([key], idx) => (
              <button
                key={key}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                  idx === currentIndex
                    ? 'bg-purple-600 w-4'
                    : isFieldSelected(key)
                      ? 'bg-purple-300 dark:bg-purple-700'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={formatFieldName(key)}
              />
            ))}
          </div>

          <Button
            onClick={goNext}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 flex-shrink-0"
          >
            {isLastField ? `Apply (${selectedCount})` : <span className="hidden sm:inline">Next</span>}
            {isLastField ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}