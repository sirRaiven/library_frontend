<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
} from "@nuxt/ui";
import { useAuth } from "~/composables/useAuth";

definePageMeta({
  layout: "librarian",
  title: "Edit Book",
});

type RecordStatus = "Active" | "Archived";

interface EditBookForm {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  edition: string;
  copyrightYear?: number;
  description: string;
  recordStatus: RecordStatus;
}

interface BookRecord {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  call_number?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  description?: string | null;
  record_status?: RecordStatus;
  book_copies?: unknown[] | { data?: unknown[] };
}

interface BookResponse {
  data: BookRecord;
}

interface UpdateResponse {
  data: {
    book: BookRecord;
    synchronizedCopies: number;
  };
}

const route = useRoute();
const auth = useAuth();
const toast = useToast();

const categories = [
  "Filipiniana",
  "Reference",
  "Computer Program",
  "Health Care",
  "Business Administration",
  "Hospitality & Tourism Management",
  "Criminal Justice Education",
];

const recordStatuses: RecordStatus[] = [
  "Active",
  "Archived",
];

const currentYear = new Date().getFullYear();
const isLoading = ref(true);
const isSaving = ref(false);
const loadError = ref("");
const copyCount = ref(0);

const form = reactive<EditBookForm>({
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  edition: "",
  copyrightYear: undefined,
  description: "",
  recordStatus: "Active",
});

const bookIdentifier = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
});

const detailRoute = computed(() =>
  bookIdentifier.value
    ? `/librarian/books/${bookIdentifier.value}`
    : "/librarian/books",
);

const callNumber = computed(() =>
  form.category || "Select a category",
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

function relationCount(
  relation: BookRecord["book_copies"],
): number {
  if (Array.isArray(relation)) {
    return relation.length;
  }

  if (relation && Array.isArray(relation.data)) {
    return relation.data.length;
  }

  return 0;
}

function validate(
  state: Partial<EditBookForm>,
): FormError[] {
  const errors: FormError[] = [];

  if (!state.title?.trim()) {
    errors.push({
      name: "title",
      message: "Book title is required.",
    });
  }

  if (!state.author?.trim()) {
    errors.push({
      name: "author",
      message: "Author is required.",
    });
  }

  if (!state.category) {
    errors.push({
      name: "category",
      message: "Select a category.",
    });
  }

  if (
    state.copyrightYear !== undefined &&
    (!Number.isInteger(Number(state.copyrightYear)) ||
      Number(state.copyrightYear) < 1000 ||
      Number(state.copyrightYear) > currentYear + 1)
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid copyright year.",
    });
  }

  return errors;
}

async function loadBook(): Promise<void> {
  if (!bookIdentifier.value) {
    loadError.value = "The book identifier is missing.";
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  loadError.value = "";

  try {
    const response = await auth.authFetch<BookResponse>(
      `/api/books/${bookIdentifier.value}`,
      {
        method: "GET",
        query: {
          "populate[book_copies][fields][0]": "documentId",
        },
      },
    );

    const book = response.data;

    form.title = book.title ?? "";
    form.author = book.author ?? "";
    form.isbn = book.isbn ?? "";
    form.category = book.category ?? "";
    form.publisher = book.publisher ?? "";
    form.edition = book.edition ?? "";
    form.copyrightYear = book.copyright_year ?? undefined;
    form.description = book.description ?? "";
    form.recordStatus = book.record_status ?? "Active";
    copyCount.value = relationCount(book.book_copies);
  } catch (error) {
    if (getHttpStatus(error) === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: route.fullPath,
        },
      });

      return;
    }

    loadError.value = auth.getErrorMessage(error);
  } finally {
    isLoading.value = false;
  }
}

async function saveBook(
  _event: FormSubmitEvent<EditBookForm>,
): Promise<void> {
  if (isSaving.value || !bookIdentifier.value) {
    return;
  }

  isSaving.value = true;

  try {
    const response = await auth.authFetch<UpdateResponse>(
      `/api/books/${bookIdentifier.value}/update-metadata`,
      {
        method: "PUT",
        body: {
          data: {
            title: form.title.trim(),
            author: form.author.trim(),
            isbn: form.isbn.trim() || null,
            category: form.category,
            publisher: form.publisher.trim() || null,
            edition: form.edition.trim() || null,
            copyright_year: form.copyrightYear ?? null,
            description: form.description.trim() || null,
            record_status: form.recordStatus,
          },
        },
      },
    );

    toast.add({
      title: "Book information updated",
      description: `${response.data.synchronizedCopies} physical ${
        response.data.synchronizedCopies === 1 ? "copy was" : "copies were"
      } synchronized to the ${form.category} shelf.`,
      color: "success",
      icon: "i-lucide-save",
    });

    await navigateTo({
      path: detailRoute.value,
      query: {
        updated: "1",
      },
    });
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      await navigateTo({
        path: "/",
        query: {
          redirect: route.fullPath,
        },
      });

      return;
    }

    if (status === 403) {
      toast.add({
        title: "Permission denied",
        description:
          "Enable the Book updateMetadata permission for the Librarian role in Strapi.",
        color: "error",
        icon: "i-lucide-shield-x",
      });
      return;
    }

    toast.add({
      title: "Update failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  void loadBook();
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <UButton
            :to="detailRoute"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            aria-label="Back to book record"
          />

          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Edit Book Information
            </h1>
            <p class="mt-1 max-w-3xl text-sm text-muted">
              Update the title-level catalog information. Changing the category
              also updates the call number and shelf location of every physical
              copy.
            </p>
          </div>
        </div>

        <UButton
          :to="detailRoute"
          label="Cancel"
          color="neutral"
          variant="outline"
          class="self-start"
          :disabled="isSaving"
        />
      </div>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-refresh-cw"
        title="Automatic synchronization"
        :description="`${copyCount} physical ${
          copyCount === 1 ? 'copy' : 'copies'
        } will follow the selected category as their shelf location.`"
      />

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Unable to load this book"
        :description="loadError"
        :actions="[
          {
            label: 'Try again',
            color: 'error',
            variant: 'outline',
            onClick: loadBook,
          },
        ]"
      />

      <div v-if="isLoading" class="space-y-4">
        <UCard v-for="item in 2" :key="item">
          <div class="grid gap-4 md:grid-cols-2">
            <USkeleton class="h-11 w-full" />
            <USkeleton class="h-11 w-full" />
            <USkeleton class="h-11 w-full" />
            <USkeleton class="h-11 w-full" />
          </div>
        </UCard>
      </div>

      <UForm
        v-else-if="!loadError"
        :state="form"
        :validate="validate"
        class="space-y-6"
        @submit="saveBook"
      >
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon name="i-lucide-book-open" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">
                  Main catalog information
                </h2>
                <p class="text-sm text-muted">
                  Required identification and classification fields
                </p>
              </div>
            </div>
          </template>

          <div class="grid gap-5 md:grid-cols-2">
            <UFormField
              name="title"
              label="Title"
              required
              class="md:col-span-2"
            >
              <UInput
                v-model="form.title"
                icon="i-lucide-book"
                placeholder="Enter the complete book title"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="author" label="Author" required>
              <UInput
                v-model="form.author"
                icon="i-lucide-user-round"
                placeholder="Author or editor"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="category"
              label="Category"
              description="Also used as call number and shelf location."
              required
            >
              <USelect
                v-model="form.category"
                :items="categories"
                icon="i-lucide-tags"
                placeholder="Select a category"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Call number">
              <UInput
                :model-value="callNumber"
                icon="i-lucide-library"
                readonly
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Physical-copy shelf location">
              <UInput
                :model-value="callNumber"
                icon="i-lucide-map-pin"
                readonly
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="recordStatus" label="Record status" required>
              <USelect
                v-model="form.recordStatus"
                :items="recordStatuses"
                icon="i-lucide-circle-dot"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="isbn" label="ISBN" hint="Optional">
              <UInput
                v-model="form.isbn"
                icon="i-lucide-barcode"
                placeholder="ISBN-10 or ISBN-13"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-info/10 text-info"
              >
                <UIcon name="i-lucide-notebook-tabs" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">
                  Publication details
                </h2>
                <p class="text-sm text-muted">
                  Optional supporting bibliographic information
                </p>
              </div>
            </div>
          </template>

          <div class="grid gap-5 md:grid-cols-2">
            <UFormField
              name="copyrightYear"
              label="Copyright date"
              hint="Optional"
            >
              <UInputNumber
                v-model="form.copyrightYear"
                :min="1000"
                :max="currentYear + 1"
                placeholder="e.g., 2026"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="publisher" label="Publisher" hint="Optional">
              <UInput
                v-model="form.publisher"
                icon="i-lucide-building-2"
                placeholder="Publisher name"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="edition" label="Edition" hint="Optional">
              <UInput
                v-model="form.edition"
                placeholder="e.g., 4th Edition"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField
              name="description"
              label="Description"
              hint="Optional"
              class="md:col-span-2"
            >
              <UTextarea
                v-model="form.description"
                placeholder="Short summary or catalog notes"
                :rows="5"
                autoresize
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <div
          class="flex flex-col-reverse gap-3 rounded-2xl border border-default bg-default p-4 sm:flex-row sm:items-center sm:justify-end"
        >
          <UButton
            :to="detailRoute"
            label="Cancel"
            color="neutral"
            variant="ghost"
            :disabled="isSaving"
          />

          <UButton
            type="submit"
            label="Save Book Information"
            icon="i-lucide-save"
            color="success"
            size="lg"
            :loading="isSaving"
          />
        </div>
      </UForm>
    </div>
  </UContainer>
</template>
