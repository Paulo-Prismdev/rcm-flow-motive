import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && onEditorReady) {
      const editor = typeof ref.current.getEditor === 'function'
        ? ref.current.getEditor()
        : ref.current;
      if (editor) onEditorReady(editor);
    }
  });

  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .ql-editor { min-height: ${minHeight}px; font-size: 13px; line-height: 1.5; }
        .rich-text-editor .ql-toolbar { border-top-left-radius: 6px; border-top-right-radius: 6px; }
        .rich-text-editor .ql-container { border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }
      `}</style>
      <ReactQuill
        ref={ref}
        theme="snow"
        modules={MODULES}
        formats={FORMATS}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}