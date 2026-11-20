
<script setup lang="ts">
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import type {
  LibraryVisitMemberType,
  LibraryVisitRecord,
  LibraryVisitSummary,
} from "~/composables/useLibraryVisits";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";

definePageMeta({
  layout: "librarian",
  title: "Library Visits",
});

const workspace = useLibrarianWorkspace();
const visitsApi =
  useLibraryVisits();
const auth = useAuth();
const toast = useToast();

const scanInputWrapper =
  ref<HTMLElement | null>(
    null,
  );
const barcode = ref("");
const scanning = ref(false);
const loading = ref(false);
const recordsError = ref("");
const search = ref("");
const memberType =
  ref<
    | LibraryVisitMemberType
    | "all"
  >("all");
const page = ref(1);
const pageSize = 12;

function philippineDate(
  value = new Date(),
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    )
      .formatToParts(value)
      .reduce<
        Record<string, string>
      >(
        (result, part) => {
          result[part.type] =
            part.value;
          return result;
        },
        {},
      );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

const fromDate =
  ref(philippineDate());
const toDate =
  ref(philippineDate());

const recentVisits =
  ref<LibraryVisitRecord[]>(
    [],
  );
const lastScan =
  ref<LibraryVisitRecord | null>(
    null,
  );
const summary =
  ref<LibraryVisitSummary>({
    totalVisits: 0,
    studentVisits: 0,
    facultyVisits: 0,
    uniqueVisitors: 0,
    busiestHour: null,
    firstEntryAt: null,
    latestEntryAt: null,
  });

const pagination = reactive({
  page: 1,
  pageSize,
  pageCount: 1,
  total: 0,
});

const memberTypeItems = [
  {
    label:
      "All Member Types",
    value: "all",
  },
  {
    label: "Students",
    value: "Student",
  },
  {
    label: "Faculty",
    value: "Faculty",
  },
];

const columns = [
  {
    id: "time",
    header: "Time In",
  },
  {
    id: "member",
    header: "Member",
  },
  {
    id: "memberType",
    header: "Type",
  },
  {
    id: "programDepartment",
    header:
      "Program / Department",
  },
  {
    accessorKey: "barcode",
    header: "Barcode",
  },
  {
    accessorKey: "recordedBy",
    header: "Recorded By",
  },
  {
    id: "actions",
    header: "Actions",
  },
];

const summaryCards = computed(() => [
  { label: "Entries in Period", value: summary.value.totalVisits },
  { label: "Student Visits", value: summary.value.studentVisits },
  { label: "Faculty Visits", value: summary.value.facultyVisits },
  { label: "Unique Visitors", value: summary.value.uniqueVisitors },
]);

function studentRecordPath(visit: LibraryVisitRecord): string | null {
  if (visit.memberType !== "Student" || !visit.memberDocumentId) {
    return null;
  }

  return `/librarian/students/${encodeURIComponent(visit.memberDocumentId)}/record`;
}

function focusScanner() {
  nextTick(() => {
    if (workspace.value !== "work") return;
    const input =
      scanInputWrapper.value
        ?.querySelector(
          "input",
        );

    if (
      !(input instanceof
        HTMLInputElement)
    ) {
      return;
    }

    input.focus();
    input.select();
  });
}

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        timeZone:
          "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      },
    )
    .format(
      new Date(value),
    );
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        timeZone:
          "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "medium",
      },
    )
    .format(
      new Date(value),
    );
}

function memberInitials(
  record: LibraryVisitRecord,
) {
  return record.memberName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0),
    )
    .join("")
    .toUpperCase();
}

let visitRequest = 0;

async function loadVisits() {
  if (workspace.value !== "records") return;
  const request = ++visitRequest;
  loading.value = true;
  recordsError.value = "";

  try {
    const response =
      await visitsApi.list({
        from:
          fromDate.value,
        to:
          toDate.value,
        memberType:
          memberType.value,
        search:
          settledSearch.value,
        page: page.value,
        pageSize,
      });

    if (request !== visitRequest) return;
    recentVisits.value = response.data;

    Object.assign(
      pagination,
      response.meta
        .pagination,
    );

    summary.value =
      response.meta.summary;
  } catch (error) {
    if (request !== visitRequest) return;
    recordsError.value = auth.getErrorMessage(error);
  } finally {
    if (request === visitRequest) loading.value = false;
  }
}

async function recordTimeIn() {
  const value =
    barcode.value.trim();

  if (!value) {
    focusScanner();
    return;
  }

  scanning.value = true;

  try {
    const record =
      await visitsApi
        .timeIn(value);

    lastScan.value =
      record;
    barcode.value = "";

    toast.add({
      title:
        record.duplicate
          ? "Member already timed in"
          : "Library entry recorded",
      description:
        record.duplicate
          ? `${record.memberName} was already recorded at ${formatTime(
              record.timeIn,
            )}.`
          : `${record.memberName} timed in at ${formatTime(
              record.timeIn,
            )}.`,
      color:
        record.duplicate
          ? "warning"
          : "success",
      icon:
        record.duplicate
          ? "i-lucide-copy-check"
          : "i-lucide-circle-check",
    });

  } catch (error) {
    lastScan.value =
      null;

    toast.add({
      title:
        "Time-in was not recorded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    scanning.value = false;
    focusScanner();
  }
}

async function handleCameraBarcode(
  result: BarcodeScanResult,
) {
  if (scanning.value) {
    return;
  }

  barcode.value = result.value;
  await nextTick();
  await recordTimeIn();
}

function resetToday() {
  const today = philippineDate();
  fromDate.value = today;
  toDate.value = today;
  memberType.value = "all";
  search.value = "";
  page.value = 1;
}

const settledSearch = ref("");
watch(search, (value, _, onCleanup) => {
  if (!value) {
    settledSearch.value = "";
    return;
  }
  const timer = setTimeout(() => { settledSearch.value = value; }, 350);
  onCleanup(() => clearTimeout(timer));
});

watch([fromDate, toDate, memberType, settledSearch], () => {
  if (page.value === 1) void loadVisits();
  else page.value = 1;
});
watch(page, () => void loadVisits());
watch(workspace, (value) => {
  if (value === "records") void loadVisits();
});
onMounted(() => {
  if (workspace.value === "records") void loadVisits();
  else focusScanner();
});
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-staff-page sncbt-specialist-page">
    <div
      class="sncbt-staff-content w-full space-y-6 mb-12"
    >
      <LibrarianPageHeader
        :report-period="{ from: fromDate, to: toDate }"
        eyebrow="Library Services"
        title="Library Visits"
        description="Record Library entry by scanning a Student Library Card or Faculty institutional ID. Each accepted scan creates one visit record."
        icon="i-lucide-scan-line"
      />
      <LibrarianWorkspaceTabs v-model="workspace" work-label="Record Time-In" records-label="Visit Records">
        <template #work>
          <UCard
            class="sncbt-scanner-station overflow-hidden border-success/30"
          >
            <template #header>
              <div
                class="flex items-center gap-3"
              >
                <div
                  class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success"
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
                    Scan Member Card
                  </h2>

                  <p
                    class="text-sm text-muted"
                  >
                    Hardware scanners normally submit by pressing Enter. The field automatically refocuses after every scan.
                  </p>
                </div>
              </div>
            </template>

            <form
              class="sncbt-scanner-row grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              @submit.prevent="
                recordTimeIn
              "
            >
              <div
                ref="scanInputWrapper"
                class="w-full"
              >
                <UInput
                  v-model="barcode"
                  aria-label="Student library card or faculty ID barcode"
                  icon="i-lucide-scan-barcode"
                  placeholder="Scan Student Library Card or Faculty ID barcode"
                  autocomplete="off"
                  size="xl"
                  class="w-full"
                  :disabled="scanning"
                />
              </div>

              <LiveBarcodeScanner
                :disabled="scanning"
                @detected="handleCameraBarcode"
              />

              <UButton
                type="submit"
                label="Record Time-In"
                icon="i-lucide-log-in"
                color="primary"
                size="xl"
                :loading="scanning"
              />
            </form>

            <details class="mt-4 text-sm text-muted">
              <summary class="w-fit cursor-pointer font-medium text-default">Who can check in?</summary>
              <p class="mt-2 max-w-2xl">
                Students need an active profile and semester membership. Faculty need an active faculty profile. Duplicate scans within 60 seconds are ignored.
              </p>
            </details>
          </UCard>

          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="translate-y-2 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
          >
            <UCard
              v-if="lastScan"
              :class="
                lastScan.duplicate
                  ? 'border-warning/40'
                  : 'border-success/40'
              "
            >
              <div
                class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div
                  class="flex min-w-0 items-center gap-4"
                >
                  <UAvatar
                    :src="
                      lastScan.member
                        ?.photoUrl ??
                      undefined
                    "
                    :text="
                      memberInitials(
                        lastScan,
                      )
                    "
                    :alt="
                      lastScan.memberName
                    "
                    size="2xl"
                  />

                  <div
                    class="min-w-0"
                  >
                    <div
                      class="flex flex-wrap items-center gap-2"
                    >
                      <h2
                        class="truncate text-xl font-bold text-highlighted"
                      >
                        {{
                          lastScan.memberName
                        }}
                      </h2>

                      <UBadge
                        :color="
                          lastScan.duplicate
                            ? 'warning'
                            : 'success'
                        "
                        variant="soft"
                      >
                        {{
                          lastScan.duplicate
                            ? "Already Recorded"
                            : "Time-In Successful"
                        }}
                      </UBadge>
                    </div>

                    <p
                      class="mt-1 text-sm text-muted"
                    >
                      {{
                        lastScan.memberType
                      }}
                      ·
                      {{
                        lastScan.memberIdentifier
                      }}
                      ·
                      {{
                        lastScan.programDepartment
                      }}
                    </p>

                    <p
                      class="mt-2 font-mono text-xs text-dimmed"
                    >
                      {{
                        lastScan.barcode
                      }}
                    </p>
                  </div>
                </div>

                <div
                  class="rounded-2xl bg-elevated px-6 py-4 text-center lg:min-w-56"
                >
                  <p
                    class="text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    Recorded Time
                  </p>

                  <p
                    class="mt-1 text-2xl font-bold text-highlighted"
                  >
                    {{
                      formatTime(
                        lastScan.timeIn,
                      )
                    }}
                  </p>

                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    {{
                      lastScan.visitNo
                    }}
                  </p>
                </div>
              </div>
            </UCard>
          </Transition>
        </template>

        <template #records>
          <dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-default bg-default p-4 sm:grid-cols-4" aria-label="Visit summary" :aria-busy="loading">
            <div v-for="card in summaryCards" :key="card.label" class="min-w-0">
              <dt class="text-xs font-medium text-muted">{{ card.label }}</dt>
              <dd class="mt-1 text-xl font-semibold tabular-nums text-highlighted">{{ loading || recordsError ? '—' : card.value }}</dd>
            </div>
          </dl>

          <UCard>
            <template #header>
              <div
                class="space-y-4"
              >
                <div
                  class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <h2
                      class="font-semibold text-highlighted"
                    >
                      Library Visit Records
                    </h2>

                    <p
                      class="mt-1 text-sm text-muted"
                    >
                      A permanent attendance record is kept for every accepted card scan.
                    </p>
                  </div>

                  <UButton
                    label="Reset to Today"
                    icon="i-lucide-calendar-days"
                    color="neutral"
                    variant="outline"
                    @click="resetToday"
                  />
                </div>

                <div
                  class="sncbt-specialist-filters grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_12rem]"
                >
                  <UInput
                    v-model="search"
                    icon="i-lucide-search"
                    placeholder="Search member, number, barcode, or program"
                    aria-label="Search Library visits"
                    class="w-full"
                  />

                  <UInput
                    v-model="fromDate"
                    type="date"
                    icon="i-lucide-calendar-range"
                    aria-label="Library visits from date"
                    class="w-full"
                  />

                  <UInput
                    v-model="toDate"
                    type="date"
                    icon="i-lucide-calendar-range"
                    aria-label="Library visits to date"
                    class="w-full"
                  />

                  <USelect
                    v-model="
                      memberType
                    "
                    :items="
                      memberTypeItems
                    "
                    value-key="value"
                    label-key="label"
                    aria-label="Library visit member type"
                    class="w-full"
                  />
                </div>
              </div>
            </template>

            <div
              v-if="loading"
              class="space-y-3"
            >
              <USkeleton
                v-for="item in 6"
                :key="item"
                class="h-12 w-full rounded-lg"
              />
            </div>

            <UAlert
              v-else-if="recordsError"
              color="error"
              variant="soft"
              title="Records could not be loaded"
              :description="recordsError"
              :actions="[{ label: 'Try again', onClick: loadVisits }]"
            />

            <div
              v-else-if="
                recentVisits.length === 0
              "
              class="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-elevated/20 p-8 text-center"
            >
              <div
                class="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success"
              >
                <UIcon
                  name="i-lucide-door-open"
                  class="size-7"
                />
              </div>

              <p
                class="mt-4 font-semibold text-highlighted"
              >
                No Library entries found
              </p>

              <p
                class="mt-1 max-w-md text-sm text-muted"
              >
                Scan a registered Student or Faculty card, or adjust the selected date range.
              </p>
            </div>

            <AppResponsiveDataView v-else mobile-label="Library visit records" desktop-label="Library visit records table">
              <template #mobile>
                <div class="sncbt-mobile-record-list">
                  <AppRecordCard
                    v-for="visit in recentVisits"
                    :key="visit.documentId"
                    :title="visit.memberName"
                    :subtitle="`${visit.memberIdentifier} · ${visit.memberType}`"
                  >
                    <template #status>
                      <AppStatusBadge :label="visit.memberType" :tone="visit.memberType === 'Student' ? 'info' : 'primary'" />
                    </template>
                    <template #meta>
                      <span>{{ visit.programDepartment || 'Program / department not recorded' }}</span>
                      <span>{{ visit.visitDate }} · {{ formatTime(visit.timeIn) }}</span>
                      <span class="font-mono">{{ visit.barcode }}</span>
                    </template>
                    <template #actions>
                      <UButton
                        v-if="studentRecordPath(visit)"
                        :to="studentRecordPath(visit) ?? undefined"
                        label="Student Record"
                        icon="i-lucide-notebook-tabs"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        :aria-label="`View Student Record for ${visit.memberName}`"
                      />
                    </template>
                  </AppRecordCard>
                </div>
              </template>
              <template #desktop>
                <UTable :data="recentVisits" :columns="columns">
                          <template
                            #time-cell="{ row }"
                          >
                            <div>
                              <p
                                class="font-semibold text-highlighted"
                              >
                                {{
                                  formatTime(
                                    row.original
                                      .timeIn,
                                  )
                                }}
                              </p>
            
                              <p
                                class="text-xs text-muted"
                              >
                                {{
                                  row.original
                                    .visitDate
                                }}
                              </p>
                            </div>
                          </template>
            
                          <template
                            #member-cell="{ row }"
                          >
                            <div
                              class="flex items-center gap-3"
                            >
                              <UAvatar
                                :src="
                                  row.original
                                    .member
                                    ?.photoUrl ??
                                  undefined
                                "
                                :text="
                                  memberInitials(
                                    row.original,
                                  )
                                "
                                :alt="
                                  row.original
                                    .memberName
                                "
                                size="md"
                              />
            
                              <div
                                class="min-w-0"
                              >
                                <p
                                  class="truncate font-semibold text-highlighted"
                                >
                                  {{
                                    row.original
                                      .memberName
                                  }}
                                </p>
            
                                <p
                                  class="truncate text-xs text-muted"
                                >
                                  {{
                                    row.original
                                      .memberIdentifier
                                  }}
                                </p>
                              </div>
                            </div>
                          </template>
            
                          <template
                            #memberType-cell="{ row }"
                          >
                            <UBadge
                              :color="
                                row.original
                                  .memberType ===
                                'Student'
                                  ? 'info'
                                  : 'primary'
                              "
                              variant="soft"
                            >
                              {{
                                row.original
                                  .memberType
                              }}
                            </UBadge>
                          </template>
            
                          <template
                            #programDepartment-cell="{ row }"
                          >
                            <p
                              class="text-sm font-medium text-highlighted"
                            >
                              {{
                                row.original
                                  .programDepartment ||
                                "Not recorded"
                              }}
                            </p>
            
                            <p
                              v-if="
                                row.original
                                  .educationalLevel
                              "
                              class="text-xs text-muted"
                            >
                              {{
                                row.original
                                  .educationalLevel
                              }}
                              <template
                                v-if="
                                  row.original
                                    .yearLevel
                                "
                              >
                                · Year
                                {{
                                  row.original
                                    .yearLevel
                                }}
                              </template>
                            </p>
                          </template>
            
                          <template
                            #barcode-cell="{ row }"
                          >
                            <span
                              class="rounded-lg bg-elevated px-2 py-1 font-mono text-xs font-semibold text-highlighted"
                            >
                              {{
                                row.original
                                  .barcode
                              }}
                            </span>
                          </template>
            
                          <template
                            #recordedBy-cell="{ row }"
                          >
                            <span
                              class="text-sm text-muted"
                            >
                              {{
                                row.original
                                  .recordedBy ||
                                "Librarian"
                              }}
                            </span>
                          </template>

                          <template #actions-cell="{ row }">
                            <UButton
                              v-if="studentRecordPath(row.original)"
                              :to="studentRecordPath(row.original) ?? undefined"
                              label="Student Record"
                              icon="i-lucide-notebook-tabs"
                              color="neutral"
                              variant="ghost"
                              size="sm"
                              :aria-label="`View Student Record for ${row.original.memberName}`"
                            />
                          </template>
                        </UTable>
              </template>
            </AppResponsiveDataView>

            <template v-if="!recordsError" #footer>
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p
                  class="text-sm text-muted"
                >
                  {{
                    pagination.total
                  }}
                  visit record{{
                    pagination.total ===
                    1
                      ? ""
                      : "s"
                  }}
                  · Latest:
                  {{
                    formatDateTime(
                      summary.latestEntryAt,
                    )
                  }}
                </p>

                <UPagination
                  v-if="
                    pagination.pageCount >
                    1
                  "
                  v-model:page="page"
                  :total="
                    pagination.total
                  "
                  :items-per-page="
                    pagination.pageSize
                  "
                  :sibling-count="1"

                />
              </div>
            </template>
          </UCard>
        </template>
      </LibrarianWorkspaceTabs>
    </div>
  </UContainer>
</template>
