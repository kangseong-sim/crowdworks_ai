# 💻crowdworks_ai
## 🚀 소개
### 프로젝트 소개
해당 프로젝트는 crowdworks_ai 사전 과제인 **PDF 문서와 해당 문서를 파싱한 JSON 데이터를 연결하여 양방향 인터랙션**을 구현하였습니다.

사용자는 PDF의 텍스트, 이미지, 테이블 등의 요소에 마우스를 올리면, 구조화된 JSON 데이터의 해당 항목이 하이라이트 되며 동기화됩니다. 이 프로젝트는 정적인 PDF 문서를 동적인 데이터 소스로 변환하여 문서의 구조와 내용을 직관적으로 탐색하고 분석할 수 있도록 돕습니다.

### 주요 기능
• **PDF-JSON 뷰의 양방향 동기화**
  :한쪽 뷰에서 특정 항목을 클릭하면 다른 쪽 뷰의 해당 위치로 스크롤되어 사용자는 PDF의 시각적 요소와 JSON의 데이터 구조를 직관적으로 연결하며 탐색할 수 있습니다.

• **동적 오버레이를 통한 PDF 상호작용**
  :react-pdf로 렌더링된 PDF 위에 보이지 않는 div 오버레이를 동적으로 생성합니다. 이 오버레이는 마우스 호버(hover) 시 해당 영역을 시각적으로 하이라이트하고 클릭 이벤트를 감지하는 역할을 수행하여, 정적인 PDF 문서를 인터랙티브하게 만듭니다

• **구조화된 JSON 콘텐츠 뷰**
  :원본 JSON 데이터를 단순히 나열하는 것이 아니라, heading, paragraph, table 등 의미 있는 블록(Block) 단위로 가공하여 보여줍니다. 특히 복잡한 표(Table) 데이터의 rowSpan과 colSpan까지 정확하게 계산하여 시각적으로 렌더링하는 기능을 포함합니다.

### 기술적 특징
#### 성능 최적화 방법
• **입력 디바운싱 (useDebounce)**
  :사용자가 창 크기를 조절할 때 ResizeObserver 이벤트가 매우 빈번하게 발생합니다. useDebounce를 사용해 이벤트 발생이 멈춘 후 일정 시간(100ms)이 지난 후 PDF 뷰의 너비를 업데이트하도록 설정했습니다. 이는 불필요한 렌더링을 최소화하여 리사이즈 시 발생할 수 있는 버벅임을 방지합니다.

• **PDF 텍스트 레이어 비활성화 (renderTextLayer={false})**
  :react-pdf가 기본으로 제공하는 텍스트 레이어는 DOM 요소를 많이 생성하여 성능을 저하할 수 있습니다. 자체적인 하이라이트 오버레이를 사용하므로, 불필요한 기본 텍스트 레이어를 비활성화하여 렌더링 성능을 높이고 DOM을 가볍게 유지합니다.

• **계산 결과 메모이제이션 (useMemo)**
  :테이블 데이터를 렌더링하는 TableView 컴포넌트에서 useMemo를 사용하여 복잡한 grid 계산 결과를 캐싱합니다. 테이블 데이터가 변경되지 않는 한, 불필요한 재렌더링 시 테이블 구조 계산 로직을 다시 실행하지 않아 렌더링 성능을 최적화합니다.

### 프로젝트 구조
```
crowdworks_ai
├─ .nvmrc
├─ LICENSE
├─ README.md
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ logo192.png
│  ├─ logo512.png
│  ├─ manifest.json
│  ├─ report.json
│  ├─ report.pdf
│  └─ robots.txt
├─ src
│  ├─ App.css
│  ├─ App.test.tsx
│  ├─ App.tsx
│  ├─ components
│  │  ├─ ContentView.tsx
│  │  ├─ PdfJsonViewer.tsx
│  │  ├─ PdfView.tsx
│  │  └─ TableView.tsx
│  ├─ hooks
│  │  ├─ useDebounce.ts
│  │  └─ useProcessedPdfData.ts
│  ├─ index.css
│  ├─ index.tsx
│  ├─ logo.svg
│  ├─ react-app-env.d.ts
│  ├─ reportWebVitals.ts
│  ├─ setupTests.ts
│  └─ types.ts
├─ tailwind.config.js
└─ tsconfig.json

```

## 🛠️ 기술 스택
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

| **Category** | **Stack** |
|:------------:|:----------:|
| **Front-end** | `React`, `TypeScript` |
| **Style** | `Tailwind CSS` |


## 💻 설치 방법
1. 저장소 복제
```bash
git clone https://github.com/kangseong-sim/crowdworks_ai.git
cd crowdworks_ai
```

2. 의존성 설치
```bash
npm install
# 또는
yarn install
```

3. 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
```

4. 빌드
```bash
npm run build
# 또는
yarn build
```

