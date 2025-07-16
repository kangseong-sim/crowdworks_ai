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
  JsonDataItem,
} from "../types";
import { TableView } from "./TableView";

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


export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const originalPageDimensions = useRef<(OriginalPageDimension | null)[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<
    Record<string, { pdf: HTMLDivElement | null; json: HTMLDivElement | null }>
  >({});

  const orderedContent: OrderedContentItem[] = useMemo(() => {
    // 콘텐츠 항목 목록 생성
    const content: OrderedContentItem[] = [];

    // Ref 배열 순회하여 콘텐츠 항목을 생성
    const resolver = (refs: Ref[]) => {
      refs.forEach((refObj) => {
        const parts = refObj.$ref.split("/");

        if (parts.length < 3) return;

        // 참조 타입과 인덱스 추출
        const typeKey = parts[1] as keyof Pick<
          JsonData,
          "texts" | "pictures" | "tables" | "groups"
        >;

        // 참조 인덱스 정수 변환
        const index = parseInt(parts[2], 10);

        if (isNaN(index)) return;

        // 참조 타입에 따라 jsonData에서 해당 데이터를 찾아 content에 추가
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

    // jsonData.body에 children이 있는 경우 최상위 레벨부터 resolver 함수 시작
    if (jsonData?.body?.children) resolver(jsonData.body.children);
    // 정렬된 콘텐츠 항목을 반환
    return content;
  }, [jsonData]);

  // 문서 블록을 생성하는 함수
  const documentBlocks: DocumentBlock[] = useMemo(() => {
    const blocks: DocumentBlock[] = [];

    // 임시 변수(현재 처리 중인 단락 저장)
    let currentParagraph: {
      id: string;
      text: string;
      page: number | null;
      sourceIds: string[];
    } | null = null;

    // 현재 단락이 있다면 blocks에 추가하고 초기화
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

    // orderedContent를 순회하며 블록 생성
    orderedContent.forEach((item) => {
      // 그룹 타입은 건너뛰기
      if (item.type === "group") return;

      // 페이지 번호 추출(없으면 null)
      const page = item.data.prov?.[0]?.page_no ?? null;

      if (item.type === "text") {
        if (item.data.label === "section_header") {
          flushParagraph();
          blocks.push({
            id: item.id, // 블록 ID
            sourceIds: [item.id], // 원본 ID
            type: "heading", // 블록 타입
            content: item.data.text, // 내용
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

    // 마지막 단락 남은 경우 추가
    flushParagraph();
    return blocks; // 생성된 블록 반환
  }, [orderedContent]);

  // PDF 오버레이를 렌더링 위한 bbox 정보 추출
  const allItemsWithBbox: JsonDataItem[] = useMemo(() => {
    const items: JsonDataItem[] = [];

    // 소스 항목들을 순회하며 bbox 정보를 추출
    const processItems = (
      sourceItems: (Text | Picture | Table)[],
      type: "texts" | "pictures" | "tables"
    ) => {
      sourceItems.forEach((item, index) => {
        if (!item.prov || item.prov.length === 0 || !item.prov[0].bbox) return;

        const prov = item.prov[0];
        const newItem: JsonDataItem = {
          id: item.self_ref || `${type}-${index}`,
          pageNumber: prov.page_no,
          bbox: [prov.bbox.l, prov.bbox.t, prov.bbox.r, prov.bbox.b], // 좌표 [left, top, right, bottom]
        };

        if (type === "texts") newItem.text = (item as Text).text;
        items.push(newItem);
      });
    };

    if (jsonData?.texts) processItems(jsonData.texts, "texts");
    if (jsonData?.pictures) processItems(jsonData.pictures, "pictures");
    if (jsonData?.tables) processItems(jsonData.tables, "tables");

    return items;
  }, [jsonData]);

  // sourceId(json)를 blockId(documentBlocks)로 매핑하는 Map 생성
  const sourceIdToBlockIdMap = useMemo(() => {
    const map = new Map<string, string>();
    documentBlocks.forEach((block) => {
      block.sourceIds.forEach((sourceId) => {
        map.set(sourceId, block.id);
      });
    });
    return map;
  }, [documentBlocks]);

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
                    const style: React.CSSProperties = {
                      left: `${left * scale}px`,
                      top: `${(originalDim.height - top) * scale}px`,
                      width: `${(right - left) * scale}px`,
                      height: `${(top - bottom) * scale}px`,
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
                        onClick={() => handleItemClick(item.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Document>
      </div>
      {/* 오른쪽 JSON 뷰 */}
      <div className="w-1/2 h-full p-6 overflow-auto bg-white">
        <h2 className="pb-2 mb-4 text-2xl font-bold border-b">Json Content</h2>
        {documentBlocks.map((block) => {
          const isActive = activeId === block.id;
          const key = block.id;
          const commonProps = {
            ref: (el: HTMLDivElement | null) => {
              if (!itemRefs.current[block.id])
                itemRefs.current[block.id] = { pdf: null, json: null };
              itemRefs.current[block.id].json = el;
            },
            onClick: () => handleItemClick(block.id),
          };
          switch (block.type) {
            case "heading":
              return (
                <div
                  key={key}
                  {...commonProps}
                  className={`p-2  cursor-pointer ${
                    isActive ? "bg-yellow-200" : ""
                  }`}
                >
                  <h3 className="text-xl font-semibold text-gray-800">
                    {block.content}
                  </h3>
                </div>
              );
            case "paragraph":
              return (
                <div
                  key={key}
                  {...commonProps}
                  className={`p-2 cursor-pointer ${
                    isActive ? "bg-yellow-200" : ""
                  }`}
                >
                  <p
                    className={`text-base leading-relaxed text-gray-700 ${
                      isActive ? "bg-yellow-200" : ""
                    }`}
                  >
                    {block.content}
                  </p>
                </div>
              );
            case "table":
              return (
                <div
                  key={key}
                  {...commonProps}
                  className={`p-3 ${isActive ? "bg-yellow-200" : "bg-gray-50"}`}
                >
                  <TableView tableData={block.data.data} />
                </div>
              );
            case "picture":
              return (
                <div
                  key={key}
                  {...commonProps}
                  className={`p-3 ${isActive ? "bg-yellow-200" : "bg-gray-50"}`}
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
