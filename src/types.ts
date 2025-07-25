export interface JsonDataItem {
  id: string;
  pageNumber: number;
  text?: string;
  bbox: number[];
}

export interface PdfJsonViewerProps {
  pdfUrl: string;
  jsonData: Data;
}

export interface PageDetail {
  width: number;
  height: number;
  scale: number;
}

export interface Data {
  schema_name: string;
  version: string;
  name: string;
  origin: Origin;
  furniture: Furniture;
  body: Body;
  groups: Group[];
  texts: Text[];
  pictures: Picture[];
  tables: Table[];
  key_value_items: any[];
  form_items: any[];
  pages: Pages;
}

export interface Origin {
  mimetype: string;
  binary_hash: number;
  filename: string;
}

export interface Furniture {
  self_ref: string;
  children: any[];
  content_layer: string;
  name: string;
  label: string;
}

export interface Body {
  self_ref: string;
  children: Children[];
  content_layer: string;
  name: string;
  label: string;
}

export interface Children {
  $ref: string;
}

export interface Group {
  self_ref: string;
  parent: Parent;
  children: Children2[];
  content_layer: string;
  name: string;
  label: string;
}

export interface Parent {
  $ref: string;
}

export interface Children2 {
  $ref: string;
}

export interface Text {
  self_ref: string;
  parent: Parent2;
  children: any[];
  content_layer: string;
  label: string;
  prov: Prov[];
  orig: string;
  text: string;
  level?: number;
  enumerated?: boolean;
  marker?: string;
}

export interface Parent2 {
  $ref: string;
}

export interface Prov {
  page_no: number;
  bbox: Bbox;
  charspan: number[];
}

export interface Bbox {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: string;
}

export interface Picture {
  self_ref: string;
  parent: Parent3;
  children: Children3[];
  content_layer: string;
  label: string;
  prov: Prov2[];
  captions: any[];
  references: any[];
  footnotes: any[];
  image: Image;
  annotations: any[];
}

export interface Parent3 {
  $ref: string;
}

export interface Children3 {
  $ref: string;
}

export interface Prov2 {
  page_no: number;
  bbox: Bbox2;
  charspan: number[];
}

export interface Bbox2 {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: string;
}

export interface Image {
  mimetype: string;
  dpi: number;
  size: Size;
  uri: string;
}

export interface Size {
  width: number;
  height: number;
}

export interface TableData {
  table_cells: TableCell[];
  num_rows: number;
  num_cols: number;
  grid: Grid[][];
}

export interface Table {
  self_ref: string;
  parent: Parent4;
  children: any[];
  content_layer: string;
  label: string;
  prov: Prov3[];
  captions: any[];
  references: any[];
  footnotes: any[];
  data: TableData;
}

export interface Parent4 {
  $ref: string;
}

export interface Prov3 {
  page_no: number;
  bbox: Bbox3;
  charspan: number[];
}

export interface Bbox3 {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: string;
}

export interface Data {
  table_cells: TableCell[];
  num_rows: number;
  num_cols: number;
  grid: Grid[][];
}

export interface TableCell {
  bbox: Bbox4;
  row_span: number;
  col_span: number;
  start_row_offset_idx: number;
  end_row_offset_idx: number;
  start_col_offset_idx: number;
  end_col_offset_idx: number;
  text: string;
  column_header: boolean;
  row_header: boolean;
  row_section: boolean;
}

export interface Bbox4 {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: string;
}

export interface Grid {
  bbox: Bbox5;
  row_span: number;
  col_span: number;
  start_row_offset_idx: number;
  end_row_offset_idx: number;
  start_col_offset_idx: number;
  end_col_offset_idx: number;
  text: string;
  column_header: boolean;
  row_header: boolean;
  row_section: boolean;
}

export interface Bbox5 {
  l: number;
  t: number;
  r: number;
  b: number;
  coord_origin: string;
}

export interface Pages {
  "1": N1;
}

export interface N1 {
  size: Size2;
  image: Image2;
  page_no: number;
}

export interface Size2 {
  width: number;
  height: number;
}

export interface Image2 {
  mimetype: string;
  dpi: number;
  size: Size3;
  uri: string;
}

export interface Size3 {
  width: number;
  height: number;
}

export interface Data {
  schema_name: string;
  version: string;
  name: string;
  origin: Origin;
  furniture: Furniture;
  body: Body;
  groups: Group[];
  texts: Text[];
  pictures: Picture[];
  tables: Table[];
  key_value_items: any[];
  form_items: any[];
  pages: Pages;
}

interface TextContent {
  id: string;
  type: "text";
  data: Text;
}

interface PictureContent {
  id: string;
  type: "picture";
  data: Picture;
}

interface TableContent {
  id: string;
  type: "table";
  data: Table;
}

interface GroupContent {
  id: string;
  type: "group";
  data: Group;
}

export type OrderedContentItem =
  | TextContent
  | PictureContent
  | TableContent
  | GroupContent
  | { id: string; type: string; data: any };

export interface OriginalPageDimension {
  width: number;
  height: number;
}

export interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface HighlightPosition {
  pageNumber: number;
  rects: HighlightRect[];
}
export interface Highlight {
  id: string;
  content: string;
  position: HighlightPosition;
  comment?: string;
}

export type DocumentBlock =
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
    }
  | {
      id: string;
      sourceIds: string[];
      type: "unknown";
      content?: string;
      data: any;
      page: number | null;
    };
