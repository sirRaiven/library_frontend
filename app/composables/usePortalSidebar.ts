export function usePortalSidebar() {
  const route = useRoute();
  const sidebarOpen = ref(false);
  let opener: HTMLElement | null = null;
  let focusPage = false;
  let desktop: MediaQueryList | undefined;

  function openSidebar(event: MouseEvent) {
    opener = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    focusPage = false;
    sidebarOpen.value = true;
  }

  function closeForPage() {
    if (!sidebarOpen.value) return;
    focusPage = true;
    sidebarOpen.value = false;
  }

  function onSidebarLinkClick(event: MouseEvent) {
    if (
      !sidebarOpen.value || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      !(event.target instanceof Element)
    ) return;

    // Route changes close the drawer through the watcher. Handle repeated clicks on the current URL here.
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (anchor?.href === window.location.href && anchor.target !== "_blank") {
      closeForPage();
    }
  }

  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    const target = !focusPage && opener?.getClientRects().length
      ? opener
      : document.getElementById("main-content");

    target?.focus({ preventScroll: true });
    opener = null;
  }

  function onDesktopChange(event: MediaQueryListEvent) {
    if (event.matches) closeForPage();
  }

  watch(() => route.fullPath, closeForPage);

  onMounted(() => {
    desktop = window.matchMedia("(min-width: 1024px)");
    desktop.addEventListener("change", onDesktopChange);
  });

  onBeforeUnmount(() => {
    desktop?.removeEventListener("change", onDesktopChange);
  });

  const sidebarMenu = { content: { onCloseAutoFocus } };

  return { sidebarOpen, sidebarMenu, openSidebar, onSidebarLinkClick };
}
