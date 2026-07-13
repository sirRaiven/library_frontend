export const useLayoutState = () => {
  // useState ensures the state survives Nuxt hydration between server and client
  const isSidebarOpen = useState("sidebar-open", () => true);

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
  };

  return {
    isSidebarOpen,
    toggleSidebar,
  };
};
