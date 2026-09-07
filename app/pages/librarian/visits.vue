
<script setup lang="ts">
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
];

const summaryCards = computed(
  () => [
    {
      label:
        "Entries in Period",
      value:
        summary.value
          .totalVisits,
      icon:
        "i-lucide-log-in",
      description:
        "Recorded time-ins",
    },
    {
      label:
        "Student Visits",
      value:
        summary.value
          .studentVisits,
      icon:
        "i-lucide-graduation-cap",
      description:
        "Student card scans",
    },
    {
      label:
        "Faculty Visits",
      value:
        summary.value
          .facultyVisits,
      icon:
        "i-lucide-briefcase-business",
      description:
        "Faculty ID scans",
    },
    {
      label:
        "Unique Visitors",
      value:
        summary.value
          .uniqueVisitors,
      icon:
        "i-lucide-users-round",
      description:
        summary.value
          .busiestHour
          ? `Busiest hour: ${summary.value.busiestHour}`
          : "No activity yet",
    },
  ],
);

function focusScanner() {
  nextTick(() => {
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

async function loadVisits() {
  loading.value = true;

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
          search.value,
        page: page.value,
        pageSize,
      });

    recentVisits.value =
      response.data;

    Object.assign(
      pagination,
      response.meta
        .pagination,
    );

    summary.value =
      response.meta.summary;
  } catch (error) {
    toast.add({
      title:
        "Entry records could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
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

    page.value = 1;
    await loadVisits();
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
  const today =
    philippineDate();

  fromDate.value =
    today;
  toDate.value =
    today;
  memberType.value =
    "all";
  search.value = "";
  page.value = 1;

  void loadVisits();
}

let searchTimer:
  ReturnType<
    typeof setTimeout
  > | undefined;

watch(search, () => {
  clearTimeout(
    searchTimer,
  );

  searchTimer =
    setTimeout(() => {
      page.value = 1;
      void loadVisits();
    }, 350);
});

watch(
  [
    fromDate,
    toDate,
    memberType,
    page,
  ],
  () => {
    void loadVisits();
  },
);

onMounted(() => {
  void loadVisits();
  focusScanner();
});
</script>

<template>
  <UContainer class="sncbt-page-shell">
    <div
      class="mx-auto max-w-[1500px] space-y-6 mb-12"
    >
      <LibrarianPageHeader
        eyebrow="Library Services"
        title="Library Visits"
        description="Record Library entry by scanning a Student Library Card or Faculty institutional ID. Each accepted scan creates one visit record."
        icon="i-lucide-scan-line"s
      >
        <template #actions>
          <UBadge color="primary" variant="soft" class="self-center">Time-in only</UBadge>
          <UButton label="Open Visitor Reports" icon="i-lucide-file-chart-column" color="neutral" variant="outline" to="/librarian/reports" />
        </template>
      </LibrarianPageHeader>

      <UCard
        class="overflow-hidden border-success/30"
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
          class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
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

        <UAlert
          class="mt-4"
          color="info"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Registered members only"
          description="Students must have an Active profile and an active semester membership. Faculty must have an Active Faculty profile. Immediate duplicate scans are ignored for 60 seconds."
        />
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

      <section
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Visit summary"
      >
        <LibrarianMetricCard
          v-for="card in summaryCards"
          :key="card.label"
          :label="card.label"
          :value="card.value"
          :description="card.description"
          :icon="card.icon"
          :tone="card.label === 'Student Visits' ? 'success' : card.label === 'Faculty Visits' ? 'info' : card.label === 'Unique Visitors' ? 'neutral' : 'primary'"
        />
      </section>

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
              class="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_12rem]"
            >
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search member, number, barcode, or program"
                class="w-full"
              />

              <UInput
                v-model="fromDate"
                type="date"
                icon="i-lucide-calendar-range"
                class="w-full"
              />

              <UInput
                v-model="toDate"
                type="date"
                icon="i-lucide-calendar-range"
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
            class="h-20 w-full rounded-xl"
          />
        </div>

        <div
          v-else-if="
            recentVisits.length === 0
          "
          class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-elevated/20 p-8 text-center"
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

        <UTable
          v-else
          :data="recentVisits"
          :columns="columns"
        >
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
        </UTable>

        <template #footer>
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
              show-edges
            />
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
