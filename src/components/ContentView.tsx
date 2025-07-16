import React from "react";
import { TableView } from "./TableView";
import type { DocumentBlock } from "../types";

interface ContentViewProps {
  documentBlocks: DocumentBlock[];
  activeId: string | null;
  itemRefs: React.MutableRefObject<
    Record<string, { pdf: HTMLDivElement | null; json: HTMLElement | null }>
  >;
  onItemClick: (id: string) => void;
}

export const ContentView: React.FC<ContentViewProps> = ({
  documentBlocks,
  activeId,
  itemRefs,
  onItemClick,
}) => {
  return (
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
          onClick: () => onItemClick(block.id),
        };
        switch (block.type) {
          case "heading":
            return (
              <div
                key={key}
                {...commonProps}
                className={`p-1 cursor-pointer ${
                  isActive ? "bg-yellow-200" : ""
                }`}
              >
                <h3 className="text-xl font-semibold text-gray-800 text-start">
                  {block.content}
                </h3>
              </div>
            );
          case "paragraph":
            if (block.content.trim().startsWith("*")) {
              return (
                <div
                  {...commonProps}
                  className={`p-1 cursor-pointer ${
                    isActive ? "bg-yellow-200" : ""
                  }`}
                >
                  <p className="text-xs italic text-gray-600 text-start">
                    {block.content}
                  </p>
                </div>
              );
            }
            return (
              <div
                key={key}
                {...commonProps}
                className={`p-1 cursor-pointer ${
                  isActive ? "bg-yellow-200" : ""
                }`}
              >
                <p
                  className={`text-sm leading-relaxed text-gray-700 text-start ${
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
                className={`p-3 cursor-pointer ${
                  isActive ? "bg-yellow-200" : "bg-gray-50"
                }`}
              >
                <TableView tableData={block.data.data} />
              </div>
            );
          case "picture":
            const imageData = block.data.image;
            return (
              <div
                key={key}
                {...commonProps}
                className={`p-3 cursor-pointer ${
                  isActive ? "bg-yellow-200" : "bg-gray-50"
                }`}
              >
                {imageData?.uri ? (
                  <img
                    src={imageData.uri}
                    alt={block.data.label || `Image ${block.id}`}
                    className="h-auto max-w-full p-2 mx-auto"
                  />
                ) : (
                  <p className="text-sm italic font-medium text-gray-500">
                    [Image not available]
                  </p>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
