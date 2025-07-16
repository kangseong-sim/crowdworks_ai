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
  JsonDataItem,
  OriginalPageDimension,
  Highlight,
  DocumentBlock,
} from "../types";
import { PdfView } from "./PdfView";
import { ContentView } from "./ContentView";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// 페이지의 원본 크기를 저장하기 위한 타입

export default function PdfJsonViewer({
  pdfUrl,
  jsonData,
}: PdfJsonViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const originalPageDimensions = useRef<(OriginalPageDimension | null)[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tempSelection, setTempSelection] = useState<Highlight | null>(null);

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

    orderedContent.forEach((item) => {
      if (item.type === "group") return;
      const page = item.data.prov?.[0]?.page_no ?? null;

      switch (item.type) {
        case "text":
          if (item.data.label === "section_header") {
            blocks.push({
              id: item.id,
              sourceIds: [item.id],
              type: "heading",
              content: item.data.text,
              page,
            });
          } else {
            blocks.push({
              id: item.id,
              sourceIds: [item.id],
              type: "paragraph",
              content: item.data.text,
              page,
            });
          }
          break;

        case "table":
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "table",
            data: item.data,
            page,
          });
          break;

        case "picture":
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "picture",
            data: item.data,
            page,
          });
          break;
      }
    });
    return blocks;
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
        onItemLeave={() => setTempSelection(null)}
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
