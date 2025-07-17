import React from "react";
import { Document, Page, PageProps } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { JsonDataItem, Highlight, OriginalPageDimension } from "../types";

interface PdfViewProps {
  pdfUrl: string;
  numPages: number;
  onDocumentLoadSuccess: (proxy: PDFDocumentProxy) => void;
  pdfContainerRef: React.Ref<HTMLDivElement>;
  containerWidth: number;
  originalPageDimensions: React.MutableRefObject<
    (OriginalPageDimension | null)[]
  >;
  onPageLoadSuccess: (
    page: NonNullable<Parameters<Required<PageProps>["onLoadSuccess"]>[0]>,
    pageIndex: number
  ) => void;
  allItemsWithBbox: JsonDataItem[];
  activeId: string | null;
  sourceIdToBlockIdMap: Map<string, string>;
  itemRefs: React.MutableRefObject<
    Record<string, { pdf: HTMLDivElement | null; json: HTMLDivElement | null }>
  >;
  tempSelection: Highlight | null;
  onItemHover: (item: JsonDataItem) => void;
  onItemLeave: () => void;
}

export const PdfView: React.FC<PdfViewProps> = ({
  pdfUrl,
  numPages,
  onDocumentLoadSuccess,
  pdfContainerRef,
  containerWidth,
  originalPageDimensions,
  onPageLoadSuccess,
  allItemsWithBbox,
  activeId,
  sourceIdToBlockIdMap,
  itemRefs,
  tempSelection,
  onItemHover,
  onItemLeave,
}) => {
  return (
    <div
      ref={pdfContainerRef}
      className="w-1/2 h-full overflow-auto border-r border-gray-300"
    >
      <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1;
          const originalDim = originalPageDimensions.current[index];

          if (!originalDim || containerWidth === 0) {
            return (
              <div
                key={`page_loader_${pageNumber}`}
                className="flex justify-center mb-4"
              >
                <Page
                  pageNumber={pageNumber}
                  width={containerWidth}
                  onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                />
              </div>
            );
          }

          const scale = containerWidth / originalDim.width;
          const itemsOnPage = allItemsWithBbox.filter(
            (item) => item.pageNumber === pageNumber
          );

          return (
            <div
              key={`page_wrapper_${pageNumber}`}
              className="relative mx-auto mb-4 shadow-lg"
              style={{ width: containerWidth }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                renderTextLayer={false}
              />
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ height: originalDim.height * scale }}
              >
                {itemsOnPage.map((item) => {
                  const [left, top, right, bottom] = item.bbox;

                  const PADDING = 4;

                  const rectLeft = left - PADDING;
                  const rectTop = originalDim.height - (top + PADDING);
                  const rectWidth = right - left + PADDING * 2;
                  const rectHeight = top - bottom + PADDING * 2;

                  const style: React.CSSProperties = {
                    left: `${rectLeft * scale}px`,
                    top: `${rectTop * scale}px`,
                    width: `${rectWidth * scale}px`,
                    height: `${rectHeight * scale}px`,
                    position: "absolute",
                    pointerEvents: "auto",
                  };

                  const blockId = sourceIdToBlockIdMap.get(item.id);
                  const isActive = activeId === blockId;

                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        if (!itemRefs.current[item.id])
                          itemRefs.current[item.id] = {
                            pdf: null,
                            json: null,
                          };
                        itemRefs.current[item.id].pdf = el;
                      }}
                      style={style}
                      className={`cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-blue-500 bg-opacity-30 border-[1px] border-blue-600"
                          : ""
                      }`}
                      onMouseEnter={() => onItemHover(item)}
                      onMouseLeave={onItemLeave}
                    />
                  );
                })}
                {tempSelection?.position.pageNumber === pageNumber &&
                  tempSelection.position.rects.map((rect, i) => (
                    <div
                      key={`temp-${i}`}
                      style={{
                        position: "absolute",
                        left: `${rect.left * scale}px`,
                        top: `${rect.top * scale}px`,
                        width: `${rect.width * scale}px`,
                        height: `${rect.height * scale}px`,
                        zIndex: 999,
                      }}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </Document>
    </div>
  );
};
