import React from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    ['link'],
    ['clean'],
  ],
};

const FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'align', 'link',
];

export default function RichTextEditor({ value, onChange, onEditorReady, placeholder, minHeight = 200 }) {
  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .ql-editor { min-height: ${minHeight}px; font-size: 13px; line-height: 1.5; }
        .rich-text-editor .ql-toolbar { border-top-left-radius: 6px; border-top-right-radius: 6px; }
        .rich-text-editor .ql-container { border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }
      `}</style>
      <ReactQuill
        theme="snow"
        modules={MODULES}
        formats={FORMATS}
        value={value || ''}
        onChange={(content, delta, source, editor) => {
          onChange(content);
          if (onEditorReady) onEditorReady(editor);
        }}
        placeholder={placeholder}
      />
    </div>
  );
}