"use client";

import { marked } from "marked";

interface Props {
  reportId: string;
  markdownContent?: string;
  detailedPlaybook?: string;
}

export default function ReportDownloadButtons({ reportId, markdownContent, detailedPlaybook }: Props) {
  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderFormalHtml(content: string, title: string): string {
    const htmlContent = marked.parse(content);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 1in;
    }
    @media print {
      body { margin: 0; padding: 0; }
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      line-height: 1.8;
      color: #000000;
      font-size: 12pt;
      background: #ffffff;
      margin: 0;
      padding: 24px;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      border-bottom: 2px solid #000000;
      padding-bottom: 4px;
      margin-top: 16px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      border-bottom: 1px solid #333333;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 18px;
      margin-bottom: 8px;
      text-decoration: underline;
    }
    p {
      margin-bottom: 12pt;
      text-align: justify;
    }
    ul, ol {
      margin-left: 24pt;
      margin-bottom: 12pt;
    }
    li {
      margin-bottom: 6pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12pt;
      margin-bottom: 16pt;
    }
    th, td {
      border: 1px solid #000000;
      padding: 6pt 8pt;
      text-align: left;
      font-size: 11pt;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
    blockquote {
      border-left: 3px solid #000000;
      padding-left: 12pt;
      margin-left: 0;
      margin-right: 0;
      font-style: italic;
      background: #fcfcfc;
      padding-top: 6pt;
      padding-bottom: 6pt;
    }
    code {
      font-family: "Courier New", Courier, monospace;
      background: #f4f4f4;
      padding: 2px 4px;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  }

  function handleDownloadPDF(content: string, title: string) {
    const fullHtml = renderFormalHtml(content, title);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 300);
    }
  }

  function handleDownloadWord(content: string, title: string, filename: string) {
    const html = renderFormalHtml(content, title);
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      ${html}
      </html>
    `;
    downloadBlob(wordHtml, filename, "application/msword;charset=utf-8");
  }

  function handleDownloadMarkdown(content: string, filename: string) {
    downloadBlob(content, filename, "text/markdown;charset=utf-8");
  }

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
      {/* Format 1: Audit Report Downloads */}
      {markdownContent && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={() => handleDownloadPDF(markdownContent, "GEO Diagnostic Audit Report")}
            className="btn btn--ghost"
            style={{ fontSize: "0.8rem", padding: "8px 12px" }}
            title="Download Audit Report as Formal PDF"
          >
            📄 Audit Report (.PDF)
          </button>
          <button
            onClick={() => handleDownloadWord(markdownContent, "GEO Diagnostic Audit Report", `GEO_Audit_Report_${reportId}.doc`)}
            className="btn btn--ghost"
            style={{ fontSize: "0.8rem", padding: "8px 12px" }}
            title="Download Audit Report as Official Word Doc"
          >
            📄 Audit Report (.DOC)
          </button>
          <button
            onClick={() => handleDownloadMarkdown(markdownContent, `GEO_Audit_Report_${reportId}.md`)}
            className="btn btn--ghost"
            style={{ fontSize: "0.8rem", padding: "8px 12px" }}
            title="Download Audit Report as Markdown"
          >
            📄 Audit Report (.MD)
          </button>
        </div>
      )}

      {/* Format 2: Action Plan / Playbook Downloads */}
      {detailedPlaybook && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={() => handleDownloadPDF(detailedPlaybook, "GEO Strategic Action Plan")}
            className="btn btn--primary"
            style={{ fontSize: "0.8rem", padding: "8px 12px", background: "var(--indigo)" }}
            title="Download Action Plan as Formal PDF"
          >
            🚀 Action Plan (.PDF)
          </button>
          <button
            onClick={() => handleDownloadWord(detailedPlaybook, "GEO Strategic Action Plan", `GEO_Action_Plan_${reportId}.doc`)}
            className="btn btn--primary"
            style={{ fontSize: "0.8rem", padding: "8px 12px", background: "var(--indigo)" }}
            title="Download Action Plan as Official Word Doc"
          >
            🚀 Action Plan (.DOC)
          </button>
          <button
            onClick={() => handleDownloadMarkdown(detailedPlaybook, `GEO_Action_Plan_${reportId}.md`)}
            className="btn btn--primary"
            style={{ fontSize: "0.8rem", padding: "8px 12px", background: "var(--indigo)" }}
            title="Download Action Plan as Markdown"
          >
            🚀 Action Plan (.MD)
          </button>
        </div>
      )}
    </div>
  );
}

