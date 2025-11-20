import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Tag, 
  History,
  FileSignature,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import SignatureModal from './SignatureModal';

const CATEGORIES = [
  'Insurance Document',
  'Vehicle Photo',
  'Damage Photo',
  'Estimate',
  'Invoice',
  'Authority',
  'Identity Document',
  'Correspondence',
  'Report',
  'Other'
];

const COMMON_TAGS = [
  'Pre-repair',
  'Post-repair',
  'Driver Side',
  'Passenger Side',
  'Front',
  'Rear',
  'Interior',
  'Urgent',
  'Final',
  'Draft'
];

export default function DocumentManagementModal({ parentId, parentType, isOpen, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', parentId, parentType],
    queryFn: () => base44.entities.Document.filter({ 
      parent_id: parentId, 
      parent_type: parentType,
      is_latest_version: true 
    }),
    enabled: isOpen && !!parentId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, tags }) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      // Auto-detect content using AI
      let autoDetected = '';
      let suggestedCategory = category;
      let suggestedTags = tags;

      try {
        const aiAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this filename and suggest: 1) What type of document this is, 2) Relevant tags. Filename: ${file.name}`,
          response_json_schema: {
            type: 'object',
            properties: {
              document_type: { type: 'string' },
              suggested_tags: { type: 'array', items: { type: 'string' } }
            }
          }
        });
        
        autoDetected = aiAnalysis.document_type;
        if (!tags.length) {
          suggestedTags = aiAnalysis.suggested_tags || [];
        }
      } catch (error) {
        console.log('AI analysis failed, continuing without it');
      }

      return base44.entities.Document.create({
        parent_id: parentId,
        parent_type: parentType,
        file_url: uploadResult.file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category: suggestedCategory,
        tags: suggestedTags,
        auto_detected_content: autoDetected,
        version: 1,
        is_latest_version: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', parentId, parentType] });
      fileInputRef.current.value = '';
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', parentId, parentType] });
      setEditingDoc(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', parentId, parentType] });
    }
  });

  const newVersionMutation = useMutation({
    mutationFn: async ({ file, originalDocId, versionNotes }) => {
      const originalDoc = documents.find(d => d.id === originalDocId);
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      // Mark old version as not latest
      await base44.entities.Document.update(originalDocId, { is_latest_version: false });

      // Create new version
      return base44.entities.Document.create({
        parent_id: parentId,
        parent_type: parentType,
        file_url: uploadResult.file_url,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        category: originalDoc.category,
        tags: originalDoc.tags,
        version: (originalDoc.version || 1) + 1,
        parent_document_id: originalDoc.parent_document_id || originalDocId,
        is_latest_version: true,
        version_notes: versionNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', parentId, parentType] });
      setSelectedDoc(null);
    }
  });

  const signatureMutation = useMutation({
    mutationFn: ({ docId, signatureData, signatureName }) => 
      base44.entities.Document.update(docId, {
        signature_data: signatureData,
        signed_by: signatureName,
        signed_at: new Date().toISOString(),
        signature_name: signatureName
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', parentId, parentType] });
      setShowSignatureModal(null);
    }
  });

  const handleFileUpload = async (e, category = 'Other', tags = []) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file, category, tags });
    } finally {
      setUploading(false);
    }
  };

  const handleNewVersion = async (docId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const notes = prompt('Version notes (optional):');
      setUploading(true);
      try {
        await newVersionMutation.mutateAsync({ 
          file, 
          originalDocId: docId,
          versionNotes: notes || ''
        });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Insurance Document': 'bg-blue-100 text-blue-800',
      'Vehicle Photo': 'bg-green-100 text-green-800',
      'Damage Photo': 'bg-red-100 text-red-800',
      'Estimate': 'bg-purple-100 text-purple-800',
      'Invoice': 'bg-yellow-100 text-yellow-800',
      'Authority': 'bg-indigo-100 text-indigo-800',
      'Identity Document': 'bg-orange-100 text-orange-800',
      'Correspondence': 'bg-pink-100 text-pink-800',
      'Report': 'bg-teal-100 text-teal-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Management</DialogTitle>
          </DialogHeader>

          {/* Upload Section */}
          <div className="glass-flat p-4 rounded-xl mb-4">
            <h3 className="font-semibold mb-3">Upload New Document</h3>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="glass-button flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Choose File'}
              </Button>
              <span className="text-xs text-foreground-muted">
                Files will be automatically categorized using AI
              </span>
            </div>
          </div>

          {/* Documents List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-foreground-muted">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-foreground-muted">No documents uploaded yet</div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="glass-flat p-4 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <h4 className="font-semibold">{doc.file_name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                        {doc.version > 1 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                            v{doc.version}
                          </span>
                        )}
                        {doc.signature_data && (
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 flex items-center gap-1">
                            <FileSignature className="w-3 h-3" />
                            Signed
                          </span>
                        )}
                      </div>

                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Tag className="w-3 h-3 text-foreground-muted" />
                          {doc.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-xs glass-inset">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {doc.auto_detected_content && (
                        <p className="text-xs text-foreground-muted mb-2">
                          AI detected: {doc.auto_detected_content}
                        </p>
                      )}

                      <div className="text-xs text-foreground-muted">
                        Uploaded {format(new Date(doc.created_date), 'dd/MM/yyyy HH:mm')} by {doc.created_by}
                        {doc.signature_data && (
                          <span> • Signed by {doc.signature_name} on {format(new Date(doc.signed_at), 'dd/MM/yyyy HH:mm')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingDoc(doc)}
                        title="Edit metadata"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleNewVersion(doc.id)}
                        title="Upload new version"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      {!doc.signature_data && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSignatureModal(doc)}
                          title="Sign document"
                        >
                          <FileSignature className="w-4 h-4" />
                        </Button>
                      )}
                      <a href={doc.file_url} download>
                        <Button variant="ghost" size="icon" title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this document?')) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Document Metadata</DialogTitle>
            </DialogHeader>
            <EditDocumentForm
              document={editingDoc}
              onSave={(data) => updateMutation.mutate({ id: editingDoc.id, data })}
              onCancel={() => setEditingDoc(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          isOpen={!!showSignatureModal}
          onClose={() => setShowSignatureModal(null)}
          onSave={(signatureData, signatureName) => {
            signatureMutation.mutate({
              docId: showSignatureModal.id,
              signatureData,
              signatureName
            });
          }}
          documentName={showSignatureModal.file_name}
        />
      )}
    </>
  );
}

function EditDocumentForm({ document, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    category: document.category || 'Other',
    tags: document.tags || []
  });
  const [newTag, setNewTag] = useState('');

  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="glass-inset w-full px-3 py-2 rounded-xl border-0"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag, idx) => (
            <span key={idx} className="glass-flat px-3 py-1 rounded-full text-sm flex items-center gap-2">
              {tag}
              <button type="button" onClick={() => removeTag(tag)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mb-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTag))}
            placeholder="Add custom tag..."
            className="glass-inset"
          />
          <Button type="button" onClick={() => addTag(newTag)} className="glass-button">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="text-xs glass-button px-2 py-1 rounded"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={onCancel} className="glass-button">
          Cancel
        </Button>
        <Button type="submit" className="glass-button text-accent">
          Save
        </Button>
      </div>
    </form>
  );
}