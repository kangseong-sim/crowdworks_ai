import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs, PageProps } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { PdfJsonViewerProps } from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// 페이지의 원본 크기를 저장하기 위한 타입
interface OriginalPageDimension {
  width: number;
  height: number;
}

export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const originalPageDimensions = useRef<(OriginalPageDimension | null)[]>([]);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // 페이지 수 설정 핸들러(성공시)
  function onDocumentLoadSuccess({
    numPages: nextNumPages,
  }: PDFDocumentProxy): void {
    setNumPages(nextNumPages);
    originalPageDimensions.current = Array(nextNumPages).fill(null);
  }

  // 원본 페이지 크기를 저장 핸들러(성공시)
  type PageLoadSuccess = Required<PageProps>["onLoadSuccess"];
  function onPageLoadSuccess(
    page: NonNullable<Parameters<PageLoadSuccess>[0]>,
    pageIndex: number
  ): void {
    if (originalPageDimensions.current[pageIndex]) {
      return;
    }
    originalPageDimensions.current[pageIndex] = {
      width: page.originalWidth,
      height: page.originalHeight,
    };
  }

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    resizeObserver.observe(container);
    setContainerWidth(container.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex w-full h-screen bg-gray-100">
      {/* 왼쪽 PDF 뷰 */}
      <div
        ref={pdfContainerRef}
        className="w-1/2 h-full overflow-auto border-r border-gray-300"
      >
        <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
          {Array.from({ length: numPages }, (_, index) => (
            <div
              key={`page_container_${index + 1}`}
              className="flex justify-center"
            >
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={containerWidth ? containerWidth : undefined}
                onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                renderTextLayer={false}
                className="mx-auto mb-4 shadow-lg"
              />
            </div>
          ))}
        </Document>
      </div>
      {/* 오른쪽 JSON 뷰 */}{" "}
      <div className="w-1/2 h-full p-6 overflow-auto bg-white">
        <h2 className="pb-2 mb-4 text-2xl font-bold border-b">Json Content</h2>
      </div>
    </div>
  );
}
