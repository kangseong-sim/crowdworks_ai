import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PdfJsonViewerProps } from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);

  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
  }

  return (
    <div className="flex w-full h-screen bg-gray-100">
      {/* 왼쪽 PDF 뷰 */}
      <div className="w-1/2 h-full overflow-auto border-r border-gray-300">
        <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from({ length: numPages }, (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              renderTextLayer={false}
              className="mx-auto mb-4 shadow-lg"
            />
          ))}
        </Document>
      </div>
      {/* 오른쪽 JSON 뷰 */}
      <div className="w-1/2 h-full p-6 overflow-auto bg-white">
        <h2 className="pb-2 mb-4 text-2xl font-bold border-b">Json Content</h2>
      </div>
    </div>
  );
}
