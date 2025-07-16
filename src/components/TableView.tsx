import React, { useMemo, JSX } from "react";
import type { TableData } from "../types";

export const TableView = ({ tableData }: { tableData: TableData }) => {
  
  const tableContent = useMemo(() => {
    if (!tableData?.grid || tableData.grid.length === 0) {
      return (
        <p className="mt-2 text-xs text-gray-500">No table data available.</p>
      );
    }

    const { grid, num_rows, num_cols } = tableData;

    const occupied = Array.from({ length: num_rows }, () =>
      Array(num_cols).fill(false)
    );

    const rows: JSX.Element[] = [];

    for (let r = 0; r < num_rows; r++) {
      const cells: JSX.Element[] = [];
      for (let c = 0; c < num_cols; c++) {
        if (occupied[r][c]) {
          continue;
        }

        const cellData = grid[r][c];
        if (!cellData) continue;

        occupied[r][c] = true;

        const { row_span, col_span, text, column_header, row_header } =
          cellData;

        if (row_span > 1 || col_span > 1) {
          for (let ri = 0; ri < row_span; ri++) {
            for (let ci = 0; ci < col_span; ci++) {
              if (r + ri < num_rows && c + ci < num_cols) {
                occupied[r + ri][c + ci] = true;
              }
            }
          }
        }

        const CellComponent = column_header || row_header ? "th" : "td";

        cells.push(
          <CellComponent
            key={`${r}-${c}`}
            rowSpan={row_span > 1 ? row_span : undefined}
            colSpan={col_span > 1 ? col_span : undefined}
            className={`p-1 border border-gray-200 text-left align-top break-words ${
              CellComponent === "th" ? "font-bold bg-gray-50" : ""
            }`}
          >
            {text}
          </CellComponent>
        );
      }
      rows.push(
        <tr key={r} className="border-b border-gray-200">
          {cells}
        </tr>
      );
    }

    return (
      <table className="w-full text-xs bg-white border-collapse table-fixed ">
        <tbody>{rows}</tbody>
      </table>
    );
  }, [tableData]);

  return <div className="border border-gray-300 ">{tableContent}</div>;
};
