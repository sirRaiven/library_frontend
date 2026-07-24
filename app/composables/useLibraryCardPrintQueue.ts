
import type {
  StudentMember,
} from "~/composables/useLibraryMembers";

interface StoredLibraryCardPrintJob {
  students: StudentMember[];
  sourceRoute: string;
  createdAt: string;
}

const STORAGE_KEY =
  "sncbt-student-library-card-print-job";

function uniqueStudents(
  students: StudentMember[],
): StudentMember[] {
  const records =
    new Map<string, StudentMember>();

  for (const student of students) {
    const key =
      student.documentId ||
      student.libraryCardNo ||
      student.studentNo;

    if (!key) {
      continue;
    }

    records.set(key, student);
  }

  return [...records.values()];
}

export function useLibraryCardPrintQueue() {
  const students =
    useState<StudentMember[]>(
      "student-library-card-print-items",
      () => [],
    );

  const sourceRoute =
    useState<string>(
      "student-library-card-print-source",
      () => "/librarian/students",
    );

  function persist() {
    if (!import.meta.client) {
      return;
    }

    const payload:
      StoredLibraryCardPrintJob = {
        students: students.value,
        sourceRoute: sourceRoute.value,
        createdAt:
          new Date().toISOString(),
      };

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(payload),
    );
  }

  function setPrintQueue(
    nextStudents: StudentMember[],
    from =
      "/librarian/students",
  ) {
    students.value =
      uniqueStudents(nextStudents);

    sourceRoute.value =
      from ||
      "/librarian/students";

    persist();
  }

  function addToPrintQueue(
    student: StudentMember,
    from =
      "/librarian/students",
  ) {
    setPrintQueue(
      [
        ...students.value,
        student,
      ],
      from,
    );
  }

  function restorePrintQueue() {
    if (
      !import.meta.client ||
      students.value.length > 0
    ) {
      return;
    }

    const saved =
      sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (!saved) {
      return;
    }

    try {
      const parsed =
        JSON.parse(
          saved,
        ) as StoredLibraryCardPrintJob;

      students.value =
        uniqueStudents(
          Array.isArray(
            parsed.students,
          )
            ? parsed.students
            : [],
        );

      sourceRoute.value =
        parsed.sourceRoute ||
        "/librarian/students";
    } catch {
      sessionStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }

  function clearPrintQueue() {
    students.value = [];
    sourceRoute.value =
      "/librarian/students";

    if (import.meta.client) {
      sessionStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }

  return {
    students,
    sourceRoute,
    setPrintQueue,
    addToPrintQueue,
    restorePrintQueue,
    clearPrintQueue,
  };
}
