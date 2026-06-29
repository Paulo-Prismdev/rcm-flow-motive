import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Sparkles, ArrowRight, ArrowLeft, Check, Link as LinkIcon, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import HighlightableDocumentViewer from './HighlightableDocumentViewer';

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
  const [showSummary, setShowSummary] = useState(false);

  // Use refs so the init effect only fires when the dialog actually opens,
  // not every time the parent passes new object references.
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
    setShowSummary(false);
  }, [isOpen]);

  // Fetch source snippets via AI when the dialog opens
  const [fetchedSnippets, setFetchedSnippets] = useState({});
  const [isFetchingSnippets, setIsFetchingSnippets] = useState(false);
  const snippetsFetchedForRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !fileUrl || !extractedData) return;
    if (extractedData._source_snippets) return;
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

  const selectField = (fieldName, useAI) => {
    if (lockedFields.has(fieldName)) return;
    setSelectedFields(prev => ({ ...prev, [fieldName]: useAI }));
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

  const changesToApply = fields.filter(([key]) => {
    if (!isFieldSelected(key)) return false;
    const { hasExisting, valuesMatch } = compareValues(key, extractedData[key]);
    return !hasExisting || !valuesMatch;
  });

  const goNext = () => {
    if (isLastField) {
      setShowSummary(true);
    } else {
      setCurrentIndex(i => Math.min(i + 1, fields.length - 1));
    }
  };

  const goBack = () => {
    if (showSummary) {
      setShowSummary(false);
    } else {
      setCurrentIndex(i => Math.max(i - 1, 0));
    }
  };

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
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{showSummary ? 'Review Changes' : title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {showSummary
                  ? `${changesToApply.length} field${changesToApply.length !== 1 ? 's' : ''} will be updated`
                  : `Reviewing field ${currentIndex + 1} of ${fields.length} • ${selectedCount} selected to apply`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar (hidden on summary) */}
        {!showSummary && (
          <div className="h-1 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / fields.length) * 100}%` }}
            />
          </div>
        )}

        {showSummary ? (
          /* ══ Summary Screen ══ */
          <div className="flex-1 overflow-y-auto p-5">
            {changesToApply.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Check className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">No changes to apply</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  All AI-extracted values match the existing data.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Please review all changes below before applying. This will overwrite existing data.
                  </p>
                </div>
                <div className="space-y-2">
                  {changesToApply.map(([key, value]) => {
                    const { hasExisting, existingValue } = compareValues(key, value);
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {formatFieldName(key)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {hasExisting ? (
                              <>
                                <span className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                  {formatValue(existingValue)}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300 break-words">
                                  {formatValue(value)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-green-700 dark:text-green-400 break-words">
                                ✨ {formatValue(value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ══ Split Pane: Document | Field Review ══ */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Document Preview with Highlighting */}
            <div className="md:w-1/2 h-52 md:h-full border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col min-h-0">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Source Document</span>
              </div>
              <div className="flex-1 min-h-0">
                <HighlightableDocumentViewer fileUrl={fileUrl} highlightText={formatValue(currentValue)} />
              </div>
            </div>

            {/* Field Review */}
            <div className="md:w-1/2 flex-1 overflow-y-auto p-5">
              {currentKey && (
                <div className="flex flex-col h-full">
                  {/* Field Name */}
                  <div className="mb-4">
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

                  {/* Source Snippet */}
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

                  {/* Locked field display */}
                  {isLocked ? (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3" /> From linked {linkedEntity}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">
                        {formatValue(currentValue)}
                      </p>
                    </div>
                  ) : valuesMatch ? (
                    /* Values match — no choice needed */
                    <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Values match — no change needed
                      </span>
                    </div>
                  ) : (
                    /* Choose what to save — two explicit cards */
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Choose what to save:</p>
                      <div className="space-y-2">
                        {/* Use AI value */}
                        <button
                          onClick={() => selectField(currentKey, true)}
                          className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                            isFieldSelected(currentKey)
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          } cursor-pointer`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                              isFieldSelected(currentKey)
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isFieldSelected(currentKey) && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Use AI value
                              </p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words mt-0.5">
                                {formatValue(currentValue)}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Keep existing or Skip */}
                        {hasExisting ? (
                          <button
                            onClick={() => selectField(currentKey, false)}
                            className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                              !isFieldSelected(currentKey)
                                ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } cursor-pointer`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                !isFieldSelected(currentKey)
                                  ? 'border-gray-500 bg-gray-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {!isFieldSelected(currentKey) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  Keep existing value
                                </p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words mt-0.5">
                                  {formatValue(existingValue)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => selectField(currentKey, false)}
                            className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                              !isFieldSelected(currentKey)
                                ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            } cursor-pointer`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                !isFieldSelected(currentKey)
                                  ? 'border-gray-500 bg-gray-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {!isFieldSelected(currentKey) && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Skip this field</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Don't save anything</p>
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warning */}
                  {!isLocked && isFieldSelected(currentKey) && hasExisting && !valuesMatch && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Will overwrite existing data
                    </p>
                  )}
                  {!isLocked && isFieldSelected(currentKey) && !hasExisting && (
                    <p className="text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
                      ✨ New data — will be added
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={!showSummary && currentIndex === 0}
            className="gap-1.5 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {!showSummary && (
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
          )}

          {showSummary ? (
            <Button
              onClick={handleConfirm}
              disabled={changesToApply.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 flex-shrink-0"
            >
              <span className="hidden sm:inline">Confirm & Apply</span>
              {changesToApply.length > 0 && ` (${changesToApply.length})`}
              <Check className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 flex-shrink-0"
            >
              {isLastField ? <span className="hidden sm:inline">Review Changes</span> : <span className="hidden sm:inline">Next</span>}
              {isLastField ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}