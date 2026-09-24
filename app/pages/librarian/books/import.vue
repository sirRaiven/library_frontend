<script setup lang="ts">

import { userFacingErrorMessage } from "~/utils/user-facing-error";
import { useAuth } from "~/composables/useAuth";
import { useBarcodePrintQueue } from "~/composables/useBarcodePrintQueue";
import { useLibraryInventoryExcel } from "~/composables/useLibraryInventoryExcel";
import type {
  InventoryImportRow,
  InventoryRowIssue,
} from "~/composables/useLibraryInventoryExcel";

definePageMeta({
  layout: "librarian",
  title: "Import Library Inventory",
});

interface ImportedCopy {
  rowNumber: number;
  bookDocumentId: string;
  copyDocumentId: string;
  accession_number: string;
  control_number: string;
  title: string;
  author: string;
  classification_number: string;
  author_number: string;
  call_number: string;
  subject?: string | null;
  shelf_location: string;
}

interface ImportResult {
  summary: {
    received: number;
    valid: number;
    requestedCopies: number;
    createdBooks: number;
    createdCopies: number;
    skippedDuplicates: number;
    failedValidation: number;
  };
  imported: ImportedCopy[];
  skipped: InventoryRowIssue[];
  errors: InventoryRowIssue[];
}

interface ImportResponse {
  data: ImportResult;
}

const auth = useAuth();
const toast = useToast();
const printQueue = useBarcodePrintQueue();
const excel = useLibraryInventoryExcel();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const parsedRows = ref<InventoryImportRow[]>([]);
const parsingIssues = ref<InventoryRowIssue[]>([]);
const worksheetName = ref("");
const isParsing = ref(false);
const isImporting = ref(false);
const isDownloadingTemplate = ref(false);
const processedRows = ref(0);
const importedCopies = ref<ImportedCopy[]>([]);
const importSkipped = ref<InventoryRowIssue[]>([]);
const importErrors = ref<InventoryRowIssue[]>([]);
const createdBooks = ref(0);

const previewRows = computed(() =>
  parsedRows.value.slice(0, 15),
);

const requestedCopies = computed(() =>
  parsedRows.value.reduce(
    (total, row) => total + row.number_of_copies,
    0,
  ),
);

const hasParsedFile = computed(
  () =>
    parsedRows.value.length > 0 ||
    parsingIssues.value.length > 0,
);

const canImport = computed(
  () =>
    parsedRows.value.length > 0 &&
    parsingIssues.value.length === 0 &&
    !isParsing.value &&
    !isImporting.value,
);

const importProgress = computed(() => {
  if (parsedRows.value.length === 0) {
    return 0;
  }

  return Math.round(
    (processedRows.value / parsedRows.value.length) * 100,
  );
});

const totalImportIssues = computed(
  () =>
    importSkipped.value.length +
    importErrors.value.length,
);

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

function openFilePicker(): void {
  fileInput.value?.click();
}

async function downloadImportTemplate(): Promise<void> {
  if (isDownloadingTemplate.value) return;

  isDownloadingTemplate.value = true;
  try {
    await excel.downloadImportTemplate();
  } catch (error) {
    toast.add({
      title: "Template download failed",
      description: userFacingErrorMessage(
        error,
        "The Excel template could not be created. Please try again.",
      ),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isDownloadingTemplate.value = false;
  }
}

function clearParsedFile(): void {
  selectedFile.value = null;
  parsedRows.value = [];
  parsingIssues.value = [];
  worksheetName.value = "";
  importedCopies.value = [];
  importSkipped.value = [];
  importErrors.value = [];
  createdBooks.value = 0;
  processedRows.value = 0;

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

async function handleFileSelection(
  event: Event,
): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  clearParsedFile();
  selectedFile.value = file;
  isParsing.value = true;

  try {
    const parsed = await excel.parseInventoryFile(file);

    parsedRows.value = parsed.rows;
    parsingIssues.value = parsed.issues;
    worksheetName.value = parsed.worksheetName;

    if (parsed.issues.length > 0) {
      toast.add({
        title: "Excel file needs corrections",
        description: `${parsed.issues.length} row ${
          parsed.issues.length === 1 ? "has" : "have"
        } an issue. Correct the file and upload it again.`,
        color: "warning",
        icon: "i-lucide-triangle-alert",
      });
    } else {
      toast.add({
        title: "Excel file is ready",
        description: `${parsed.rows.length} inventory ${
          parsed.rows.length === 1 ? "row was" : "rows were"
        } validated for ${parsed.rows.reduce(
          (total, row) => total + row.number_of_copies,
          0,
        )} physical copies.`,
        color: "success",
        icon: "i-lucide-file-check-2",
      });
    }
  } catch (error) {
    selectedFile.value = null;

    toast.add({
      title: "Unable to read Excel file",
      description: userFacingErrorMessage(
        error,
        "The workbook could not be read.",
      ),
      color: "error",
      icon: "i-lucide-file-x-2",
    });
  } finally {
    isParsing.value = false;
  }
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

async function importInventory(): Promise<void> {
  if (!canImport.value) {
    return;
  }

  isImporting.value = true;
  processedRows.value = 0;
  importedCopies.value = [];
  importSkipped.value = [];
  importErrors.value = [];
  createdBooks.value = 0;

  try {
    const chunks = chunkRows(parsedRows.value, 100);

    for (const rows of chunks) {
      const response = await auth.authFetch<ImportResponse>(
        "/api/books/import-inventory",
        {
          method: "POST",
          body: {
            data: { rows },
          },
        },
      );

      importedCopies.value.push(
        ...response.data.imported,
      );
      importSkipped.value.push(
        ...response.data.skipped,
      );
      importErrors.value.push(...response.data.errors);
      createdBooks.value +=
        response.data.summary.createdBooks;
      processedRows.value += rows.length;
    }

    toast.add({
      title: "Inventory import completed",
      description: `${importedCopies.value.length} physical ${
        importedCopies.value.length === 1 ? "copy was" : "copies were"
      } registered with accession-number barcodes.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: "/librarian/books/import",
        },
      });

      return;
    }

    toast.add({
      title: "Import failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isImporting.value = false;
  }
}

async function printImportedBarcodes(): Promise<void> {
  if (importedCopies.value.length === 0) {
    return;
  }

  printQueue.setPrintQueue(
    importedCopies.value.map((copy) => ({
      controlNumber: copy.accession_number || copy.control_number,
      title: copy.title,
      author: copy.author,
      shelfLocation: copy.shelf_location,
    })),
    "/librarian/books/import",
  );

  await navigateTo("/librarian/books/print");
}
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-staff-page">
    <div class="sncbt-staff-content mx-auto w-full max-w-[1600px] space-y-6">
      <LibrarianPageHeader
        eyebrow="Books & Collection"
        title="Import Existing Inventory"
        description="Upload the Library inventory workbook to register book titles, physical copies, accession numbers, and barcode values in batches."
        icon="i-lucide-file-up"
      >
        <template #actions>
          <UButton to="/librarian/books" label="Back to Collection" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
          <UButton
            label="Download Template"
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            :loading="isDownloadingTemplate"
            :disabled="isDownloadingTemplate"
            @click="downloadImportTemplate"
          />
          <UButton to="/librarian/books/register" label="Manual Registration" icon="i-lucide-book-plus" color="primary" />
        </template>
      </LibrarianPageHeader>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Excel import rules"
        description="One row represents one book title. Enter the Dewey classification number, author number, copyright date, and shelf location. The call number is generated automatically, while each barcode contains the accession number only."
      />

      <UCard v-if="importedCopies.length === 0">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div
            class="rounded-2xl border-2 border-dashed border-default bg-elevated/40 p-8 text-center"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="hidden"
              @change="handleFileSelection"
            />

            <div
              class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-file-spreadsheet"
                class="size-7"
              />
            </div>

            <h2 class="mt-4 text-lg font-semibold text-highlighted">
              Select the library inventory workbook
            </h2>
            <p class="mx-auto mt-2 max-w-xl text-sm text-muted">
              Use an <strong>.xlsx</strong> file created from the latest fourteen-column template. The Call Number column is generated automatically.
            </p>

            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <UButton
                :label="selectedFile ? 'Choose Another File' : 'Choose Excel File'"
                icon="i-lucide-upload"
                color="primary"
                size="lg"
                :loading="isParsing"
                @click="openFilePicker"
              />

              <UButton
                v-if="selectedFile"
                label="Remove"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="lg"
                :disabled="isParsing"
                @click="clearParsedFile"
              />
            </div>

            <div
              v-if="selectedFile"
              class="mx-auto mt-5 flex max-w-lg items-center gap-3 rounded-xl border border-default bg-default p-3 text-left"
            >
              <UIcon
                name="i-lucide-file-check-2"
                class="size-5 shrink-0 text-success"
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ selectedFile.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ worksheetName || "Reading worksheet" }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="rounded-xl border border-default p-4">
              <p class="text-sm text-muted">Valid book rows</p>
              <p class="mt-1 text-3xl font-bold text-highlighted">
                {{ parsedRows.length }}
              </p>
            </div>

            <div class="rounded-xl border border-default p-4">
              <p class="text-sm text-muted">Copies to create</p>
              <p class="mt-1 text-3xl font-bold text-success">
                {{ requestedCopies }}
              </p>
            </div>

            <div class="rounded-xl border border-default p-4">
              <p class="text-sm text-muted">Rows requiring correction</p>
              <p
                class="mt-1 text-3xl font-bold"
                :class="parsingIssues.length ? 'text-warning' : 'text-success'"
              >
                {{ parsingIssues.length }}
              </p>
            </div>

            <UButton
              label="Import & Generate Barcodes"
              icon="i-lucide-database-zap"
              color="primary"
              size="xl"
              block
              :loading="isImporting"
              :disabled="!canImport"
              @click="importInventory"
            />

            <p
              v-if="parsingIssues.length"
              class="text-xs text-warning"
            >
              Correct every listed row before importing. No partial import is
              started from an invalid workbook.
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-if="isImporting">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-semibold text-highlighted">
                Registering inventory records
              </p>
              <p class="text-sm text-muted">
                {{ processedRows }} of {{ parsedRows.length }} rows processed
              </p>
            </div>
            <span class="text-sm font-semibold text-success">
              {{ importProgress }}%
            </span>
          </div>

          <div class="h-2 overflow-hidden rounded-full bg-accented">
            <div
              class="h-full rounded-full bg-success transition-all"
              :style="{ width: `${importProgress}%` }"
            />
          </div>
        </div>
      </UCard>

      <UAlert
        v-if="parsingIssues.length"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Correct these Excel rows"
        :description="`${parsingIssues.length} row ${
          parsingIssues.length === 1 ? 'has' : 'have'
        } invalid or missing information.`"
      />

      <UCard v-if="parsingIssues.length">
        <div class="max-h-80 overflow-auto">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 bg-default">
              <tr class="border-b border-default">
                <th class="px-3 py-3 font-semibold text-highlighted">Row</th>
                <th class="px-3 py-3 font-semibold text-highlighted">Issue</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="issue in parsingIssues"
                :key="`${issue.rowNumber}-${issue.message}`"
                class="border-b border-default last:border-0"
              >
                <td class="px-3 py-3 font-mono text-muted">
                  {{ issue.rowNumber }}
                </td>
                <td class="px-3 py-3 text-warning">
                  {{ issue.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard v-if="previewRows.length && importedCopies.length === 0">
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Import Preview</h2>
            <p class="mt-1 text-sm text-muted">
              Showing the first {{ previewRows.length }} of
              {{ parsedRows.length }} valid rows.
            </p>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-[1680px] w-full text-left text-sm">
            <thead>
              <tr class="border-b border-default bg-elevated/60">
                <th class="px-3 py-3">Row</th>
                <th class="px-3 py-3">Inventory</th>
                <th class="px-3 py-3">Starting Accession</th>
                <th class="px-3 py-3 text-center">Copies</th>
                <th class="px-3 py-3">Classification</th>
                <th class="px-3 py-3">Author No.</th>
                <th class="px-3 py-3">Call Number</th>
                <th class="px-3 py-3">Book Category</th>
                <th class="px-3 py-3">Shelf Location</th>
                <th class="px-3 py-3">Subject</th>
                <th class="px-3 py-3">Title</th>
                <th class="px-3 py-3">Author</th>
                <th class="px-3 py-3">Copyright</th>
                <th class="px-3 py-3">Publisher</th>
                <th class="px-3 py-3">Edition</th>
                <th class="px-3 py-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in previewRows"
                :key="row.row_number"
                class="border-b border-default last:border-0"
              >
                <td class="px-3 py-3 text-muted">{{ row.row_number }}</td>
                <td class="px-3 py-3">{{ row.inventory_date }}</td>
                <td class="px-3 py-3 font-mono font-semibold">
                  {{ row.accession_number || "Auto" }}
                </td>
                <td class="px-3 py-3 text-center font-semibold">
                  {{ row.number_of_copies }}
                </td>
                <td class="px-3 py-3 font-mono">{{ row.classification_number }}</td>
                <td class="px-3 py-3 font-mono">{{ row.author_number }}</td>
                <td class="px-3 py-3 font-mono font-semibold">{{ row.call_number }}</td>
                <td class="px-3 py-3">{{ row.category }}</td>
                <td class="px-3 py-3">{{ row.shelf_location }}</td>
                <td class="px-3 py-3">{{ row.subject || "—" }}</td>
                <td class="px-3 py-3 font-medium text-highlighted">
                  {{ row.title }}
                </td>
                <td class="px-3 py-3">{{ row.author }}</td>
                <td class="px-3 py-3">{{ row.copyright_date || "—" }}</td>
                <td class="px-3 py-3">{{ row.publisher || "—" }}</td>
                <td class="px-3 py-3">{{ row.edition || "—" }}</td>
                <td class="px-3 py-3 text-right">
                  {{
                    new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(row.price)
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <UCard v-if="importedCopies.length > 0">
        <template #header>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-semibold text-highlighted">
                  Import Completed
                </h2>
                <UBadge color="success" variant="soft">
                  {{ importedCopies.length }} barcode{{
                    importedCopies.length === 1 ? "" : "s"
                  }} ready
                </UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">
                {{ createdBooks }} new book title{{ createdBooks === 1 ? "" : "s" }}
                created. Existing matching titles were reused.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                label="Print Accession Barcodes"
                icon="i-lucide-printer"
                color="primary"
                @click="printImportedBarcodes"
              />
              <UButton
                to="/librarian/books"
                label="View Collection"
                icon="i-lucide-library"
                color="neutral"
                variant="outline"
              />
              <UButton
                label="Import Another File"
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="ghost"
                @click="clearParsedFile"
              />
            </div>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Imported copies</p>
            <p class="mt-1 text-3xl font-bold text-success">
              {{ importedCopies.length }}
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">New book titles</p>
            <p class="mt-1 text-3xl font-bold text-highlighted">
              {{ createdBooks }}
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Duplicate accessions skipped</p>
            <p class="mt-1 text-3xl font-bold text-warning">
              {{ importSkipped.length }}
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Other issues</p>
            <p class="mt-1 text-3xl font-bold text-error">
              {{ importErrors.length }}
            </p>
          </div>
        </div>

        <div class="mt-5 max-h-96 overflow-auto rounded-xl border border-default">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="sticky top-0 bg-default">
              <tr class="border-b border-default">
                <th class="px-4 py-3">Accession / Barcode</th>
                <th class="px-4 py-3">Title</th>
                <th class="px-4 py-3">Author</th>
                <th class="px-4 py-3">Call Number</th>
                <th class="px-4 py-3">Shelf Location</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="copy in importedCopies"
                :key="copy.copyDocumentId"
                class="border-b border-default last:border-0"
              >
                <td class="px-4 py-3 font-mono font-bold text-highlighted">
                  {{ copy.accession_number }}
                </td>
                <td class="px-4 py-3 font-medium text-highlighted">
                  {{ copy.title }}
                </td>
                <td class="px-4 py-3 text-muted">{{ copy.author }}</td>
                <td class="px-4 py-3 font-mono">{{ copy.call_number }}</td>
                <td class="px-4 py-3">{{ copy.shelf_location }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <UAlert
          v-if="totalImportIssues"
          class="mt-5"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Some rows were not imported"
          :description="`${totalImportIssues} row ${
            totalImportIssues === 1 ? 'was' : 'were'
          } skipped or rejected by the server.`"
        />
      </UCard>
    </div>
  </UContainer>
</template>
