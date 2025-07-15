// src/App.tsx

import { useState, useEffect } from "react";
import "./App.css";
import PdfJsonViewer from "./components/PdfJsonViewer";
import type { Data as JsonData } from "./types";

function App() {
  const MOCK_PDF_URL = "/report.pdf";
  const MOCK_JSON_URL = "/report.json";

  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(MOCK_JSON_URL);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setJsonData(data);
      } catch (e: any) {
        setError(e.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [MOCK_JSON_URL]);

  if (loading) {
    return <div>Loading document...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="App">
      <PdfJsonViewer pdfUrl={MOCK_PDF_URL} jsonData={jsonData!} />
    </div>
  );
}

export default App;
