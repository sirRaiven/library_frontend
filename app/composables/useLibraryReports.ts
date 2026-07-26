
import type {
  LibraryReportCatalogItem,
  LibraryReportDocument,
  LibraryReportFilter,
  LibraryReportKey,
} from "~/types/libraryReports";

interface DataResponse<T> {
  data: T;
}

export function useLibraryReports() {
  const auth = useAuth();

  function queryString(
    values: object,
  ): string {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && value) {
        query.set(key, value);
      }
    }

    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
  }

  async function catalog(): Promise<
    LibraryReportCatalogItem[]
  > {
    const response = await auth.authFetch<
      DataResponse<LibraryReportCatalogItem[]>
    >("/api/library-reports/catalog");

    return response.data;
  }

  async function dashboard(
    filters: LibraryReportFilter,
  ): Promise<LibraryReportDocument> {
    const response = await auth.authFetch<
      DataResponse<LibraryReportDocument>
    >(
      `/api/library-reports/dashboard${queryString(
        filters,
      )}`,
    );

    return response.data;
  }

  async function generate(
    type: LibraryReportKey,
    filters: LibraryReportFilter,
  ): Promise<LibraryReportDocument> {
    const response = await auth.authFetch<
      DataResponse<LibraryReportDocument>
    >(
      `/api/library-reports/generate${queryString({
        type,
        ...filters,
      })}`,
    );

    return response.data;
  }

  return {
    catalog,
    dashboard,
    generate,
  };
}
