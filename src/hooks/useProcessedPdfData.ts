import { useMemo } from "react";
import type {
  Data as JsonData,
  JsonDataItem,
  OrderedContentItem,
  DocumentBlock,
  Children as Ref,
  Text,
  Picture,
  Table,
} from "../types";

export function useProcessedPdfData(jsonData: JsonData) {
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

        default:
          blocks.push({
            id: item.id,
            sourceIds: [item.id],
            type: "unknown",
            content:
              item.data?.text ||
              JSON.stringify(item.data) ||
              `Unknown type: ${item.type}`,
            data: item.data,
            page,
          });
          break;
      }
    });
    return blocks;
  }, [orderedContent]);

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

  return { allItemsWithBbox, documentBlocks, sourceIdToBlockIdMap };
}
