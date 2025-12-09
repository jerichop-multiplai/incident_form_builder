'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useRef } from 'react';
import TurndownService from 'turndown';
import Showdown from 'showdown';

interface RichTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
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

// Compact Toolbar Button
const ToolbarButton = ({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1 rounded transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-700'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

// Compact Toolbar
const CompactToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-gray-200 bg-gray-50">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 4h4m-2 0l-4 16m0 0h4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
        </svg>
      </ToolbarButton>
    </div>
  );
};

export default function RichTextArea({
  id,
  value,
  onChange,
  placeholder = 'Start typing...',
  rows = 3,
  onAIEnhance,
  isEnhancing = false,
  aiEnhanceDisabled = false,
}: RichTextAreaProps) {
  const isUpdatingFromProp = useRef(false);
  const lastExternalValue = useRef(value);
  const minHeight = rows * 24;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: markdownToHtml(value),
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-2 py-1.5 text-gray-900 text-sm',
        style: `min-height: ${minHeight}px`,
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
    <div className="rich-textarea-wrapper">
      <div className="border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm">
        <CompactToolbar editor={editor} />
        <EditorContent editor={editor} id={id} />
      </div>

      {onAIEnhance && (
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={handleAIEnhance}
            disabled={isEnhancing || aiEnhanceDisabled}
            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
              isEnhancing
                ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                : !aiEnhanceDisabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isEnhancing ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                AI Enhance
              </>
            )}
          </button>
        </div>
      )}

      <style jsx global>{`
        .rich-textarea-wrapper .ProseMirror {
          outline: none;
        }
        .rich-textarea-wrapper .ProseMirror p {
          margin: 0.25em 0;
        }
        .rich-textarea-wrapper .ProseMirror p:first-child {
          margin-top: 0;
        }
        .rich-textarea-wrapper .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .rich-textarea-wrapper .ProseMirror ul,
        .rich-textarea-wrapper .ProseMirror ol {
          padding-left: 1.25rem;
          margin: 0.25em 0;
        }
        .rich-textarea-wrapper .ProseMirror li {
          margin: 0.125em 0;
        }
        .rich-textarea-wrapper .ProseMirror li p {
          margin: 0;
        }
        .rich-textarea-wrapper .ProseMirror.is-editor-empty:first-child::before,
        .rich-textarea-wrapper .ProseMirror p.is-editor-empty:first-child::before {
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

