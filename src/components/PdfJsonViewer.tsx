import React, { useState, useEffect, useRef } from "react";
import { pdfjs, PageProps } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type {
  PdfJsonViewerProps,
  JsonDataItem,
  OriginalPageDimension,
  Highlight,
} from "../types";
import { PdfView } from "./PdfView";
import { ContentView } from "./ContentView";
import { useProcessedPdfData } from "../hooks/useProcessedPdfData";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const originalPageDimensions = useRef<(OriginalPageDimension | null)[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tempSelection, setTempSelection] = useState<Highlight | null>(null);
  const [, forceUpdate] = useState(0);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<
    Record<string, { pdf: HTMLDivElement | null; json: HTMLDivElement | null }>
  >({});

  const { allItemsWithBbox, documentBlocks, sourceIdToBlockIdMap } =
    useProcessedPdfData(jsonData);

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

    forceUpdate((c) => c + 1);
  }

  const handleItemClick = (id: string): void => {
    const blockId = sourceIdToBlockIdMap.get(id) || id;
    setActiveId(blockId);

    const firstSourceId =
      documentBlocks.find((b) => b.id === blockId)?.sourceIds[0] || blockId;
    const pdfElement = itemRefs.current[firstSourceId]?.pdf;

    if (pdfElement) {
      pdfElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const jsonEl = itemRefs.current[blockId]?.json;
    if (jsonEl) {
      jsonEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleMouseEnterForHighlight = (item: JsonDataItem) => {
    const originalDim = originalPageDimensions.current[item.pageNumber - 1];
    if (!originalDim) return;

    const [left, top, right, bottom] = item.bbox;
    const rect = {
      left,
      top: originalDim.height - top,
      width: right - left,
      height: top - bottom,
    };

    setTempSelection({
      id: `hover-${item.id}`,
      content: item.text || "",
      position: { pageNumber: item.pageNumber, rects: [rect] },
    });

    const blockId = sourceIdToBlockIdMap.get(item.id) || item.id;
    setActiveId(blockId);

    const jsonEl = itemRefs.current[blockId]?.json;
    if (jsonEl) {
      jsonEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleItemLeaveForHighlight = () => {
    setActiveId(null);
  };

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
      <PdfView
        pdfUrl={pdfUrl}
        numPages={numPages}
        onDocumentLoadSuccess={onDocumentLoadSuccess}
        pdfContainerRef={pdfContainerRef}
        containerWidth={containerWidth}
        originalPageDimensions={originalPageDimensions}
        onPageLoadSuccess={onPageLoadSuccess}
        allItemsWithBbox={allItemsWithBbox}
        activeId={activeId}
        sourceIdToBlockIdMap={sourceIdToBlockIdMap}
        itemRefs={itemRefs}
        tempSelection={tempSelection}
        onItemHover={handleMouseEnterForHighlight}
        onItemLeave={handleItemLeaveForHighlight}
      />
      {/* 오른쪽 JSON 뷰 */}
      <ContentView
        documentBlocks={documentBlocks}
        activeId={activeId}
        itemRefs={itemRefs}
        onItemClick={handleItemClick}
      />
    </div>
  );
}
