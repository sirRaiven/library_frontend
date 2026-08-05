<script setup lang="ts">

import { appLogger } from "~/utils/app-logger";
import type {
  CirculationBookCopy,
  CirculationMember,
  RecentBorrow,
} from "~/composables/useLibraryCirculation";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";

definePageMeta({
  layout: "librarian",
  title: "Borrow Books",
});

const circulation = useLibraryCirculation();
const auth = useAuth();
const toast = useToast();

const scannerInput = ref("");
const member = ref<CirculationMember | null>(
  null,
);
const copies = ref<CirculationBookCopy[]>([]);
const recentTransactions = ref<RecentBorrow[]>(
  [],
);

const isScanning = ref(false);
const isConfirming = ref(false);
const isLoadingRecent = ref(false);
const remarks = ref("");

function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);

  return dateInputValue(date);
}

const dueDate = ref(defaultDueDate());

const currentStep = computed(() => {
  if (!member.value) {
    return 1;
  }

  if (copies.value.length === 0) {
    return 2;
  }

  return 3;
});

const scannerPlaceholder = computed(() =>
  member.value
    ? "Scan a book barcode or accession number"
    : "Scan a student or faculty barcode",
);

const cameraScannerTitle = computed(() =>
  member.value
    ? "Scan Book Barcode"
    : "Scan Member Barcode",
);

const cameraScannerDescription = computed(() =>
  member.value
    ? "Place the physical book copy barcode inside the guide."
    : "Place the student Library Card or Faculty ID barcode inside the guide.",
);

const remainingAfterSelection = computed(() =>
  Math.max(
    (member.value?.remainingSlots ?? 0) -
      copies.value.length,
    0,
  ),
);

const canConfirm = computed(
  () =>
    Boolean(member.value?.canBorrow) &&
    copies.value.length > 0 &&
    Boolean(dueDate.value) &&
    !isConfirming.value,
);

function focusScanner() {
  if (!import.meta.client) {
    return;
  }

  nextTick(() => {
    document
      .querySelector<HTMLInputElement>(
        "#borrow-scanner",
      )
      ?.focus();
  });
}

async function loadRecentTransactions() {
  isLoadingRecent.value = true;

  try {
    recentTransactions.value =
      await circulation.recentBorrows(8);
  } catch (error) {
    appLogger.warn(
      "Recent borrowing transactions could not be loaded.",
      error,
    );
  } finally {
    isLoadingRecent.value = false;
  }
}

async function scanMember(code: string) {
  const result =
    await circulation.lookupMember(code);

  member.value = result;
  copies.value = [];

  if (result.suggestedDueDate) {
    dueDate.value = result.suggestedDueDate;
  } else if (result.loanDays) {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + result.loanDays);
    dueDate.value = dateInputValue(nextDue);
  }

  if (!result.canBorrow) {
    toast.add({
      title: "Borrowing is not allowed",
      description:
        result.restrictionReason ||
        "The member is not currently eligible to borrow books.",
      color: "warning",
      icon: "i-lucide-shield-alert",
    });
  } else {
    toast.add({
      title: "Member verified",
      description: `${result.fullName} may borrow ${result.remainingSlots} more ${
        result.remainingSlots === 1
          ? "book"
          : "books"
      }.`,
      color: "success",
      icon: "i-lucide-user-check",
    });
  }
}

async function scanCopy(code: string) {
  if (!member.value) {
    return;
  }

  if (!member.value.canBorrow) {
    throw new Error(
      member.value.restrictionReason ||
        "This member cannot borrow books.",
    );
  }

  if (
    copies.value.length >=
    member.value.remainingSlots
  ) {
    throw new Error(
      "The member has reached the remaining borrowing limit.",
    );
  }

  const result =
    await circulation.lookupCopy(code);

  if (
    copies.value.some(
      (copy) =>
        copy.documentId === result.documentId,
    )
  ) {
    toast.add({
      title: "Already scanned",
      description:
        `${result.controlNumber} is already in this transaction.`,
      color: "warning",
      icon: "i-lucide-copy-check",
    });

    return;
  }

  if (!result.available) {
    throw new Error(
      `${result.controlNumber} is currently ${result.status.toLowerCase()} and cannot be borrowed.`,
    );
  }

  copies.value.push(result);

  toast.add({
    title: "Book added",
    description: result.book.title,
    color: "success",
    icon: "i-lucide-book-check",
  });
}

async function handleCameraBarcodeDetected(
  result: BarcodeScanResult,
) {
  const code = result.value
    .trim()
    .toUpperCase();

  if (
    !code ||
    isScanning.value ||
    isConfirming.value
  ) {
    return;
  }

  scannerInput.value = code;

  await nextTick();
  await handleScan();
}

async function handleScan() {
  const code = scannerInput.value
    .trim()
    .toUpperCase();

  if (!code || isScanning.value) {
    return;
  }

  isScanning.value = true;

  try {
    if (!member.value) {
      await scanMember(code);
    } else {
      await scanCopy(code);
    }
  } catch (error) {
    toast.add({
      title: member.value
        ? "Book could not be added"
        : "Member was not found",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    scannerInput.value = "";
    isScanning.value = false;
    focusScanner();
  }
}

function removeCopy(documentId: string) {
  copies.value = copies.value.filter(
    (copy) => copy.documentId !== documentId,
  );

  focusScanner();
}

function clearTransaction() {
  member.value = null;
  copies.value = [];
  remarks.value = "";
  dueDate.value = defaultDueDate();
  scannerInput.value = "";
  focusScanner();
}

async function confirmBorrowing() {
  if (!member.value || !canConfirm.value) {
    return;
  }

  isConfirming.value = true;

  try {
    const result =
      await circulation.borrowBooks({
        memberType: member.value.type,
        memberDocumentId:
          member.value.documentId,
        copyDocumentIds: copies.value.map(
          (copy) => copy.documentId,
        ),
        dueDate: dueDate.value,
        remarks: remarks.value.trim(),
      });

    toast.add({
      title: "Borrowing completed",
      description: (() => {
        const fulfilled = result.transactions
          .map((transaction) => transaction.fulfilledReservationNo)
          .filter(Boolean);
        const base = `${result.transactions.length} ${
          result.transactions.length === 1
            ? "book was"
            : "books were"
        } issued under ${result.checkoutReference}.`;
        return fulfilled.length > 0
          ? `${base} Reserved request ${fulfilled.join(", ")} was completed automatically.`
          : base;
      })(),
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    clearTransaction();
    await loadRecentTransactions();
  } catch (error) {
    toast.add({
      title: "Borrowing failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isConfirming.value = false;
    focusScanner();
  }
}

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function statusColor(
  status: string,
):
  | "success"
  | "warning"
  | "error"
  | "neutral" {
  if (status === "Borrowed") {
    return "success";
  }

  if (status === "Overdue") {
    return "error";
  }

  return "neutral";
}

onMounted(() => {
  focusScanner();
  void loadRecentTransactions();
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
              Borrow Books
            </h1>

            <UBadge
              color="success"
              variant="soft"
            >
              Scanner workflow
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm text-muted"
          >
            Scan the member once, scan all
            physical copies, then confirm the
            transaction.
          </p>
        </div>

        <UButton
          to="/librarian/reservations"
          label="View Reservations"
          icon="i-lucide-calendar-check-2"
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
                    Scanner
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Use a hardware scanner, camera, or manual entry.
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
                  id="borrow-scanner"
                  v-model="scannerInput"
                  :placeholder="scannerPlaceholder"
                  icon="i-lucide-barcode"
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
                    isConfirming
                  "
                  :title="cameraScannerTitle"
                  button-label="Use Camera"
                  :ready-description="
                    cameraScannerDescription
                  "
                  processing-label="Checking barcode"
                  processing-description="Please wait while the member or book copy is being verified."
                  storage-key="sncbt-borrowing-camera"
                  :duplicate-cooldown-ms="5000"
                  :detection-hold-ms="800"
                  @detected="
                    handleCameraBarcodeDetected
                  "
                />
              </div>

              <UButton
                type="submit"
                label="Process Scan"
                icon="i-lucide-scan-barcode"
                color="success"
                block
                :loading="isScanning"
                :disabled="
                  !scannerInput.trim() ||
                  isScanning
                "
              />
            </form>

            <div
              class="mt-6 space-y-3 border-t border-default pt-5"
            >
              <p
                class="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Workflow
              </p>

              <div
                v-for="step in [
                  {
                    number: 1,
                    label: 'Scan member',
                    icon: 'i-lucide-user-round-check',
                  },
                  {
                    number: 2,
                    label: 'Scan book copies',
                    icon: 'i-lucide-library',
                  },
                  {
                    number: 3,
                    label: 'Review and confirm',
                    icon: 'i-lucide-circle-check-big',
                  },
                ]"
                :key="step.number"
                class="flex items-center gap-3 rounded-xl border p-3"
                :class="
                  currentStep === step.number
                    ? 'border-success/30 bg-success/5'
                    : currentStep > step.number
                      ? 'border-default bg-elevated/60'
                      : 'border-default'
                "
              >
                <div
                  class="flex size-8 items-center justify-center rounded-lg"
                  :class="
                    currentStep >= step.number
                      ? 'bg-success/10 text-success'
                      : 'bg-elevated text-dimmed'
                  "
                >
                  <UIcon
                    :name="
                      currentStep > step.number
                        ? 'i-lucide-check'
                        : step.icon
                    "
                    class="size-4"
                  />
                </div>

                <span
                  class="text-sm font-medium"
                  :class="
                    currentStep === step.number
                      ? 'text-highlighted'
                      : 'text-muted'
                  "
                >
                  {{ step.label }}
                </span>
              </div>
            </div>
          </UCard>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-lightbulb"
            title="Fast checkout"
            description="Use a hardware scanner, the camera button, or manual entry. After a member is verified, the same scanner automatically switches to book-copy scanning."
          />
        </div>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Borrower
                  </h2>
                  <p
                    class="text-sm text-muted"
                  >
                    Verify identity and borrowing
                    eligibility.
                  </p>
                </div>

                <UButton
                  v-if="member"
                  label="Change Member"
                  icon="i-lucide-user-round-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="clearTransaction"
                />
              </div>
            </template>

            <div
              v-if="member"
              class="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <UAvatar
                :alt="member.fullName"
                :text="
                  member.fullName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                "
                size="xl"
              />

              <div class="min-w-0">
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <h3
                    class="truncate text-lg font-bold text-highlighted"
                  >
                    {{ member.fullName }}
                  </h3>

                  <UBadge
                    :color="
                      member.canBorrow
                        ? 'success'
                        : 'error'
                    "
                    variant="soft"
                  >
                    {{
                      member.canBorrow
                        ? "Eligible"
                        : "Restricted"
                    }}
                  </UBadge>
                </div>

                <p
                  class="mt-1 font-mono text-sm text-muted"
                >
                  {{ member.identifier }} ·
                  {{ member.type }}
                </p>

                <p
                  v-if="
                    member.programOrDepartment
                  "
                  class="mt-2 text-sm text-muted"
                >
                  {{
                    member.programOrDepartment
                  }}
                </p>
              </div>

              <div
                class="grid grid-cols-2 gap-3 md:grid-cols-1"
              >
                <div
                  class="rounded-xl bg-elevated p-3 text-center"
                >
                  <p
                    class="text-xl font-bold text-highlighted"
                  >
                    {{
                      member.remainingSlots
                    }}
                  </p>
                  <p
                    class="text-xs text-muted"
                  >
                    Remaining
                  </p>
                </div>

                <div
                  class="rounded-xl bg-elevated p-3 text-center"
                >
                  <p
                    class="text-xl font-bold text-highlighted"
                  >
                    {{
                      member.activeBorrowCount
                    }}
                  </p>
                  <p
                    class="text-xs text-muted"
                  >
                    Active
                  </p>
                </div>
              </div>
            </div>

            <UAlert
              v-if="member && !member.canBorrow"
              class="mt-5"
              color="warning"
              variant="soft"
              icon="i-lucide-shield-alert"
              title="Borrowing is currently restricted"
              :description="
                member.restrictionReason ||
                'Review the member profile, active membership, enrollment verification, overdue records, and borrowing limit.'
              "
            />

            <div
              v-else-if="!member"
              class="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/40 p-6 text-center"
            >
              <div
                class="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted"
              >
                <UIcon
                  name="i-lucide-user-search"
                  class="size-6"
                />
              </div>

              <p
                class="mt-4 font-semibold text-highlighted"
              >
                No member selected
              </p>
              <p
                class="mt-1 max-w-sm text-sm text-muted"
              >
                Scan a student or faculty barcode
                to begin the checkout.
              </p>
            </div>
          </UCard>

          <UCard v-if="member">
            <template #header>
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Books for Checkout
                  </h2>
                  <p
                    class="text-sm text-muted"
                  >
                    {{ copies.length }} scanned ·
                    {{ remainingAfterSelection }}
                    remaining after confirmation
                  </p>
                </div>

                <UBadge
                  color="neutral"
                  variant="soft"
                  size="lg"
                >
                  {{ copies.length }}
                  {{
                    copies.length === 1
                      ? "copy"
                      : "copies"
                  }}
                </UBadge>
              </div>
            </template>

            <div
              v-if="copies.length"
              class="space-y-3"
            >
              <div
                v-for="copy in copies"
                :key="copy.documentId"
                class="flex flex-col gap-4 rounded-xl border border-default p-4 sm:flex-row sm:items-center"
              >
                <div
                  class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                >
                  <UIcon
                    name="i-lucide-book-check"
                    class="size-5"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <p
                    class="truncate font-semibold text-highlighted"
                  >
                    {{ copy.book.title }}
                  </p>
                  <p
                    class="mt-1 truncate text-sm text-muted"
                  >
                    {{ copy.book.author }}
                  </p>
                  <div
                    class="mt-2 flex flex-wrap gap-2"
                  >
                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ copy.controlNumber }}
                    </UBadge>
                    <UBadge
                      color="success"
                      variant="soft"
                    >
                      Available
                    </UBadge>
                    <span
                      class="text-xs text-muted"
                    >
                      Shelf
                      {{
                        copy.shelfLocation ||
                        "Not assigned"
                      }}
                    </span>
                  </div>
                </div>

                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  square
                  aria-label="Remove book"
                  @click="
                    removeCopy(copy.documentId)
                  "
                />
              </div>
            </div>

            <div
              v-else
              class="rounded-xl border border-dashed border-default p-8 text-center"
            >
              <UIcon
                name="i-lucide-scan-barcode"
                class="mx-auto size-8 text-dimmed"
              />
              <p
                class="mt-3 font-medium text-highlighted"
              >
                Scan the first book
              </p>
              <p
                class="mt-1 text-sm text-muted"
              >
                The physical copy must have an
                Available status.
              </p>
            </div>

            <div
              class="mt-6 grid gap-5 border-t border-default pt-5 md:grid-cols-2"
            >
              <UFormField
                label="Due date"
                required
              >
                <UInput
                  v-model="dueDate"
                  type="date"
                  icon="i-lucide-calendar-days"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Transaction remarks"
                hint="Optional"
              >
                <UInput
                  v-model="remarks"
                  icon="i-lucide-message-square-text"
                  placeholder="Add a short note"
                  class="w-full"
                />
              </UFormField>
            </div>

            <template #footer>
              <div
                class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
              >
                <UButton
                  label="Cancel Transaction"
                  color="neutral"
                  variant="ghost"
                  :disabled="isConfirming"
                  @click="clearTransaction"
                />

                <UButton
                  label="Confirm Borrowing"
                  icon="i-lucide-check"
                  color="success"
                  :loading="isConfirming"
                  :disabled="!canConfirm"
                  @click="confirmBorrowing"
                />
              </div>
            </template>
          </UCard>
        </div>
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
                Recent Borrowing Activity
              </h2>
              <p class="text-sm text-muted">
                Latest completed checkout records.
              </p>
            </div>

            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              square
              :loading="isLoadingRecent"
              aria-label="Refresh recent borrowing activity"
              @click="loadRecentTransactions"
            />
          </div>
        </template>

        <div
          v-if="isLoadingRecent"
          class="space-y-3"
        >
          <USkeleton
            v-for="item in 4"
            :key="item"
            class="h-16 w-full"
          />
        </div>

        <div
          v-else-if="
            recentTransactions.length === 0
          "
          class="py-10 text-center"
        >
          <UIcon
            name="i-lucide-history"
            class="mx-auto size-8 text-dimmed"
          />
          <p
            class="mt-3 font-medium text-highlighted"
          >
            No borrowing transactions yet
          </p>
        </div>

        <div v-else class="divide-y divide-default">
          <div
            v-for="transaction in recentTransactions"
            :key="transaction.documentId"
            class="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div class="min-w-0">
              <p
                class="truncate font-semibold text-highlighted"
              >
                {{ transaction.title }}
              </p>
              <p
                class="mt-1 font-mono text-xs text-muted"
              >
                {{ transaction.controlNumber }}
                · {{ transaction.borrowNo }}
              </p>
            </div>

            <div class="min-w-0">
              <p
                class="truncate text-sm font-medium text-highlighted"
              >
                {{ transaction.memberName }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{ transaction.memberType }} ·
                {{ transaction.memberIdentifier }}
              </p>
            </div>

            <div
              class="flex items-center gap-3 md:justify-end"
            >
              <div class="text-right text-xs text-muted">
                <p>
                  Due
                  {{
                    formatDate(
                      transaction.dueDate,
                    )
                  }}
                </p>
              </div>

              <UBadge
                :color="
                  statusColor(
                    transaction.status,
                  )
                "
                variant="soft"
              >
                {{ transaction.status }}
              </UBadge>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
