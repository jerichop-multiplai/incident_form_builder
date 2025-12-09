import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
  ShadingType,
  ITableCellOptions,
  ImageRun,
} from 'docx';

// GoTeam Logo URL
const GOTEAM_LOGO_URL = 'https://dothis.to/goteam/files/16fd994f-dce3-11ec-ae5c-060273b163f6';

// Fetch image as buffer for DOCX
const fetchImageAsBuffer = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
};

interface EmployeeDetails {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  position: string;
  company: string;
  created_at?: string;
}

interface UserDetails {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_email: string;
  position: string;
  company: string;
  created_at?: string;
}

interface Attachment {
  id: string;
  nameOrLink: string;
  description: string;
}

interface ReportData {
  datePrepared: string;
  employeeDetails: EmployeeDetails | null;
  incidentWhat: string;
  incidentLocation: string;
  incidentDateTime: string;
  incidentDetails: string;
  findings: string;
  policyViolation: string;
  attachments: Attachment[];
  impactCategories: string[];
  impactOthersSpecify: string;
  impactDescription: string;
  reportedBy: UserDetails;
  attestedBy: EmployeeDetails | null;
}

// Helper functions
const formatFullName = (details: { employee_name: string }) => {
  return details.employee_name || 'N/A';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'Not specified';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return 'Not specified';
  return new Date(dateTimeStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Enhanced markdown parser - converts markdown text to Paragraph array
const parseMarkdownToParagraphs = (text: string): Paragraph[] => {
  if (!text || !text.trim()) {
    return [new Paragraph({
      children: [new TextRun({ text: 'No content provided', italics: true, color: '9ca3af', size: 20 })],
    })];
  }

  const paragraphs: Paragraph[] = [];
  const lines = text.split('\n');
  let currentListNumber = 0;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      // Empty line - add spacing
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      return;
    }

    // Check for headers
    if (trimmedLine.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ 
          text: trimmedLine.substring(4), 
          bold: true, 
          size: 22,
          color: '000000',
        })],
        spacing: { before: 150, after: 80 },
      }));
      return;
    }
    
    if (trimmedLine.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ 
          text: trimmedLine.substring(3), 
          bold: true, 
          size: 24,
          color: '000000',
        })],
        spacing: { before: 200, after: 100 },
      }));
      return;
    }
    
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ 
          text: trimmedLine.substring(2), 
          bold: true, 
          size: 28,
          color: '000000',
        })],
        spacing: { before: 250, after: 120 },
      }));
      return;
    }

    // Check for bullet points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      currentListNumber = 0;
      const content = trimmedLine.substring(2);
      paragraphs.push(new Paragraph({
        children: parseInlineMarkdown(content),
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
      return;
    }

    // Check for numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      currentListNumber++;
      const content = numberedMatch[2];
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: `${currentListNumber}. `, bold: true, color: '000000' }),
          ...parseInlineMarkdown(content),
        ],
        indent: { left: convertInchesToTwip(0.25) },
        spacing: { after: 60 },
      }));
      return;
    }

    // Check for sub-items (a. b. c. or letters with parentheses)
    const subItemMatch = trimmedLine.match(/^([a-z])[.)]\s+(.*)$/i);
    if (subItemMatch) {
      const letter = subItemMatch[1].toLowerCase();
      const content = subItemMatch[2];
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({ text: `${letter}. `, color: '000000' }),
          ...parseInlineMarkdown(content),
        ],
        indent: { left: convertInchesToTwip(0.5) },
        spacing: { after: 60 },
      }));
      return;
    }

    // Regular paragraph with inline formatting
    currentListNumber = 0;
    paragraphs.push(new Paragraph({
      children: parseInlineMarkdown(trimmedLine),
      spacing: { after: 80 },
    }));
  });

  return paragraphs;
};

// Parse inline markdown (bold, italic) within a line
const parseInlineMarkdown = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    const boldMatch2 = remaining.match(/^(.*?)__(.+?)__/);
    
    // Italic: *text* or _text_ (not preceded/followed by *)
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*([^*]+)\*(?!\*)/);
    const italicMatch2 = remaining.match(/^(.*?)(?<!_)_([^_]+)_(?!_)/);

    // Find the first match
    let firstMatch: { type: 'bold' | 'italic'; match: RegExpMatchArray } | null = null;
    
    const candidates = [
      boldMatch ? { type: 'bold' as const, match: boldMatch, index: boldMatch[1].length } : null,
      boldMatch2 ? { type: 'bold' as const, match: boldMatch2, index: boldMatch2[1].length } : null,
      italicMatch ? { type: 'italic' as const, match: italicMatch, index: italicMatch[1].length } : null,
      italicMatch2 ? { type: 'italic' as const, match: italicMatch2, index: italicMatch2[1].length } : null,
    ].filter(Boolean) as { type: 'bold' | 'italic'; match: RegExpMatchArray; index: number }[];

    if (candidates.length > 0) {
      // Sort by index to get the first one
      candidates.sort((a, b) => a.index - b.index);
      firstMatch = candidates[0];
    }

    if (firstMatch) {
      const match = firstMatch.match;
      const beforeText = match[1];
      const formattedText = match[2];

      // Add text before the formatted part
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText, size: 20, color: '000000' }));
      }

      // Add the formatted text
      if (firstMatch.type === 'bold') {
        runs.push(new TextRun({ text: formattedText, bold: true, size: 20, color: '000000' }));
      } else {
        runs.push(new TextRun({ text: formattedText, italics: true, size: 20, color: '000000' }));
      }

      // Calculate how much to remove
      remaining = remaining.substring(match[0].length);
    } else {
      // No more formatting, add the rest as plain text
      runs.push(new TextRun({ text: remaining, size: 20, color: '000000' }));
      break;
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text, size: 20, color: '000000' })];
};

// Create a styled content box (table with single cell for narrative content)
const createContentBox = (title: string, content: string, titleColor: string = '1d4ed8'): Table => {
  const contentParagraphs = parseMarkdownToParagraphs(content);
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
      left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
      right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
    },
    rows: [
      // Header row
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 22,
                    color: titleColor,
                  }),
                ],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: 'f3f4f6' },
            margins: {
              top: convertInchesToTwip(0.08),
              bottom: convertInchesToTwip(0.08),
              left: convertInchesToTwip(0.15),
              right: convertInchesToTwip(0.15),
            },
          }),
        ],
      }),
      // Content row
      new TableRow({
        children: [
          new TableCell({
            children: contentParagraphs,
            margins: {
              top: convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left: convertInchesToTwip(0.15),
              right: convertInchesToTwip(0.15),
            },
          }),
        ],
      }),
    ],
  });
};

// Create cell with styling
const createCell = (content: string, options: {
  bold?: boolean;
  isHeader?: boolean;
  width?: number;
  shading?: string;
  verticalAlign?: 'top' | 'center' | 'bottom';
} = {}): TableCell => {
  const cellOptions: ITableCellOptions = {
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: content,
            bold: options.bold || options.isHeader,
            size: 20,
            color: options.isHeader ? '1e3a8a' : '000000', // Dark blue for headers, black for content
          }),
        ],
      }),
    ],
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.shading ? {
      type: ShadingType.SOLID,
      color: options.shading,
    } : undefined,
    margins: {
      top: convertInchesToTwip(0.05),
      bottom: convertInchesToTwip(0.05),
      left: convertInchesToTwip(0.1),
      right: convertInchesToTwip(0.1),
    },
  };
  
  return new TableCell(cellOptions);
};

export const generateIncidentReportDocx = async (data: ReportData): Promise<Document> => {
  // Fetch the GoTeam logo
  const logoBuffer = await fetchImageAsBuffer(GOTEAM_LOGO_URL);
  const impactList = data.impactCategories.map(cat => 
    cat === 'Others' && data.impactOthersSpecify ? `Others (${data.impactOthersSpecify})` : cat
  ).join(', ');

  // Build attachment paragraphs
  const attachmentParagraphs: Paragraph[] = data.attachments.length > 0 
    ? data.attachments.map((att, idx) => 
        new Paragraph({
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true, size: 20, color: '000000' }),
            new TextRun({ text: att.nameOrLink || `Attachment ${idx + 1}`, bold: true, size: 20, color: '000000' }),
            ...(att.description ? [new TextRun({ text: ` — ${att.description}`, size: 20, color: '000000' })] : []),
          ],
          spacing: { after: 60 },
          indent: { left: convertInchesToTwip(0.15) },
        })
      )
    : [new Paragraph({
        children: [new TextRun({ text: 'No attachments', italics: true, color: '9ca3af', size: 20 })],
      })];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.85),
              right: convertInchesToTwip(0.85),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'People and Culture Department',
                    color: '2563eb',
                    size: 20,
                    bold: true,
                  }),
                ],
                spacing: { after: 100 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 18,
                    color: '666666',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '666666',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                    color: '666666',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title with logo area
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '2563eb' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Incident Report',
                            bold: true,
                            size: 52,
                            color: '000000',
                          }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Date Prepared: ',
                            bold: true,
                            size: 22,
                            color: '000000',
                          }),
                          new TextRun({
                            text: formatDate(data.datePrepared),
                            size: 22,
                            color: '000000',
                          }),
                        ],
                        spacing: { before: 50 },
                      }),
                    ],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                  }),
                  new TableCell({
                    children: [
                      // Logo image or fallback text
                      logoBuffer ? new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new ImageRun({
                            data: logoBuffer,
                            transformation: {
                              width: 120,
                              height: 40,
                            },
                            type: 'png',
                          }),
                        ],
                      }) : new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: 'Go',
                            bold: true,
                            size: 40,
                            color: '2563eb',
                          }),
                          new TextRun({
                            text: 'Team',
                            bold: true,
                            size: 40,
                            color: '1e40af',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: "It's better together!",
                            italics: true,
                            size: 18,
                            color: '6b7280',
                          }),
                        ],
                      }),
                    ],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                    },
                  }),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ spacing: { after: 300 } }),

          // Employee Details Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'EMPLOYEE DETAILS',
                bold: true,
                size: 24,
                color: '1d4ed8',
              }),
            ],
            spacing: { after: 100 },
          }),

          // Employee Details Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            },
            rows: [
              new TableRow({
                children: [
                  createCell('EMPLOYEE REPORTED', { isHeader: true, width: 22, shading: 'dbeafe' }),
                  createCell(data.employeeDetails ? formatFullName(data.employeeDetails) : 'Not selected', { width: 28 }),
                  createCell('EMP ID', { isHeader: true, width: 15, shading: 'dbeafe' }),
                  createCell(data.employeeDetails?.employee_id?.toString() || '—', { width: 35 }),
                ],
              }),
              new TableRow({
                children: [
                  createCell('POSITION', { isHeader: true, shading: 'dbeafe' }),
                  createCell(data.employeeDetails?.position || '—'),
                  createCell('CLIENT', { isHeader: true, shading: 'dbeafe' }),
                  createCell(data.employeeDetails?.company || '—'),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ spacing: { after: 300 } }),

          // Description of Incident Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'DESCRIPTION OF INCIDENT',
                bold: true,
                size: 24,
                color: '1d4ed8',
              }),
            ],
            spacing: { after: 100 },
          }),

          // What/Where/When Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            },
            rows: [
              new TableRow({
                children: [
                  createCell('What:', { isHeader: true, width: 12, shading: 'dbeafe' }),
                  createCell(data.incidentWhat || 'Not specified', { width: 88 }),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Location:', { isHeader: true, shading: 'dbeafe' }),
                  createCell(data.incidentLocation || 'Not specified'),
                ],
              }),
              new TableRow({
                children: [
                  createCell('Time:', { isHeader: true, shading: 'dbeafe' }),
                  createCell(formatDateTime(data.incidentDateTime)),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ spacing: { after: 200 } }),

          // Incident Details Box
          createContentBox('Incident Details:', data.incidentDetails),

          // Spacing
          new Paragraph({ spacing: { after: 200 } }),

          // Findings Box (if provided)
          ...(data.findings ? [
            createContentBox('Findings:', data.findings),
            new Paragraph({ spacing: { after: 200 } }),
          ] : []),

          // Policy Violation Box (if provided)
          ...(data.policyViolation ? [
            createContentBox('Policy/Code of Conduct Concerns:', data.policyViolation),
            new Paragraph({ spacing: { after: 200 } }),
          ] : []),

          // Attachments Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Attachments:',
                            bold: true,
                            size: 22,
                            color: '1d4ed8',
                          }),
                        ],
                      }),
                    ],
                    shading: { type: ShadingType.SOLID, color: 'f3f4f6' },
                    margins: {
                      top: convertInchesToTwip(0.08),
                      bottom: convertInchesToTwip(0.08),
                      left: convertInchesToTwip(0.15),
                      right: convertInchesToTwip(0.15),
                    },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: attachmentParagraphs,
                    margins: {
                      top: convertInchesToTwip(0.1),
                      bottom: convertInchesToTwip(0.1),
                      left: convertInchesToTwip(0.15),
                      right: convertInchesToTwip(0.15),
                    },
                  }),
                ],
              }),
            ],
          }),

          // Spacing
          new Paragraph({ spacing: { after: 200 } }),

          // Impact Section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Impact:',
                            bold: true,
                            size: 22,
                            color: '1d4ed8',
                          }),
                        ],
                      }),
                    ],
                    shading: { type: ShadingType.SOLID, color: 'f3f4f6' },
                    margins: {
                      top: convertInchesToTwip(0.08),
                      bottom: convertInchesToTwip(0.08),
                      left: convertInchesToTwip(0.15),
                      right: convertInchesToTwip(0.15),
                    },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Impacted Parties: ', bold: true, size: 20, color: '000000' }),
                          new TextRun({ text: impactList || 'None selected', size: 20, italics: !impactList, color: impactList ? '000000' : '9ca3af' }),
                        ],
                        spacing: { after: 120 },
                      }),
                      ...parseMarkdownToParagraphs(data.impactDescription),
                    ],
                    margins: {
                      top: convertInchesToTwip(0.1),
                      bottom: convertInchesToTwip(0.1),
                      left: convertInchesToTwip(0.15),
                      right: convertInchesToTwip(0.15),
                    },
                  }),
                ],
              }),
            ],
          }),

          // Spacing before signatories
          new Paragraph({ spacing: { after: 400 } }),

          // Signatories Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'SIGNATORIES',
                bold: true,
                size: 24,
                color: '1d4ed8',
              }),
            ],
            spacing: { after: 150 },
          }),

          // Signatories Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              left: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'd1d5db' },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'REPORTED BY', bold: true, size: 18, color: '6b7280' })],
                        spacing: { after: 120 },
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: formatFullName(data.reportedBy), bold: true, size: 24, color: '000000' })],
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: data.reportedBy.position || 'N/A', size: 20, color: '000000' })],
                        spacing: { after: 250 },
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Signature: _______________________________', size: 20, color: '6b7280' })],
                        spacing: { after: 80 },
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: `Date: ${formatDate(data.datePrepared)}`, size: 20, color: '000000' })],
                      }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: {
                      top: convertInchesToTwip(0.15),
                      bottom: convertInchesToTwip(0.15),
                      left: convertInchesToTwip(0.2),
                      right: convertInchesToTwip(0.2),
                    },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'ATTESTED BY', bold: true, size: 18, color: '6b7280' })],
                        spacing: { after: 120 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ 
                            text: data.attestedBy ? formatFullName(data.attestedBy) : 'Not selected', 
                            bold: !!data.attestedBy, 
                            size: 24,
                            italics: !data.attestedBy,
                            color: data.attestedBy ? '000000' : '9ca3af',
                          })
                        ],
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: data.attestedBy?.position || '', size: 20, color: '000000' })],
                        spacing: { after: 250 },
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Signature: _______________________________', size: 20, color: '6b7280' })],
                        spacing: { after: 80 },
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: 'Date: _______________________________', size: 20, color: '000000' })],
                      }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    margins: {
                      top: convertInchesToTwip(0.15),
                      bottom: convertInchesToTwip(0.15),
                      left: convertInchesToTwip(0.2),
                      right: convertInchesToTwip(0.2),
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
};
