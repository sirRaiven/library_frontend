<script setup lang="ts">
import type {
  ReturnLookup,
  TodayReturn,
} from "~/composables/useLibraryCirculation";

definePageMeta({
  layout: "librarian",
  title: "Return Books",
});

type ReturnCondition =
  | "Good"
  | "Damaged"
  | "Lost";

const circulation = useLibraryCirculation();
const auth = useAuth();
const toast = useToast();

const scannerInput = ref("");
const activeReturn = ref<ReturnLookup | null>(
  null,
);
const todayRecords = ref<TodayReturn[]>([]);

const condition = ref<ReturnCondition>("Good");
const fineAmount = ref(0);
const remarks = ref("");

const isScanning = ref(false);
const isProcessing = ref(false);
const isLoadingToday = ref(false);

const conditionOptions: ReturnCondition[] = [
  "Good",
  "Damaged",
  "Lost",
];

const canProcess = computed(
  () =>
    Boolean(activeReturn.value) &&
    !isProcessing.value &&
    Number(fineAmount.value) >= 0,
);

function focusScanner() {
  if (!import.meta.client) {
    return;
  }

  nextTick(() => {
    document
      .querySelector<HTMLInputElement>(
        "#return-scanner",
      )
      ?.focus();
  });
}

function resetReturn() {
  activeReturn.value = null;
  scannerInput.value = "";
  condition.value = "Good";
  fineAmount.value = 0;
  remarks.value = "";
  focusScanner();
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

async function handleScan() {
  const barcode = scannerInput.value
    .trim()
    .toUpperCase();

  if (!barcode || isScanning.value) {
    return;
  }

  isScanning.value = true;

  try {
    activeReturn.value =
      await circulation.lookupReturn(barcode);

    condition.value = "Good";
    fineAmount.value = 0;
    remarks.value = "";

    toast.add({
      title: "Active borrowing found",
      description:
        activeReturn.value.copy.book.title,
      color: "success",
      icon: "i-lucide-book-open-check",
    });
  } catch (error) {
    activeReturn.value = null;

    toast.add({
      title: "Return could not be started",
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

async function processReturn() {
  if (!activeReturn.value || !canProcess.value) {
    return;
  }

  isProcessing.value = true;

  try {
    const result =
      await circulation.processReturn({
        borrowDocumentId:
          activeReturn.value.borrowDocumentId,
        condition: condition.value,
        fineAmount: Number(
          fineAmount.value,
        ),
        remarks: remarks.value.trim(),
      });

    toast.add({
      title: "Return completed",
      description: `${result.returnNo} was recorded. The copy is now ${result.copyStatus}.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    resetReturn();
    await loadTodayReturns();
  } catch (error) {
    toast.add({
      title: "Return failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isProcessing.value = false;
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

function formatDateTime(value?: string): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
    },
  ).format(value || 0);
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

  if (value === "Damaged") {
    return "warning";
  }

  if (value === "Lost") {
    return "error";
  }

  return "neutral";
}

onMounted(() => {
  focusScanner();
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
              One-scan lookup
            </UBadge>
          </div>

          <p
            class="mt-1 max-w-3xl text-sm text-muted"
          >
            Scan the physical-copy barcode. The
            system retrieves the active borrowing
            record and borrower automatically.
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
                    name="i-lucide-scan-barcode"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Scan Returned Book
                  </h2>
                  <p
                    class="text-xs text-muted"
                  >
                    Barcode or accession number
                  </p>
                </div>
              </div>
            </template>

            <form
              class="space-y-4"
              @submit.prevent="handleScan"
            >
              <UInput
                id="return-scanner"
                v-model="scannerInput"
                icon="i-lucide-barcode"
                placeholder="Scan LIB-2026-0001"
                size="xl"
                color="success"
                autocomplete="off"
                autofocus
                :loading="isScanning"
                class="w-full"
              >
                <template #trailing>
                  <UKbd>Enter</UKbd>
                </template>
              </UInput>

              <UButton
                type="submit"
                label="Find Active Borrowing"
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

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-receipt-text"
            title="Fine handling"
            description="The system reports overdue days, but the librarian enters the actual fine according to the institution's approved policy."
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
                    Return Review
                  </h2>
                  <p
                    class="text-sm text-muted"
                  >
                    Confirm the borrower, book,
                    condition, and fine.
                  </p>
                </div>

                <UButton
                  v-if="activeReturn"
                  label="Clear"
                  icon="i-lucide-rotate-ccw"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="resetReturn"
                />
              </div>
            </template>

            <div
              v-if="activeReturn"
              class="space-y-6"
            >
              <div
                class="grid gap-4 md:grid-cols-2"
              >
                <div
                  class="rounded-xl border border-default bg-elevated/40 p-4"
                >
                  <div
                    class="flex items-start gap-3"
                  >
                    <div
                      class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                    >
                      <UIcon
                        name="i-lucide-book-open-check"
                        class="size-5"
                      />
                    </div>

                    <div class="min-w-0">
                      <p
                        class="truncate font-semibold text-highlighted"
                      >
                        {{
                          activeReturn.copy.book
                            .title
                        }}
                      </p>
                      <p
                        class="mt-1 truncate text-sm text-muted"
                      >
                        {{
                          activeReturn.copy.book
                            .author
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
                            activeReturn.copy
                              .controlNumber
                          }}
                        </UBadge>
                        <UBadge
                          :color="
                            activeReturn.daysOverdue >
                            0
                              ? 'error'
                              : 'success'
                          "
                          variant="soft"
                        >
                          {{
                            activeReturn.daysOverdue >
                            0
                              ? `${activeReturn.daysOverdue} day(s) overdue`
                              : "On time"
                          }}
                        </UBadge>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="rounded-xl border border-default bg-elevated/40 p-4"
                >
                  <div
                    class="flex items-start gap-3"
                  >
                    <UAvatar
                      :alt="
                        activeReturn.member
                          .fullName
                      "
                      :text="
                        activeReturn.member.fullName
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')
                      "
                      size="md"
                    />

                    <div class="min-w-0">
                      <p
                        class="truncate font-semibold text-highlighted"
                      >
                        {{
                          activeReturn.member
                            .fullName
                        }}
                      </p>
                      <p
                        class="mt-1 font-mono text-sm text-muted"
                      >
                        {{
                          activeReturn.member
                            .identifier
                        }}
                        ·
                        {{
                          activeReturn.member.type
                        }}
                      </p>
                      <p
                        class="mt-2 text-xs text-muted"
                      >
                        Borrow no.
                        {{
                          activeReturn.borrowNo
                        }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                class="grid gap-4 rounded-xl border border-default p-4 sm:grid-cols-3"
              >
                <div>
                  <p class="text-xs text-muted">
                    Borrowed
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-highlighted"
                  >
                    {{
                      formatDate(
                        activeReturn.borrowDate,
                      )
                    }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted">
                    Due date
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold"
                    :class="
                      activeReturn.daysOverdue > 0
                        ? 'text-error'
                        : 'text-highlighted'
                    "
                  >
                    {{
                      formatDate(
                        activeReturn.dueDate,
                      )
                    }}
                  </p>
                </div>

                <div>
                  <p class="text-xs text-muted">
                    Shelf
                  </p>
                  <p
                    class="mt-1 text-sm font-semibold text-highlighted"
                  >
                    {{
                      activeReturn.copy
                        .shelfLocation ||
                      "Not assigned"
                    }}
                  </p>
                </div>
              </div>

              <div
                class="grid gap-5 md:grid-cols-2"
              >
                <UFormField
                  label="Returned condition"
                  description="This updates the physical copy status."
                  required
                >
                  <USelect
                    v-model="condition"
                    :items="conditionOptions"
                    icon="i-lucide-shield-check"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Fine amount"
                  description="Use 0.00 when no fine applies."
                  required
                >
                  <UInputNumber
                    v-model="fineAmount"
                    :min="0"
                    :step="0.01"
                    icon="i-lucide-philippine-peso"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Return remarks"
                  hint="Optional"
                  class="md:col-span-2"
                >
                  <UTextarea
                    v-model="remarks"
                    :rows="3"
                    autoresize
                    placeholder="Damage details, payment reference, or other notes"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UAlert
                v-if="
                  condition === 'Damaged' ||
                  condition === 'Lost'
                "
                :color="
                  condition === 'Lost'
                    ? 'error'
                    : 'warning'
                "
                variant="soft"
                icon="i-lucide-triangle-alert"
                :title="
                  condition === 'Lost'
                    ? 'Copy will be marked Lost'
                    : 'Copy will be marked Damaged'
                "
                :description="
                  condition === 'Lost'
                    ? 'The copy will no longer appear as available for circulation.'
                    : 'The copy will remain unavailable until its condition is updated.'
                "
              />
            </div>

            <div
              v-else
              class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30 p-8 text-center"
            >
              <div
                class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted"
              >
                <UIcon
                  name="i-lucide-book-down"
                  class="size-7"
                />
              </div>
              <p
                class="mt-4 font-semibold text-highlighted"
              >
                Waiting for a returned book
              </p>
              <p
                class="mt-1 max-w-md text-sm text-muted"
              >
                Scan the physical-copy barcode to
                retrieve its active borrowing
                transaction.
              </p>
            </div>

            <template #footer>
              <div
                class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
              >
                <UButton
                  label="Cancel"
                  color="neutral"
                  variant="ghost"
                  :disabled="
                    !activeReturn ||
                    isProcessing
                  "
                  @click="resetReturn"
                />

                <UButton
                  label="Complete Return"
                  icon="i-lucide-check"
                  color="success"
                  :loading="isProcessing"
                  :disabled="!canProcess"
                  @click="processReturn"
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
                Today's Processed Returns
              </h2>
              <p class="text-sm text-muted">
                Returns recorded during the current
                day.
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
          v-else-if="todayRecords.length === 0"
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
                <th class="px-3 py-3 text-right">
                  Processed
                </th>
              </tr>
            </thead>

            <tbody
              class="divide-y divide-default"
            >
              <tr
                v-for="record in todayRecords"
                :key="record.documentId"
                class="transition-colors hover:bg-elevated/50"
              >
                <td class="px-3 py-4">
                  <p
                    class="font-mono text-sm font-semibold text-highlighted"
                  >
                    {{ record.returnNo }}
                  </p>
                  <p
                    class="mt-1 font-mono text-xs text-muted"
                  >
                    {{ record.controlNumber }}
                  </p>
                </td>

                <td class="px-3 py-4">
                  <p
                    class="max-w-64 truncate text-sm font-semibold text-highlighted"
                  >
                    {{ record.title }}
                  </p>
                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    Borrow no.
                    {{ record.borrowNo }}
                  </p>
                </td>

                <td class="px-3 py-4">
                  <p
                    class="text-sm font-medium text-highlighted"
                  >
                    {{ record.memberName }}
                  </p>
                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    {{ record.memberType }} ·
                    {{
                      record.memberIdentifier
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
                    {{ record.condition }}
                  </UBadge>
                </td>

                <td class="px-3 py-4">
                  <span
                    class="text-sm font-semibold"
                    :class="
                      record.fineAmount > 0
                        ? 'text-warning'
                        : 'text-muted'
                    "
                  >
                    {{
                      formatCurrency(
                        record.fineAmount,
                      )
                    }}
                  </span>
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
