<script setup lang="ts">
import { localLibraryReport, type LibrarianExportChoice } from "~/utils/librarian-export-choices";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import { useAuth } from "~/composables/useAuth";

definePageMeta({
  layout: "librarian",
  title: "Edit Book",
});

type RecordStatus = "Active" | "Archived";

interface EditBookForm {
  title: string;
  author: string;
  classificationNumber: string;
  authorNumber: string;
  copyrightYear?: number;
  category: string;
  shelfLocation: string;
  subject: string;
  isbn: string;
  publisher: string;
  edition: string;
  description: string;
  recordStatus: RecordStatus;
}

interface BookCopy {
  documentId?: string;
  shelf_location?: string | null;
}

interface BookRecord {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  classification_number?: string | null;
  author_number?: string | null;
  call_number?: string | null;
  subject?: string | null;
  publisher?: string | null;
  edition?: string | null;
  copyright_year?: number | null;
  category?: string | null;
  description?: string | null;
  record_status?: RecordStatus;
  book_copies?: BookCopy[] | { data?: BookCopy[] };
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
const currentYear = new Date().getFullYear();

const libraryOptions = useLibraryOptions();
const storedCategory = ref("");
const storedShelfLocation = ref("");
const bookCategories = computed(() =>
  libraryOptions.withHistoricalValue(
    libraryOptions.bookCategories.value,
    storedCategory.value,
  ),
);
const shelfLocations = computed(() =>
  libraryOptions.withHistoricalValue(
    libraryOptions.shelfLocations.value,
    storedShelfLocation.value,
  ),
);

const form = reactive<EditBookForm>({
  title: "",
  author: "",
  classificationNumber: "",
  authorNumber: "",
  copyrightYear: undefined,
  category: "",
  shelfLocation: "",
  subject: "",
  isbn: "",
  publisher: "",
  edition: "",
  description: "",
  recordStatus: "Active",
});

const isLoading = ref(true);
const isSaving = ref(false);
const loadError = ref("");
const copyCount = ref(0);

const bookIdentifier = computed(() => {
  const value = route.params.id;
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
});

const detailRoute = computed(() =>
  bookIdentifier.value
    ? `/librarian/books/${bookIdentifier.value}`
    : "/librarian/books",
);

const callNumber = computed(() => {
  const classification = form.classificationNumber
    .trim()
    .replace(/\s+/g, "");
  const authorNumber = form.authorNumber
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!classification || !authorNumber || !form.copyrightYear) {
    return "Complete the classification fields";
  }

  return `${classification} ${authorNumber} ${form.copyrightYear}`;
});

function normalizeCopies(
  relation: BookRecord["book_copies"],
): BookCopy[] {
  if (Array.isArray(relation)) {
    return relation;
  }

  return relation && Array.isArray(relation.data)
    ? relation.data
    : [];
}

function validate(state: Partial<EditBookForm>): FormError[] {
  const errors: FormError[] = [];

  if (!state.title?.trim()) {
    errors.push({ name: "title", message: "Book title is required." });
  }

  if (!state.author?.trim()) {
    errors.push({ name: "author", message: "Author is required." });
  }

  const classification = String(state.classificationNumber ?? "")
    .trim()
    .replace(/\s+/g, "");

  if (!/^\d{3}(?:\.\d{1,10})?$/.test(classification)) {
    errors.push({
      name: "classificationNumber",
      message: "Use Dewey format, such as 002 or 005.133.",
    });
  }

  const authorNumber = String(state.authorNumber ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!/^[A-Z0-9]{1,12}$/.test(authorNumber)) {
    errors.push({
      name: "authorNumber",
      message: "Use letters and numbers only, such as 13E3.",
    });
  }

  const year = Number(state.copyrightYear);

  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > currentYear + 1
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid copyright year.",
    });
  }

  if (!state.category) {
    errors.push({
      name: "category",
      message: "Select a book category.",
    });
  }

  if (!state.shelfLocation) {
    errors.push({
      name: "shelfLocation",
      message: "Select a shelf location.",
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
          "populate[book_copies][fields][1]": "shelf_location",
        },
      },
    );

    const book = response.data;
    savedBook.value = book;
    const copies = normalizeCopies(book.book_copies);

    form.title = book.title ?? "";
    form.author = book.author ?? "";
    form.classificationNumber = book.classification_number ?? "";
    form.authorNumber = book.author_number ?? "";
    form.copyrightYear = book.copyright_year ?? undefined;
    storedCategory.value = book.category ?? "";
    storedShelfLocation.value = copies[0]?.shelf_location ?? "";
    form.category = storedCategory.value;
    form.shelfLocation = storedShelfLocation.value;
    form.subject = book.subject ?? "";
    form.isbn = book.isbn ?? "";
    form.publisher = book.publisher ?? "";
    form.edition = book.edition ?? "";
    form.description = book.description ?? "";
    form.recordStatus = book.record_status ?? "Active";
    copyCount.value = copies.length;
  } catch (error) {
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
            classification_number: form.classificationNumber
              .trim()
              .replace(/\s+/g, ""),
            author_number: form.authorNumber
              .trim()
              .replace(/\s+/g, "")
              .toUpperCase(),
            copyright_year: Number(form.copyrightYear),
            category: form.category,
            shelf_location: form.shelfLocation,
            subject: form.subject.trim() || null,
            isbn: form.isbn.trim() || null,
            publisher: form.publisher.trim() || null,
            edition: form.edition.trim() || null,
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
      } moved to the ${form.shelfLocation} shelf.`,
      color: "success",
      icon: "i-lucide-save",
    });

    await navigateTo({
      path: detailRoute.value,
      query: { updated: "1" },
    });
  } catch (error) {
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

onMounted(async () => {
  try {
    await libraryOptions.loadOperational();
  } catch {
    // Existing stored values are injected as historical options after the book loads.
  }
  await loadBook();
});

const savedBook = ref<BookRecord | null>(null);
const reportChoices: LibrarianExportChoice[] = [{
  label: "Saved Book Details",
  scope: "Includes the book details currently saved in the collection.",
  load: () => {
    const saved = savedBook.value;
    if (!saved) throw new Error("Book record unavailable");
    return localLibraryReport("Saved Book Details", ["Item", "Details"], [
      ["Title", saved.title], ["Author", saved.author], ["Category", saved.category],
      ["ISBN", saved.isbn], ["Publisher", saved.publisher], ["Edition", saved.edition],
      ["Copyright Year", saved.copyright_year], ["Copies", copyCount.value],
    ]);
  },
}];
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-staff-page">
    <div class="mx-auto max-w-5xl space-y-6">
      <LibrarianPageHeader
        :report-choices="reportChoices"
        :report-disabled="isLoading || !savedBook"
        eyebrow="Books & Collection"
        title="Edit Book Information"
        description="Update the classification, generated call number, subject, and physical shelf location."
        icon="i-lucide-book-open-text"
      >
        <template #actions>
          <UButton
            :to="detailRoute"
            label="Back to Record"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            :disabled="isSaving"
          />
        </template>
      </LibrarianPageHeader>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-refresh-cw"
        title="Shelf synchronization"
        :description="`${copyCount} physical ${copyCount === 1 ? 'copy' : 'copies'} will use the selected shelf location.`"
      />

      <UAlert
        v-if="libraryOptions.error.value"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Book categories and shelf locations could not be refreshed"
        :description="libraryOptions.error.value"
        :actions="[{ label: 'Retry', onClick: () => libraryOptions.loadOperational() }]"
      />

      <UAlert
        v-if="loadError"
        color="error"
        variant="soft"
        title="Unable to load this book"
        :description="loadError"
      />

      <div v-if="isLoading" class="space-y-4">
        <UCard><USkeleton class="h-80 w-full" /></UCard>
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
            <h2 class="font-semibold text-highlighted">Catalog and classification</h2>
          </template>

          <div class="grid gap-5 md:grid-cols-2">
            <UFormField name="title" label="Title" required class="md:col-span-2">
              <UInput v-model="form.title" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="author" label="Author" required>
              <UInput v-model="form.author" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="subject" label="Subject" hint="Optional">
              <UInput v-model="form.subject" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="classificationNumber" label="Classification number" required>
              <UInput
                v-model="form.classificationNumber"
                placeholder="e.g., 002 or 005.133"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="authorNumber" label="Author number/code" required>
              <UInput
                v-model="form.authorNumber"
                placeholder="e.g., 13E3"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="copyrightYear" label="Copyright date" required>
              <UInputNumber
                v-model="form.copyrightYear"
                :min="1000"
                :max="currentYear + 1"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="category" label="Book category" required>
              <USelect
                v-model="form.category"
                :items="bookCategories"
                value-key="value"
                label-key="label"
                size="lg"
                class="w-full"
                :disabled="libraryOptions.loading.value"
              />
            </UFormField>

            <UFormField name="shelfLocation" label="Shelf location" required>
              <USelect
                v-model="form.shelfLocation"
                :items="shelfLocations"
                value-key="value"
                label-key="label"
                size="lg"
                class="w-full"
                :disabled="libraryOptions.loading.value"
              />
            </UFormField>

            <UFormField label="Generated call number" class="md:col-span-2">
              <UInput
                :model-value="callNumber"
                readonly
                size="lg"
                class="w-full font-mono"
              />
            </UFormField>

            <UFormField name="isbn" label="ISBN" hint="Optional">
              <UInput v-model="form.isbn" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="recordStatus" label="Record status" required>
              <USelect
                v-model="form.recordStatus"
                :items="['Active', 'Archived']"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField name="publisher" label="Publisher" hint="Optional">
              <UInput v-model="form.publisher" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="edition" label="Edition" hint="Optional">
              <UInput v-model="form.edition" size="lg" class="w-full" />
            </UFormField>

            <UFormField name="description" label="Description" hint="Optional" class="md:col-span-2">
              <UTextarea
                v-model="form.description"
                :rows="4"
                autoresize
                class="w-full"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton :to="detailRoute" label="Cancel" color="neutral" variant="ghost" />
              <UButton
                type="submit"
                label="Save Changes"
                icon="i-lucide-save"
                color="success"
                :loading="isSaving"
              />
            </div>
          </template>
        </UCard>
      </UForm>
    </div>
  </UContainer>
</template>
