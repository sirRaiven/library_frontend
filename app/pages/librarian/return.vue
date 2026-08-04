
<script setup lang="ts">
import type {
  BatchReturnInputItem,
  MemberReturnLookup,
  ReturnLookup,
  TodayReturn,
} from "~/composables/useLibraryCirculation";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";

definePageMeta({
  layout: "librarian",
  title: "Return Books",
});

type ReturnCondition =
  | "Good"
  | "Damaged"
  | "Lost";

interface ReturnSelection {
  borrow: ReturnLookup;

  /**
   * A record becomes ready only after its physical copy barcode is scanned.
   * There is intentionally no manual checkbox that can bypass verification.
   */
  verified: boolean;
  verifiedBarcode: string;
  verifiedAt?: string;

  condition: ReturnCondition;
  fineAmount: number;
  remarks: string;
}

const circulation =
  useLibraryCirculation();
const auth = useAuth();
const toast = useToast();
const librarySettings = useLibrarySettings();

const scannerInput = ref("");
const bookScannerInput = ref("");

const memberReturns =
  ref<MemberReturnLookup | null>(
    null,
  );
const returnItems =
  ref<ReturnSelection[]>([]);
const todayRecords =
  ref<TodayReturn[]>([]);

const bulkCondition =
  ref<ReturnCondition>("Good");

const isScanning = ref(false);
const isVerifyingBook = ref(false);
const isProcessing = ref(false);
const isLoadingToday = ref(false);

const conditionOptions:
  ReturnCondition[] = [
    "Good",
    "Damaged",
    "Lost",
  ];

const cameraScanningBooks = computed(
  () =>
    Boolean(
      memberReturns.value &&
      returnItems.value.length > 0,
    ),
);

const cameraScannerTitle = computed(
  () =>
    cameraScanningBooks.value
      ? "Scan Return Book Barcode"
      : "Scan Library Member",
);

const cameraScannerDescription = computed(
  () =>
    cameraScanningBooks.value
      ? "Place the control-number or accession-number barcode of the physical book inside the guide."
      : "Place the Student Library Card or Faculty ID barcode inside the guide.",
);

const cameraProcessingLabel = computed(
  () =>
    cameraScanningBooks.value
      ? "Verifying return book"
      : "Loading member records",
);

const cameraProcessingDescription = computed(
  () =>
    cameraScanningBooks.value
      ? "Please wait while the physical book is matched with the member's active borrowing records."
      : "Please wait while the member and active borrowed books are being loaded.",
);

const verifiedItems = computed(
  () =>
    returnItems.value.filter(
      (item) => item.verified,
    ),
);

const verifiedCount = computed(
  () => verifiedItems.value.length,
);

const pendingScanCount = computed(
  () =>
    Math.max(
      returnItems.value.length -
        verifiedCount.value,
      0,
    ),
);

const canProcess = computed(
  () =>
    verifiedCount.value > 0 &&
    !isProcessing.value &&
    verifiedItems.value.every(
      (item) => Boolean(item.verifiedBarcode),
    ),
);

function focusMemberScanner() {
  if (!import.meta.client) {
    return;
  }

  nextTick(() => {
    document
      .querySelector<HTMLInputElement>(
        "#member-return-scanner",
      )
      ?.focus();
  });
}

function focusBookScanner() {
  if (!import.meta.client) {
    return;
  }

  nextTick(() => {
    document
      .querySelector<HTMLInputElement>(
        "#book-return-scanner",
      )
      ?.focus();
  });
}

function resetWorkflow() {
  memberReturns.value = null;
  returnItems.value = [];
  scannerInput.value = "";
  bookScannerInput.value = "";
  bulkCondition.value = "Good";
  focusMemberScanner();
}

function buildReturnItems(
  borrows: ReturnLookup[],
  preserve?: Map<
    string,
    ReturnSelection
  >,
): ReturnSelection[] {
  return borrows.map((borrow) => {
    const previous =
      preserve?.get(
        borrow.borrowDocumentId,
      );

    return {
      borrow,

      // Newly loaded books always require a physical barcode scan.
      verified:
        previous?.verified ??
        false,
      verifiedBarcode:
        previous?.verifiedBarcode ??
        "",
      verifiedAt:
        previous?.verifiedAt,

      condition:
        previous?.condition ??
        "Good",
      fineAmount:
        previous?.fineAmount ??
        Number(borrow.fine?.estimatedTotal ?? 0),
      remarks:
        previous?.remarks ??
        "",
    };
  });
}

async function loadTodayReturns() {
  isLoadingToday.value = true;

  try {
    todayRecords.value =
      await circulation.todayReturns();
  } catch (error) {
    console.warn(
      "Today's returns could not be loaded.",
      error,
    );
  } finally {
    isLoadingToday.value = false;
  }
}

async function loadMemberReturns(
  barcodeValue: string,
  options: {
    preserveEdits?: boolean;
    showToast?: boolean;
  } = {},
) {
  const barcode =
    barcodeValue
      .trim()
      .toUpperCase();

  if (!barcode) {
    return;
  }

  const previous =
    options.preserveEdits
      ? new Map(
          returnItems.value.map(
            (item) => [
              item.borrow
                .borrowDocumentId,
              item,
            ],
          ),
        )
      : undefined;

  memberReturns.value =
    await circulation
      .lookupMemberReturns(
        barcode,
      );

  returnItems.value =
    buildReturnItems(
      memberReturns.value
        .activeBorrows,
      previous,
    );

  bookScannerInput.value = "";

  if (
    memberReturns.value.totalActive >
    0
  ) {
    focusBookScanner();
  }

  if (options.showToast !== false) {
    toast.add({
      title: "Member borrowing records loaded",
      description:
        memberReturns.value.totalActive > 0
          ? `${memberReturns.value.totalActive} active ${
              memberReturns.value.totalActive ===
              1
                ? "book is"
                : "books are"
            } available for return.`
          : "This member has no active borrowed books.",
      color:
        memberReturns.value.totalActive > 0
          ? "success"
          : "info",
      icon:
        memberReturns.value.totalActive > 0
          ? "i-lucide-books"
          : "i-lucide-circle-check",
    });
  }
}

async function handleCameraBarcodeDetected(
  result: BarcodeScanResult,
) {
  const barcode =
    normalizeBarcode(
      result.value,
    );

  if (
    !barcode ||
    isScanning.value ||
    isVerifyingBook.value ||
    isProcessing.value
  ) {
    return;
  }

  if (
    cameraScanningBooks.value
  ) {
    bookScannerInput.value =
      barcode;

    await nextTick();
    await handleBookScan();
    return;
  }

  scannerInput.value =
    barcode;

  await nextTick();
  await handleScan();
}

async function handleScan() {
  const barcode =
    scannerInput.value
      .trim()
      .toUpperCase();

  if (
    !barcode ||
    isScanning.value
  ) {
    return;
  }

  isScanning.value = true;

  try {
    await loadMemberReturns(
      barcode,
    );
  } catch (error) {
    memberReturns.value =
      null;
    returnItems.value = [];

    toast.add({
      title:
        "Member borrowing records could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    isScanning.value =
      false;

    if (
      memberReturns.value?.totalActive
    ) {
      focusBookScanner();
    } else {
      focusMemberScanner();
    }
  }
}

function normalizeBarcode(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function itemBarcodes(
  item: ReturnSelection,
): string[] {
  return [
    item.borrow.copy
      .controlNumber,
    item.borrow.copy
      .accessionNumber,
  ]
    .map(normalizeBarcode)
    .filter(Boolean);
}

async function handleBookScan() {
  const scannedBarcode =
    normalizeBarcode(
      bookScannerInput.value,
    );

  if (
    !memberReturns.value ||
    !scannedBarcode ||
    isVerifyingBook.value
  ) {
    return;
  }

  isVerifyingBook.value = true;

  try {
    const matchedItem =
      returnItems.value.find(
        (item) =>
          itemBarcodes(
            item,
          ).includes(
            scannedBarcode,
          ),
      );

    if (!matchedItem) {
      toast.add({
        title:
          "Book does not belong to this return list",
        description:
          "The scanned copy is not an active borrowing record for the selected Student or Faculty.",
        color: "error",
        icon:
          "i-lucide-shield-x",
      });
      return;
    }

    if (
      matchedItem.verified
    ) {
      toast.add({
        title:
          "Book already verified",
        description:
          `${matchedItem.borrow.copy.book.title} is already marked Ready to Return.`,
        color: "info",
        icon:
          "i-lucide-scan-line",
      });
      return;
    }

    matchedItem.verified = true;
    matchedItem.verifiedBarcode =
      scannedBarcode;
    matchedItem.verifiedAt =
      new Date().toISOString();

    toast.add({
      title: "Book verified",
      description:
        `${matchedItem.borrow.copy.book.title} is now Ready to Return.`,
      color: "success",
      icon:
        "i-lucide-badge-check",
    });
  } finally {
    bookScannerInput.value = "";
    isVerifyingBook.value =
      false;
    focusBookScanner();
  }
}

function removeVerification(
  item: ReturnSelection,
) {
  item.verified = false;
  item.verifiedBarcode = "";
  item.verifiedAt = undefined;
  focusBookScanner();
}

function clearVerifiedBooks() {
  for (
    const item of
    returnItems.value
  ) {
    removeVerification(
      item,
    );
  }

  toast.add({
    title:
      "Ready books cleared",
    description:
      "Scan each physical book again before completing the return.",
    color: "info",
    icon:
      "i-lucide-rotate-ccw",
  });
}

function applyBulkValues() {
  if (
    verifiedItems.value.length ===
    0
  ) {
    toast.add({
      title: "No books selected",
      description:
        "Scan at least one physical book before applying the bulk values.",
      color: "warning",
      icon:
        "i-lucide-circle-alert",
    });
    return;
  }

  for (
    const item of
    verifiedItems.value
  ) {
    item.condition =
      bulkCondition.value;
    item.fineAmount = estimatedFine(item);
  }

  toast.add({
    title:
      "Values applied to verified books",
    description:
      `${verifiedItems.value.length} ${
        verifiedItems.value.length ===
        1
          ? "book was"
          : "books were"
      } updated.`,
    color: "info",
    icon:
      "i-lucide-list-checks",
  });
}

async function processSelectedReturns() {
  if (
    !memberReturns.value ||
    !canProcess.value
  ) {
    return;
  }

  const items:
    BatchReturnInputItem[] =
      verifiedItems.value.map(
        (item) => ({
          borrowDocumentId:
            item.borrow
              .borrowDocumentId,
          scannedBarcode:
            item.verifiedBarcode,
          condition:
            item.condition,
          remarks:
            item.remarks.trim() ||
            undefined,
        }),
      );

  isProcessing.value = true;

  try {
    const result =
      await circulation
        .processReturns({
          items,
        });

    if (
      result.processedCount > 0
    ) {
      toast.add({
        title:
          result.failedCount > 0
            ? "Some returns were completed"
            : "Returns completed",
        description:
          `${result.processedCount} ${
            result.processedCount ===
            1
              ? "book was"
              : "books were"
          } returned${
            result.failedCount > 0
              ? `; ${result.failedCount} could not be processed.`
              : "."
          }`,
        color:
          result.failedCount > 0
            ? "warning"
            : "success",
        icon:
          result.failedCount > 0
            ? "i-lucide-triangle-alert"
            : "i-lucide-circle-check-big",
      });
    }

    for (
      const failure of
      result.failures
    ) {
      toast.add({
        title:
          failure.title ||
          failure.borrowNo ||
          "Return not processed",
        description:
          failure.message,
        color: "error",
        icon:
          "i-lucide-circle-x",
      });
    }

    await loadTodayReturns();

    await loadMemberReturns(
      memberReturns.value
        .member.barcode ||
        memberReturns.value
          .member.identifier,
      {
        preserveEdits: true,
        showToast: false,
      },
    );
  } catch (error) {
    toast.add({
      title:
        "Selected returns could not be processed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-x",
    });
  } finally {
    isProcessing.value =
      false;

    if (
      memberReturns.value
    ) {
      focusBookScanner();
    } else {
      focusMemberScanner();
    }
  }
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}

function formatDateTime(
  value?: string,
): string {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      },
    )
    .format(
      new Date(value),
    );
}

function formatCurrency(
  value: number,
): string {
  return new Intl
    .NumberFormat(
      "en-PH",
      {
        style: "currency",
        currency: "PHP",
      },
    )
    .format(
      value || 0,
    );
}

function conditionColor(
  value: string,
):
  | "success"
  | "warning"
  | "error"
  | "neutral" {
  if (value === "Good") {
    return "success";
  }

  if (
    value === "Damaged"
  ) {
    return "warning";
  }

  if (value === "Lost") {
    return "error";
  }

  return "neutral";
}

onMounted(() => {
  focusMemberScanner();
  void librarySettings.load(true);
  void loadTodayReturns();
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      class="mx-auto max-w-7xl space-y-6"
    >
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div
            class="flex flex-wrap items-center gap-2"
          >
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Return Books
            </h1>

            <UBadge
              color="success"
              variant="soft"
            >
              Member-based return
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm text-muted"
          >
            Scan the member first, then scan every physical book presented at the counter. Only verified book barcodes can be returned.
          </p>
        </div>

        <UButton
          to="/librarian/borrow"
          label="Borrow Books"
          icon="i-lucide-book-up"
          color="neutral"
          variant="outline"
          class="self-start"
        />
      </div>

      <div
        class="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]"
      >
        <div class="space-y-6">
          <UCard>
            <template #header>
              <div
                class="flex items-center gap-3"
              >
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success"
                >
                  <UIcon
                    name="i-lucide-scan-line"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Scan Library Member
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Student card or Faculty ID barcode
                  </p>
                </div>
              </div>
            </template>

            <form
              class="space-y-4"
              @submit.prevent="handleScan"
            >
              <div
                class="flex flex-col gap-2 sm:flex-row sm:items-stretch"
              >
                <UInput
                  id="member-return-scanner"
                  v-model="scannerInput"
                  icon="i-lucide-scan-barcode"
                  placeholder="Scan LC-2026-000001 or Faculty ID"
                  size="xl"
                  color="success"
                  autocomplete="off"
                  autofocus
                  :loading="isScanning"
                  class="min-w-0 flex-1"
                >
                  <template #trailing>
                    <UKbd>Enter</UKbd>
                  </template>
                </UInput>

                <LiveBarcodeScanner
                  :disabled="
                    isScanning ||
                    isVerifyingBook ||
                    isProcessing
                  "
                  :title="
                    cameraScannerTitle
                  "
                  button-label="Use Camera"
                  :ready-description="
                    cameraScannerDescription
                  "
                  :processing-label="
                    cameraProcessingLabel
                  "
                  :processing-description="
                    cameraProcessingDescription
                  "
                  storage-key="sncbt-returning-camera"
                  :duplicate-cooldown-ms="0"
                  :detection-hold-ms="800"
                  @detected="
                    handleCameraBarcodeDetected
                  "
                />
              </div>

              <UButton
                type="submit"
                label="Load Borrowed Books"
                icon="i-lucide-search"
                color="success"
                block
                :loading="isScanning"
                :disabled="
                  !scannerInput.trim() ||
                  isScanning
                "
              />
            </form>
          </UCard>

          <UCard
            v-if="memberReturns"
          >
            <template #header>
              <div
                class="flex items-center justify-between gap-3"
              >
                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Borrower
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Verified member record
                  </p>
                </div>

                <UBadge
                  color="success"
                  variant="soft"
                >
                  {{
                    memberReturns.member.type
                  }}
                </UBadge>
              </div>
            </template>

            <div
              class="flex items-start gap-3"
            >
              <UAvatar
                :alt="
                  memberReturns.member.fullName
                "
                :text="
                  memberReturns.member.fullName
                    .split(' ')
                    .map(
                      (part) =>
                        part[0],
                    )
                    .slice(0, 2)
                    .join('')
                "
                size="lg"
              />

              <div class="min-w-0">
                <p
                  class="font-semibold text-highlighted"
                >
                  {{
                    memberReturns.member.fullName
                  }}
                </p>

                <p
                  class="mt-1 font-mono text-sm text-muted"
                >
                  {{
                    memberReturns.member.identifier
                  }}
                </p>

                <p
                  v-if="
                    memberReturns.member
                      .programOrDepartment
                  "
                  class="mt-2 text-sm text-muted"
                >
                  {{
                    memberReturns.member
                      .programOrDepartment
                  }}
                </p>
              </div>
            </div>

            <div
              class="mt-4 grid grid-cols-2 gap-3"
            >
              <div
                class="rounded-xl bg-elevated/50 p-3"
              >
                <p
                  class="text-xs text-muted"
                >
                  Active books
                </p>
                <p
                  class="mt-1 text-xl font-bold text-highlighted"
                >
                  {{
                    memberReturns.totalActive
                  }}
                </p>
              </div>

              <div
                class="rounded-xl bg-elevated/50 p-3"
              >
                <p
                  class="text-xs text-muted"
                >
                  Overdue
                </p>
                <p
                  class="mt-1 text-xl font-bold"
                  :class="
                    memberReturns.overdueCount >
                    0
                      ? 'text-error'
                      : 'text-highlighted'
                  "
                >
                  {{
                    memberReturns.overdueCount
                  }}
                </p>
              </div>
            </div>

            <UButton
              label="Clear Member"
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              block
              class="mt-4"
              :disabled="isProcessing"
              @click="resetWorkflow"
            />
          </UCard>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-receipt-text"
            title="Automatic school-day fine"
            description="The system calculates ₱10 per chargeable school day after the due date. Saturdays, Sundays, regular holidays, school events, suspensions, and emergency closures are excluded. Payment is verified later using the cashier OR number."
          />
        </div>

        <UCard>
          <template #header>
            <div
              class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Active Borrowed Books
                </h2>
                <p
                  class="mt-1 text-sm text-muted"
                >
                  A record cannot be marked manually. Scan its physical barcode to change it from Scan Required to Ready to Return.
                </p>
              </div>

              <div
                v-if="
                  returnItems.length > 0
                "
                class="flex flex-wrap items-center gap-2"
              >
                <UButton
                  v-if="
                    verifiedCount > 0
                  "
                  label="Clear Ready Books"
                  icon="i-lucide-rotate-ccw"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="
                    clearVerifiedBooks
                  "
                />

                <UBadge
                  color="success"
                  variant="soft"
                  size="lg"
                >
                  {{ verifiedCount }}
                  ready
                </UBadge>

                <UBadge
                  v-if="
                    pendingScanCount > 0
                  "
                  color="warning"
                  variant="soft"
                  size="lg"
                >
                  {{ pendingScanCount }}
                  awaiting scan
                </UBadge>
              </div>
            </div>
          </template>

          <div
            v-if="!memberReturns"
            class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30 p-8 text-center"
          >
            <div
              class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted"
            >
              <UIcon
                name="i-lucide-users-round"
                class="size-7"
              />
            </div>

            <p
              class="mt-4 font-semibold text-highlighted"
            >
              Waiting for a member barcode
            </p>

            <p
              class="mt-1 max-w-lg text-sm text-muted"
            >
              Scan the Student Library Card or Faculty ID to retrieve every active Borrow Transaction for that member.
            </p>
          </div>

          <div
            v-else-if="
              returnItems.length === 0
            "
            class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30 p-8 text-center"
          >
            <div
              class="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-circle-check-big"
                class="size-7"
              />
            </div>

            <p
              class="mt-4 font-semibold text-highlighted"
            >
              No active borrowed books
            </p>

            <p
              class="mt-1 max-w-lg text-sm text-muted"
            >
              All borrowing records for this member are already closed.
            </p>
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <div
              class="rounded-2xl border border-success/40 bg-success/5 p-4 sm:p-5"
            >
              <div
                class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div
                  class="flex items-start gap-3"
                >
                  <div
                    class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                  >
                    <UIcon
                      name="i-lucide-scan-barcode"
                      class="size-6"
                    />
                  </div>

                  <div>
                    <p
                      class="font-semibold text-highlighted"
                    >
                      Step 2: Verify Physical Books
                    </p>

                    <p
                      class="mt-1 max-w-2xl text-sm leading-relaxed text-muted"
                    >
                      Scan the control number or accession-number barcode printed on each physical book. Scanning is the only way to mark a book Ready to Return.
                    </p>
                  </div>
                </div>

                <UBadge
                  color="success"
                  variant="soft"
                  size="lg"
                  class="self-start"
                >
                  {{ verifiedCount }} /
                  {{ returnItems.length }}
                  verified
                </UBadge>
              </div>

              <form
                class="mt-4 flex flex-col gap-3 sm:flex-row"
                @submit.prevent="
                  handleBookScan
                "
              >
                <UInput
                  id="book-return-scanner"
                  v-model="
                    bookScannerInput
                  "
                  icon="i-lucide-barcode"
                  placeholder="Scan LIB-2026-0001"
                  size="xl"
                  color="success"
                  autocomplete="off"
                  :loading="
                    isVerifyingBook
                  "
                  class="min-w-0 flex-1"
                >
                  <template #trailing>
                    <UKbd>Enter</UKbd>
                  </template>
                </UInput>

                <UButton
                  type="submit"
                  label="Verify Book"
                  icon="i-lucide-shield-check"
                  color="success"
                  size="xl"
                  :loading="
                    isVerifyingBook
                  "
                  :disabled="
                    !bookScannerInput.trim() ||
                    isVerifyingBook
                  "
                />
              </form>

              <p
                class="mt-3 flex items-center gap-2 text-xs text-muted"
              >
                <UIcon
                  name="i-lucide-camera"
                  class="size-4 text-success"
                />
                An open camera scanner automatically switches to physical-book verification after the member is loaded.
              </p>

              <UAlert
                class="mt-4"
                color="info"
                variant="soft"
                icon="i-lucide-shield-check"
                title="Physical verification required"
                description="Unscanned books remain active Borrow Transactions and cannot be included in the return request."
              />
            </div>

            <div
              class="rounded-2xl border border-default bg-elevated/30 p-4"
            >
              <div
                class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <UFormField
                  label="Bulk condition"
                  description="Applied only to Ready to Return books."
                >
                  <USelect
                    v-model="bulkCondition"
                    :items="conditionOptions"
                    icon="i-lucide-shield-check"
                    class="w-full"
                  />
                </UFormField>

                <UButton
                  label="Apply"
                  icon="i-lucide-copy-check"
                  color="neutral"
                  variant="outline"
                  class="self-end"
                  :disabled="
                    verifiedCount === 0
                  "
                  @click="applyBulkValues"
                />
              </div>
            </div>

            <article
              v-for="item in returnItems"
              :key="
                item.borrow
                  .borrowDocumentId
              "
              class="rounded-2xl border p-4 transition"
              :class="
                item.verified
                  ? 'border-success/50 bg-success/5'
                  : 'border-default bg-elevated/20'
              "
            >
              <div
                class="flex items-start gap-4"
              >
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  :class="
                    item.verified
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted'
                  "
                  :title="
                    item.verified
                      ? 'Barcode verified'
                      : 'Physical barcode scan required'
                  "
                >
                  <UIcon
                    :name="
                      item.verified
                        ? 'i-lucide-badge-check'
                        : 'i-lucide-scan-barcode'
                    "
                    class="size-5"
                  />
                </div>

                <div
                  class="min-w-0 flex-1"
                >
                  <div
                    class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                  >
                    <div class="min-w-0">
                      <p
                        class="font-semibold text-highlighted"
                      >
                        {{
                          item.borrow.copy
                            .book.title
                        }}
                      </p>

                      <p
                        class="mt-1 text-sm text-muted"
                      >
                        {{
                          item.borrow.copy
                            .book.author
                        }}
                      </p>

                      <div
                        class="mt-3 flex flex-wrap gap-2"
                      >
                        <UBadge
                          color="neutral"
                          variant="soft"
                        >
                          {{
                            item.borrow.copy
                              .controlNumber ||
                            item.borrow.copy
                              .accessionNumber
                          }}
                        </UBadge>

                        <UBadge
                          color="neutral"
                          variant="soft"
                        >
                          {{
                            item.borrow.borrowNo
                          }}
                        </UBadge>

                        <UBadge
                          v-if="
                            item.borrow.copy.book
                              .category
                          "
                          color="neutral"
                          variant="outline"
                        >
                          {{
                            item.borrow.copy.book
                              .category
                          }}
                        </UBadge>

                        <UBadge
                          :color="
                            item.borrow.daysOverdue >
                            0
                              ? 'error'
                              : 'success'
                          "
                          variant="soft"
                        >
                          {{
                            item.borrow.daysOverdue >
                            0
                              ? `${item.borrow.daysOverdue} day(s) overdue`
                              : 'On time'
                          }}
                        </UBadge>

                        <UBadge
                          :color="
                            item.verified
                              ? 'success'
                              : 'warning'
                          "
                          variant="solid"
                        >
                          {{
                            item.verified
                              ? 'Ready to Return'
                              : 'Scan Required'
                          }}
                        </UBadge>
                      </div>

                      <div
                        v-if="
                          item.verified
                        "
                        class="mt-3 flex flex-wrap items-center gap-2"
                      >
                        <span
                          class="font-mono text-xs text-success"
                        >
                          Verified:
                          {{
                            item.verifiedBarcode
                          }}
                        </span>

                        <UButton
                          label="Undo Verification"
                          icon="i-lucide-x"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          @click="
                            removeVerification(
                              item,
                            )
                          "
                        />
                      </div>
                    </div>

                    <div
                      class="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-sm"
                    >
                      <div>
                        <p
                          class="text-xs text-muted"
                        >
                          Borrowed
                        </p>
                        <p
                          class="mt-1 font-medium text-highlighted"
                        >
                          {{
                            formatDate(
                              item.borrow
                                .borrowDate,
                            )
                          }}
                        </p>
                      </div>

                      <div>
                        <p
                          class="text-xs text-muted"
                        >
                          Due date
                        </p>
                        <p
                          class="mt-1 font-medium"
                          :class="
                            item.borrow
                              .daysOverdue > 0
                              ? 'text-error'
                              : 'text-highlighted'
                          "
                        >
                          {{
                            formatDate(
                              item.borrow
                                .dueDate,
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    class="mt-4 grid gap-4 border-t border-default pt-4 md:grid-cols-2"
                  >
                    <UFormField
                      label="Returned condition"
                      required
                    >
                      <USelect
                        v-model="
                          item.condition
                        "
                        :items="
                          conditionOptions
                        "
                        icon="i-lucide-shield-check"
                        class="w-full"
                        :disabled="
                          !item.verified
                        "
                      />
                    </UFormField>

                    <UFormField
                      label="Calculated fine"
                      description="Final amount is recalculated and enforced by the backend."
                    >
                      <div class="rounded-xl border border-default bg-elevated/50 px-4 py-3">
                        <p class="text-lg font-bold text-highlighted">{{ formatMoney(estimatedFine(item)) }}</p>
                        <p class="mt-1 text-xs text-muted">
                          {{ item.borrow.fine?.chargeableSchoolDays ?? 0 }} chargeable school day(s)
                          <span v-if="item.borrow.fine?.excludedWeekendDays"> • {{ item.borrow.fine.excludedWeekendDays }} weekend day(s) excluded</span>
                          <span v-if="item.borrow.fine?.excludedExceptionDays"> • {{ item.borrow.fine.excludedExceptionDays }} no-fine day(s) excluded</span>
                        </p>
                      </div>
                    </UFormField>

                    <UFormField
                      label="Return remarks"
                      hint="Optional"
                      class="md:col-span-2"
                    >
                      <UTextarea
                        v-model="
                          item.remarks
                        "
                        :rows="2"
                        autoresize
                        placeholder="Damage details, payment reference, or other notes"
                        class="w-full"
                        :disabled="
                          !item.verified
                        "
                      />
                    </UFormField>
                  </div>

                  <UAlert
                    v-if="
                      item.verified &&
                      (
                        item.condition ===
                          'Damaged' ||
                        item.condition ===
                          'Lost'
                      )
                    "
                    class="mt-4"
                    :color="
                      item.condition ===
                        'Lost'
                        ? 'error'
                        : 'warning'
                    "
                    variant="soft"
                    icon="i-lucide-triangle-alert"
                    :title="
                      item.condition ===
                        'Lost'
                        ? 'Copy will be marked Lost'
                        : 'Copy will be marked Damaged'
                    "
                    :description="
                      item.condition ===
                        'Lost'
                        ? 'This physical copy will no longer be available for circulation.'
                        : 'This physical copy will remain unavailable until its condition is updated.'
                    "
                  />
                </div>
              </div>
            </article>
          </div>

          <template #footer>
            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p
                class="text-sm text-muted"
              >
                {{
                  verifiedCount === 0
                    ? 'Scan at least one physical book barcode to continue.'
                    : `${verifiedCount} ${
                        verifiedCount === 1
                          ? 'verified book'
                          : 'verified books'
                      } will be returned. Unscanned books remain active.`
                }}
              </p>

              <UButton
                :label="
                  verifiedCount === 0
                    ? 'Return Verified'
                    : verifiedCount ===
                        returnItems.length
                      ? `Return All Verified (${verifiedCount})`
                      : `Return Verified (${verifiedCount})`
                "
                icon="i-lucide-check-check"
                color="success"
                size="lg"
                :loading="isProcessing"
                :disabled="!canProcess"
                @click="
                  processSelectedReturns
                "
              />
            </div>
          </template>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div
            class="flex items-center justify-between gap-4"
          >
            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Today's Processed Returns
              </h2>
              <p class="text-sm text-muted">
                Returns recorded during the current day.
              </p>
            </div>

            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              square
              :loading="isLoadingToday"
              aria-label="Refresh today's returns"
              @click="loadTodayReturns"
            />
          </div>
        </template>

        <div
          v-if="isLoadingToday"
          class="space-y-3"
        >
          <USkeleton
            v-for="item in 5"
            :key="item"
            class="h-16 w-full"
          />
        </div>

        <div
          v-else-if="
            todayRecords.length === 0
          "
          class="py-12 text-center"
        >
          <UIcon
            name="i-lucide-inbox"
            class="mx-auto size-9 text-dimmed"
          />

          <p
            class="mt-3 font-medium text-highlighted"
          >
            No returns processed today
          </p>

          <p class="mt-1 text-sm text-muted">
            Completed returns will appear here.
          </p>
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table
            class="w-full min-w-[900px] text-left"
          >
            <thead>
              <tr
                class="border-b border-default text-xs uppercase tracking-wide text-muted"
              >
                <th class="px-3 py-3">
                  Return
                </th>
                <th class="px-3 py-3">
                  Book
                </th>
                <th class="px-3 py-3">
                  Borrower
                </th>
                <th class="px-3 py-3">
                  Condition
                </th>
                <th class="px-3 py-3">
                  Fine
                </th>
                <th
                  class="px-3 py-3 text-right"
                >
                  Processed
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="
                  record in todayRecords
                "
                :key="
                  record.documentId
                "
                class="border-b border-default/60 last:border-0"
              >
                <td class="px-3 py-4">
                  <p
                    class="font-mono text-sm font-semibold text-highlighted"
                  >
                    {{
                      record.returnNo
                    }}
                  </p>

                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    Borrow no.
                    {{
                      record.borrowNo ||
                      '—'
                    }}
                  </p>
                </td>

                <td class="px-3 py-4">
                  <p
                    class="font-medium text-highlighted"
                  >
                    {{
                      record.title
                    }}
                  </p>

                  <p
                    class="mt-1 font-mono text-xs text-muted"
                  >
                    {{
                      record.controlNumber ||
                      record.accessionNumber ||
                      '—'
                    }}
                  </p>
                </td>

                <td class="px-3 py-4">
                  <p
                    class="font-medium text-highlighted"
                  >
                    {{
                      record.memberName
                    }}
                  </p>

                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    {{
                      record.memberIdentifier
                    }}
                    ·
                    {{
                      record.memberType
                    }}
                  </p>
                </td>

                <td class="px-3 py-4">
                  <UBadge
                    :color="
                      conditionColor(
                        record.condition,
                      )
                    "
                    variant="soft"
                  >
                    {{
                      record.condition
                    }}
                  </UBadge>
                </td>

                <td class="px-3 py-4">
                  {{
                    formatCurrency(
                      record.fineAmount,
                    )
                  }}
                </td>

                <td
                  class="px-3 py-4 text-right text-sm text-muted"
                >
                  {{
                    formatDateTime(
                      record.returnDate,
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
