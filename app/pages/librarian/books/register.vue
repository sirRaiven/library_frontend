<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
} from "@nuxt/ui";

definePageMeta({
  layout: "librarian",
  title: "Register Book",
});

type BookStatus = "Active" | "Archived";
type CopyCondition = "New" | "Good" | "Fair" | "Damaged";

interface BookRegistrationForm {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  edition: string;
  copyrightYear?: number;
  description: string;
  recordStatus: BookStatus;
  quantity: number;
  shelfLocation: string;
  condition: CopyCondition;
  remarks: string;
}

interface RegisteredBook {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
}

interface RegisteredCopy {
  id?: number;
  documentId?: string;
  control_number: string;
}

interface RegistrationResponse {
  data: {
    book: RegisteredBook;
    copies: RegisteredCopy[];
  };
}

const auth = useAuth();
const toast = useToast();

const categories = [
  "General Reference",
  "Computer Science",
  "Information Technology",
  "Business",
  "Education",
  "Engineering",
  "Literature",
  "History",
  "Science",
  "Mathematics",
  "Others",
];

const conditions: CopyCondition[] = [
  "New",
  "Good",
  "Fair",
  "Damaged",
];

const form = reactive<BookRegistrationForm>({
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  edition: "",
  copyrightYear: undefined,
  description: "",
  recordStatus: "Active",
  quantity: 1,
  shelfLocation: "",
  condition: "Good",
  remarks: "",
});

const isSubmitting = ref(false);

const isReadyToRegister = computed(
  () =>
    Boolean(
      form.title.trim() &&
        form.author.trim() &&
        form.category &&
        form.shelfLocation.trim(),
    ) &&
    Number.isInteger(Number(form.quantity)) &&
    Number(form.quantity) > 0,
);

const registrationSummary = computed(() => ({
  title: form.title.trim() || "Untitled book",
  author: form.author.trim() || "Author not entered",
  quantity: Number(form.quantity) || 0,
  shelf: form.shelfLocation.trim() || "Not assigned",
  condition: form.condition,
}));

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: {
      status?: number;
    };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

function validate(
  state: Partial<BookRegistrationForm>,
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

  const quantity = Number(state.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push({
      name: "quantity",
      message: "Enter at least one physical copy.",
    });
  } else if (quantity > 100) {
    errors.push({
      name: "quantity",
      message: "A registration batch can contain up to 100 copies.",
    });
  }

  if (!state.shelfLocation?.trim()) {
    errors.push({
      name: "shelfLocation",
      message: "Shelf location is required.",
    });
  }

  const rawYear = state.copyrightYear;

  if (
    rawYear !== undefined &&
    (!Number.isInteger(Number(rawYear)) ||
      Number(rawYear) < 1000 ||
      Number(rawYear) > new Date().getFullYear() + 1)
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid publication year.",
    });
  }

  return errors;
}

async function submitRegistration(
  _event: FormSubmitEvent<BookRegistrationForm>,
) {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    const response =
      await auth.authFetch<RegistrationResponse>(
        "/api/books/register-with-copies",
        {
          method: "POST",
          body: {
            data: {
              book: {
                title: form.title.trim(),
                author: form.author.trim(),
                isbn: form.isbn.trim() || null,
                category: form.category,
                publisher:
                  form.publisher.trim() || null,
                edition: form.edition.trim() || null,
                copyright_year:
                  form.copyrightYear ?? null,
                description:
                  form.description.trim() || null,
                record_status: form.recordStatus,
              },
              copies: {
                quantity: Number(form.quantity),
                shelf_location:
                  form.shelfLocation.trim(),
                condition: form.condition,
                remarks: form.remarks.trim() || null,
              },
            },
          },
        },
      );

    const identifier =
      response.data.book.documentId ??
      response.data.book.id;

    if (!identifier) {
      throw new Error(
        "The book was registered, but Strapi did not return its identifier.",
      );
    }

    toast.add({
      title: "Book registered successfully",
      description: `${response.data.copies.length} ${
        response.data.copies.length === 1
          ? "copy was"
          : "copies were"
      } created with unique control numbers.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    await navigateTo({
      path: `/librarian/books/${identifier}`,
      query: {
        registered: "1",
      },
    });
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      toast.add({
        title: "Session expired",
        description:
          "Sign in again to continue registering books.",
        color: "warning",
        icon: "i-lucide-shield-alert",
      });

      await navigateTo({
        path: "/",
        query: {
          redirect:
            "/librarian/books/register",
        },
      });

      return;
    }

    if (status === 403) {
      toast.add({
        title: "Permission denied",
        description:
          "Your Librarian role cannot register books. Enable the Book registerWithCopies permission in Strapi.",
        color: "error",
        icon: "i-lucide-shield-x",
      });

      return;
    }

    toast.add({
      title: "Registration failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="flex items-start gap-3">
          <UButton
            to="/librarian/books"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            aria-label="Back to book catalog"
          />

          <div>
            <div
              class="flex flex-wrap items-center gap-2"
            >
              <h1
                class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
              >
                Register a Book
              </h1>

              <UBadge
                color="success"
                variant="soft"
              >
                Barcodes generated automatically
              </UBadge>
            </div>

            <p class="mt-1 text-sm text-muted">
              Enter the title once, specify the number
              of copies, and the system will create a
              unique control number for every copy.
            </p>
          </div>
        </div>

        <UButton
          to="/librarian/books"
          label="View Catalog"
          icon="i-lucide-library"
          color="neutral"
          variant="outline"
          class="self-start"
        />
      </div>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-scan-barcode"
        title="One registration creates the complete inventory record"
        description="After saving, you will be taken directly to the book record where all generated barcodes can be viewed, downloaded, and printed."
      />

      <UForm
        :state="form"
        :validate="validate"
        class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        @submit="submitRegistration"
      >
        <div class="space-y-6">
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-book-open"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Book information
                  </h2>
                  <p class="text-sm text-muted">
                    Required information for the catalog
                    record.
                  </p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-2">
              <UFormField
                name="title"
                label="Book title"
                required
                class="md:col-span-2"
              >
                <UInput
                  v-model="form.title"
                  icon="i-lucide-book"
                  placeholder="Enter the complete book title"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="author"
                label="Author"
                required
              >
                <UInput
                  v-model="form.author"
                  icon="i-lucide-user-round"
                  placeholder="Author or editor"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="category"
                label="Category"
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

              <UFormField
                name="isbn"
                label="ISBN"
                hint="Optional"
              >
                <UInput
                  v-model="form.isbn"
                  icon="i-lucide-hash"
                  placeholder="ISBN-10 or ISBN-13"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="publisher"
                label="Publisher"
                hint="Optional"
              >
                <UInput
                  v-model="form.publisher"
                  icon="i-lucide-building-2"
                  placeholder="Publisher name"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>
            </div>

            <details
              class="group mt-6 rounded-xl border border-default bg-elevated/40"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium text-highlighted"
              >
                <span class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-list-plus"
                    class="size-4 text-muted"
                  />
                  Additional bibliographic details
                </span>

                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-4 text-muted transition-transform group-open:rotate-180"
                />
              </summary>

              <div
                class="grid gap-5 border-t border-default p-4 md:grid-cols-2"
              >
                <UFormField
                  name="edition"
                  label="Edition"
                >
                  <UInput
                    v-model="form.edition"
                    placeholder="e.g., 4th Edition"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="copyrightYear"
                  label="Publication year"
                >
                  <UInputNumber
                    v-model="form.copyrightYear"
                    :min="1000"
                    :max="
                      new Date().getFullYear() + 1
                    "
                    placeholder="e.g., 2026"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="description"
                  label="Description"
                  class="md:col-span-2"
                >
                  <UTextarea
                    v-model="form.description"
                    placeholder="Short summary or catalog notes"
                    :rows="4"
                    autoresize
                    class="w-full"
                  />
                </UFormField>
              </div>
            </details>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success"
                >
                  <UIcon
                    name="i-lucide-copy-plus"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Physical copies
                  </h2>
                  <p class="text-sm text-muted">
                    These settings are applied to all
                    copies in this registration batch.
                  </p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-3">
              <UFormField
                name="quantity"
                label="Number of copies"
                required
                description="Each copy receives its own control number."
              >
                <UInputNumber
                  v-model="form.quantity"
                  :min="1"
                  :max="100"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="shelfLocation"
                label="Shelf location"
                required
              >
                <UInput
                  v-model="form.shelfLocation"
                  icon="i-lucide-map-pin"
                  placeholder="e.g., CS-A-01"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="condition"
                label="Initial condition"
                required
              >
                <USelect
                  v-model="form.condition"
                  :items="conditions"
                  icon="i-lucide-shield-check"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="remarks"
                label="Acquisition remarks"
                hint="Optional"
                class="md:col-span-3"
              >
                <UTextarea
                  v-model="form.remarks"
                  placeholder="Donor, supplier, acquisition batch, or other notes"
                  :rows="3"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <aside class="lg:sticky lg:top-6 lg:self-start">
          <UCard>
            <template #header>
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Registration summary
                </h2>
                <p class="mt-1 text-sm text-muted">
                  Review the required information before
                  saving.
                </p>
              </div>
            </template>

            <div class="space-y-5">
              <div
                class="rounded-xl border border-default bg-elevated/50 p-4"
              >
                <p
                  class="line-clamp-2 font-semibold text-highlighted"
                >
                  {{ registrationSummary.title }}
                </p>
                <p
                  class="mt-1 truncate text-sm text-muted"
                >
                  {{ registrationSummary.author }}
                </p>
              </div>

              <dl class="space-y-3 text-sm">
                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Physical copies
                  </dt>
                  <dd
                    class="font-semibold text-highlighted"
                  >
                    {{ registrationSummary.quantity }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Shelf
                  </dt>
                  <dd
                    class="truncate font-semibold text-highlighted"
                  >
                    {{ registrationSummary.shelf }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Condition
                  </dt>
                  <dd>
                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ registrationSummary.condition }}
                    </UBadge>
                  </dd>
                </div>
              </dl>

              <div
                class="rounded-xl bg-success/10 p-4 text-sm text-success"
              >
                <div class="flex gap-3">
                  <UIcon
                    name="i-lucide-scan-barcode"
                    class="mt-0.5 size-5 shrink-0"
                  />

                  <p>
                    The system will generate
                    <strong>
                      {{
                        registrationSummary.quantity
                      }}
                    </strong>
                    unique barcode{{
                      registrationSummary.quantity === 1
                        ? ""
                        : "s"
                    }}
                    after registration.
                  </p>
                </div>
              </div>
            </div>

            <template #footer>
              <div class="space-y-3">
                <UButton
                  type="submit"
                  label="Register & View Barcodes"
                  icon="i-lucide-check"
                  color="success"
                  size="xl"
                  block
                  :loading="isSubmitting"
                  :disabled="
                    !isReadyToRegister ||
                    isSubmitting
                  "
                />

                <UButton
                  to="/librarian/books"
                  label="Cancel"
                  color="neutral"
                  variant="ghost"
                  block
                  :disabled="isSubmitting"
                />
              </div>
            </template>
          </UCard>
        </aside>
      </UForm>
    </div>
  </UContainer>
</template>
