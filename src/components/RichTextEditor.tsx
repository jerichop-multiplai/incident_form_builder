'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useEffect, useCallback, useRef } from 'react';
import TurndownService from 'turndown';
import Showdown from 'showdown';

interface RichTextEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minHeight?: number;
  onAIEnhance?: (currentValue: string) => void;
  isEnhancing?: boolean;
  aiEnhanceDisabled?: boolean;
}

// Initialize converters
const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

const showdownConverter = new Showdown.Converter({
  simpleLineBreaks: true,
  strikethrough: true,
  tasklists: true,
});

// Convert markdown to HTML
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  return showdownConverter.makeHtml(markdown);
};

// Convert HTML to markdown
const htmlToMarkdown = (html: string): string => {
  if (!html || html === '<p></p>') return '';
  return turndownService.turndown(html);
};

// Toolbar Button Component
const ToolbarButton = ({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Toolbar Divider
const ToolbarDivider = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
);

// Toolbar Component
const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4h4m-2 0l-4 16m0 0h4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v7a5 5 0 0010 0V4M5 21h14" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.5 12h-15m4-4.5a4 4 0 116 6" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
          <text x="2" y="7" fontSize="6" fontWeight="bold" fill="currentColor">1</text>
          <text x="2" y="13" fontSize="6" fontWeight="bold" fill="currentColor">2</text>
          <text x="2" y="19" fontSize="6" fontWeight="bold" fill="currentColor">3</text>
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
        </svg>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
        </svg>
      </ToolbarButton>
    </div>
  );
};

export default function RichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder = 'Start typing...',
  required = false,
  minHeight = 150,
  onAIEnhance,
  isEnhancing = false,
  aiEnhanceDisabled = false,
}: RichTextEditorProps) {
  const isUpdatingFromProp = useRef(false);
  const lastExternalValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings for simpler document
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Underline,
    ],
    content: markdownToHtml(value),
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2 text-gray-900',
        style: `min-height: ${minHeight - 50}px`,
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingFromProp.current) return;
      
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      lastExternalValue.current = markdown;
      onChange(markdown);
    },
  });

  // Handle external value changes (e.g., from AI enhancement)
  useEffect(() => {
    if (editor && value !== lastExternalValue.current) {
      isUpdatingFromProp.current = true;
      lastExternalValue.current = value;
      
      const html = markdownToHtml(value);
      editor.commands.setContent(html, { emitUpdate: false });
      
      // Reset the flag after the update
      setTimeout(() => {
        isUpdatingFromProp.current = false;
      }, 0);
    }
  }, [value, editor]);

  const handleAIEnhance = useCallback(() => {
    if (onAIEnhance && value) {
      onAIEnhance(value);
    }
  }, [onAIEnhance, value]);

  return (
    <div className="rich-text-editor-wrapper">
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      <div className="border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} id={id} />
      </div>

      {/* AI Enhance Button */}
      {onAIEnhance && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleAIEnhance}
            disabled={isEnhancing || aiEnhanceDisabled}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isEnhancing
                ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                : !aiEnhanceDisabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isEnhancing ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                AI Enhance
              </>
            )}
          </button>
        </div>
      )}

      {/* Editor Styles */}
      <style jsx global>{`
        .rich-text-editor-wrapper .ProseMirror {
          outline: none;
        }
        .rich-text-editor-wrapper .ProseMirror p {
          margin: 0.5em 0;
        }
        .rich-text-editor-wrapper .ProseMirror p:first-child {
          margin-top: 0;
        }
        .rich-text-editor-wrapper .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .rich-text-editor-wrapper .ProseMirror ul,
        .rich-text-editor-wrapper .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5em 0;
        }
        .rich-text-editor-wrapper .ProseMirror li {
          margin: 0.25em 0;
        }
        .rich-text-editor-wrapper .ProseMirror li p {
          margin: 0;
        }
        .rich-text-editor-wrapper .ProseMirror blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 1rem;
          margin: 0.5em 0;
          color: #6b7280;
          font-style: italic;
        }
        .rich-text-editor-wrapper .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1em 0;
        }
        .rich-text-editor-wrapper .ProseMirror strong {
          font-weight: 700;
        }
        .rich-text-editor-wrapper .ProseMirror em {
          font-style: italic;
        }
        .rich-text-editor-wrapper .ProseMirror u {
          text-decoration: underline;
        }
        .rich-text-editor-wrapper .ProseMirror s {
          text-decoration: line-through;
        }
        .rich-text-editor-wrapper .ProseMirror.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}

