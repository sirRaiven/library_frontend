export type LibrarianWorkspace = "work" | "records";

export function useLibrarianWorkspace() {
  const route = useRoute();
  const router = useRouter();

  return computed<LibrarianWorkspace>({
    get: () => route.query.view === "records" ? "records" : "work",
    set: (view) => {
      void router.push({
        query: { ...route.query, view: view === "records" ? view : undefined },
        hash: route.hash,
      });
    },
  });
}
