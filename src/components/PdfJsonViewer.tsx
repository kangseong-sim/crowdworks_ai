import React, { useState, useEffect, useRef, useMemo } from "react";
import { Document, Page, pdfjs, PageProps } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type {
  PdfJsonViewerProps,
  OrderedContentItem,
  Data as JsonData,
  Children as Ref,
  Text,
  Picture,
  Table,
  TableData,
} from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type DocumentBlock =
  | {
      id: string;
      sourceIds: string[];
      type: "heading";
      content: string;
      page: number | null;
    }
  | {
      id: string;
      sourceIds: string[];
      type: "paragraph";
      content: string;
      page: number | null;
    }
  | {
      id: string;
      sourceIds: string[];
      type: "table";
      data: Table;
      page: number | null;
    }
  | {
      id: string;
      sourceIds: string[];
      type: "picture";
      data: Picture;
      page: number | null;
    };

// 페이지의 원본 크기를 저장하기 위한 타입
interface OriginalPageDimension {
  width: number;
  height: number;
}

// TableView 컴포넌트
const TableView = ({ tableData }: { tableData: TableData }) => {
  if (!tableData?.grid || tableData.grid.length === 0) {
    return (
      <p className="mt-2 text-xs text-gray-500">No table data available.</p>
    );
  }
  return (
    <div className="mt-2 overflow-x-auto border border-gray-300 rounded-md">
      <table className="min-w-full text-xs bg-white border-collapse">
        <tbody>
          {tableData.grid.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              {row.map((cell, cellIndex) => {
                const CellComponent =
                  cell.column_header || cell.row_header ? "th" : "td";
                return (
                  <CellComponent
                    key={`${rowIndex}-${cellIndex}`}
                    rowSpan={cell.row_span > 1 ? cell.row_span : undefined}
                    colSpan={cell.col_span > 1 ? cell.col_span : undefined}
                    className={`p-2 border border-gray-200 text-left align-top ${
                      CellComponent === "th" ? "font-bold bg-gray-50" : ""
                    }`}
                  >
                    {cell.text}
                  </CellComponent>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const originalPageDimensions = useRef<(OriginalPageDimension | null)[]>([]);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const orderedContent: OrderedContentItem[] = useMemo(() => {
    const content: OrderedContentItem[] = [];
    const resolver = (refs: Ref[]) => {
      refs.forEach((refObj) => {
        const parts = refObj.$ref.split("/");
        if (parts.length < 3) return;
        const typeKey = parts[1] as keyof Pick<
          JsonData,
          "texts" | "pictures" | "tables" | "groups"
        >;
        const index = parseInt(parts[2], 10);
        if (isNaN(index)) return;
        switch (typeKey) {
          case "texts": {
            const i = jsonData.texts[index];
            if (i)
              content.push({
                id: i.self_ref || `${typeKey}-${index}`,
                type: "text",
                data: i,
              });
            break;
          }
          case "pictures": {
            const i = jsonData.pictures[index];
            if (i)
              content.push({
                id: i.self_ref || `${typeKey}-${index}`,
                type: "picture",
                data: i,
              });
            break;
          }
          case "tables": {
            const i = jsonData.tables[index];
            if (i)
              content.push({
                id: i.self_ref || `${typeKey}-${index}`,
                type: "table",
                data: i,
              });
            break;
          }
          case "groups": {
            const i = jsonData.groups[index];
            if (i?.children) resolver(i.children);
            break;
          }
        }
      });
    };
    if (jsonData?.body?.children) resolver(jsonData.body.children);
    return content;
  }, [jsonData]);

  const documentBlocks: DocumentBlock[] = useMemo(() => {
    const blocks: DocumentBlock[] = [];
    let currentParagraph: {
      id: string;
      text: string;
      page: number | null;
      sourceIds: string[];
    } | null = null;
    const flushParagraph = () => {
      if (currentParagraph) {
        blocks.push({
          ...currentParagraph,
          type: "paragraph",
          content: currentParagraph.text,
        });
        currentParagraph = null;
      }
    };
    orderedContent.forEach((item) => {
      if (item.type === "group") return;
      const page = item.data.prov?.[0]?.page_no ?? null;
      if (item.type === "text") {
        if (item.data.label === "section_header") {
          flushParagraph();
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "heading",
            content: item.data.text,
            page,
          });
        } else {
          if (currentParagraph) {
            currentParagraph.text += ` ${item.data.text}`;
            currentParagraph.sourceIds.push(item.id);
          } else {
            currentParagraph = {
              id: item.id,
              text: item.data.text,
              page,
              sourceIds: [item.id],
            };
          }
        }
      } else {
        flushParagraph();
        if (item.type === "table") {
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "table",
            data: item.data,
            page,
          });
        } else if (item.type === "picture") {
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "picture",
            data: item.data,
            page,
          });
        }
      }
    });
    flushParagraph();
    return blocks;
  }, [orderedContent]);

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
      {/* 오른쪽 JSON 뷰 */}
      <div className="w-1/2 h-full p-6 overflow-auto bg-white">
        <h2 className="pb-2 mb-4 text-2xl font-bold border-b">Json Content</h2>
        {documentBlocks.map((block) => {
          const key = block.id;
          switch (block.type) {
            case "heading":
              return (
                <div key={key} className="p-2 rounded-md">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {block.content}
                  </h3>
                </div>
              );
            case "paragraph":
              return (
                <div key={key} className="p-2 rounded-md">
                  <p className="text-base leading-relaxed text-gray-700">
                    {block.content}
                  </p>
                </div>
              );
            case "table":
              return (
                <div key={key} className="p-3 rounded-lg bg-gray-50">
                  <TableView tableData={block.data.data} />
                </div>
              );
            case "picture":
              return (
                <div
                  key={key}
                  className="p-3 text-center rounded-lg bg-gray-50"
                >
                  <p className="text-sm font-medium text-gray-500">
                    [IMAGE: {block.data.label || "Untitled"}]
                  </p>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
