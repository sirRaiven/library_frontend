<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

definePageMeta({
  layout: "librarian",
  title: "Books Catalog",
});

const router = useRouter();

const search = ref("");
const selectedCategory = ref("");

// Updated to include categories relevant to the system's mock data
const categories = [
  "Computer Science",
  "Programming",
  "Database",
  "Networking",
  "Technology",
  "Embedded Systems",
  "General Education",
];

const books = ref([
  {
    id: 1,
    cover: "",
    title: "Systems Analysis and Design",
    author: "Kenneth Kendall",
    isbn: "978-0133023442",
    category: "Technology",
    publisher: "Pearson",
    copies: 10,
    available: 8,
  },
  {
    id: 2,
    cover: "",
    title: "Introduction to Arduino Automation",
    author: "Jane Doe",
    isbn: "978-3161484100",
    category: "Embedded Systems",
    publisher: "Maker Press",
    copies: 6,
    available: 6,
  },
  {
    id: 3,
    cover: "",
    title: "Modern Network Management Principles",
    author: "Richard Stevens",
    isbn: "978-0131433511",
    category: "Networking",
    publisher: "Addison-Wesley",
    copies: 5,
    available: 0,
  },
]);

const filteredBooks = computed(() => {
  return books.value.filter((book) => {
    const keyword =
      book.title.toLowerCase().includes(search.value.toLowerCase()) ||
      book.author.toLowerCase().includes(search.value.toLowerCase()) ||
      book.isbn.includes(search.value);

    const category =
      !selectedCategory.value || book.category === selectedCategory.value;

    return keyword && category;
  });
});

const openBook = (book: any) => {
  router.push(`/librarian/books/${book.id}`);
};

const registerBook = () => {
  router.push("/librarian/books/register");
};

const manageCopies = (book: any) => {
  router.push({
    path: "/librarian/books/copies",
    query: {
      id: book.id,
    },
  });
};
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Books Catalog</h1>
        <p class="text-sm text-gray-500 mt-1">
          Browse and manage all registered book titles.
        </p>
      </div>

      <UButton icon="i-lucide-plus" color="primary" @click="registerBook">
        Register Book
      </UButton>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="grid lg:grid-cols-4 gap-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search title, author or ISBN"
          class="lg:col-span-3"
        />

        <!-- Note: Nuxt UI v4 uses :options instead of :items -->
        <USelect
          v-model="selectedCategory"
          :options="categories"
          placeholder="All Categories"
        />
      </div>
    </UCard>

    <!-- Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard :ui="{ body: 'py-4 sm:p-6' }">
        <div class="text-center">
          <div class="text-3xl font-bold">
            {{ books.length }}
          </div>
          <div class="text-sm text-gray-500 font-medium mt-1">Book Titles</div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'py-4 sm:p-6' }">
        <div class="text-center">
          <div class="text-3xl font-bold">
            {{ books.reduce((a, b) => a + b.copies, 0) }}
          </div>
          <div class="text-sm text-gray-500 font-medium mt-1">
            Physical Copies
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'py-4 sm:p-6' }">
        <div class="text-center">
          <div class="text-3xl font-bold text-green-600">
            {{ books.reduce((a, b) => a + b.available, 0) }}
          </div>
          <div class="text-sm text-gray-500 font-medium mt-1">Available</div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'py-4 sm:p-6' }">
        <div class="text-center">
          <div class="text-3xl font-bold text-orange-600">
            {{ books.reduce((a, b) => a + (b.copies - b.available), 0) }}
          </div>
          <div class="text-sm text-gray-500 font-medium mt-1">Borrowed</div>
        </div>
      </UCard>
    </div>

    <!-- Books Grid -->
    <div class="grid xl:grid-cols-2 gap-5">
      <UCard
        v-for="book in filteredBooks"
        :key="book.id"
        class="flex flex-col h-full"
      >
        <div class="flex gap-5">
          <!-- Cover Placeholder -->
          <div
            class="w-28 h-36 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200"
          >
            <UIcon name="i-lucide-book" class="w-10 h-10 text-gray-400" />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg truncate" :title="book.title">
              {{ book.title }}
            </h3>
            <p class="text-gray-500 text-sm truncate">
              {{ book.author }}
            </p>

            <div class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <div class="text-gray-500">ISBN</div>
              <div class="font-semibold">{{ book.isbn }}</div>

              <div class="text-gray-500 self-center">Category</div>
              <div>
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ book.category }}
                </UBadge>
              </div>

              <div class="text-gray-500">Publisher</div>
              <div class="font-semibold truncate" :title="book.publisher">
                {{ book.publisher }}
              </div>
            </div>

            <!-- Tags -->
            <div class="flex gap-3 mt-5">
              <UBadge color="neutral" variant="solid">
                {{ book.copies }} Total Copies
              </UBadge>
              <UBadge
                :color="book.available > 0 ? 'success' : 'error'"
                variant="subtle"
              >
                {{ book.available }} Available
              </UBadge>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-6">
              <UButton
                icon="i-lucide-eye"
                variant="outline"
                @click="openBook(book)"
              >
                Details
              </UButton>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-book-copy"
                @click="manageCopies(book)"
              >
                Manage Copies
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
