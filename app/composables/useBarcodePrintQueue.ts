export interface BarcodePrintItem {
  controlNumber: string;
  title?: string;
  author?: string;
  shelfLocation?: string;
}

interface StoredPrintJob {
  items: BarcodePrintItem[];
  sourceRoute: string;
  createdAt: string;
}

const STORAGE_KEY = "sncbt-library-barcode-print-job";

export function useBarcodePrintQueue() {
  const items = useState<BarcodePrintItem[]>(
    "library-barcode-print-items",
    () => [],
  );

  const sourceRoute = useState<string>(
    "library-barcode-print-source",
    () => "/librarian/books",
  );

  function persist() {
    if (!import.meta.client) {
      return;
    }

    const payload: StoredPrintJob = {
      items: items.value,
      sourceRoute: sourceRoute.value,
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(payload),
    );
  }

  function setPrintQueue(
    nextItems: BarcodePrintItem[],
    from = "/librarian/books",
  ) {
    items.value = nextItems
      .map((item) => ({
        ...item,
        controlNumber: item.controlNumber
          .trim()
          .toUpperCase(),
      }))
      .filter((item) => item.controlNumber);

    sourceRoute.value = from;
    persist();
  }

  function restorePrintQueue() {
    if (!import.meta.client || items.value.length > 0) {
      return;
    }

    const saved = sessionStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as StoredPrintJob;

      items.value = Array.isArray(parsed.items)
        ? parsed.items
        : [];

      sourceRoute.value =
        parsed.sourceRoute || "/librarian/books";
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearPrintQueue() {
    items.value = [];
    sourceRoute.value = "/librarian/books";

    if (import.meta.client) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    items,
    sourceRoute,
    setPrintQueue,
    restorePrintQueue,
    clearPrintQueue,
  };
}
