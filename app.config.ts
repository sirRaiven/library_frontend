export default defineAppConfig({
  ui: {
    colors: {
      primary: "emerald",
      secondary: "teal",
      success: "green",
      info: "sky",
      warning: "amber",
      error: "red",
      neutral: "slate",
    },

    // Design System v2: restrained enterprise surfaces. Product-specific pages
    // may opt into denser layouts, but the shared defaults stay predictable.
    card: {
      slots: {
        root: [
          "sncbt-themed-card rounded-xl border border-default/80 bg-default",
          "shadow-[var(--sncbt-elevation-1)]",
          "transition-[box-shadow,border-color,background-color] duration-150",
        ].join(" "),
        header: "p-4 sm:px-5 sm:py-4",
        body: "p-4 sm:p-5",
        footer: "p-4 sm:px-5 sm:py-4",
      },
    },

    button: {
      slots: {
        base: [
          "min-h-9 rounded-lg font-medium",
          "transition-[color,background-color,border-color,box-shadow,transform] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-default",
        ].join(" "),
      },
    },

    input: {
      slots: {
        base: "rounded-lg shadow-[var(--sncbt-shadow-control)] focus-visible:ring-2 focus-visible:ring-primary/35",
      },
    },

    textarea: {
      slots: {
        base: "rounded-lg shadow-[var(--sncbt-shadow-control)] focus-visible:ring-2 focus-visible:ring-primary/35",
      },
    },

    select: {
      slots: {
        base: "rounded-lg shadow-[var(--sncbt-shadow-control)]",
        content: "rounded-lg shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    selectMenu: {
      slots: {
        base: "rounded-lg shadow-[var(--sncbt-shadow-control)]",
        content: "rounded-lg shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    dropdownMenu: {
      slots: {
        content: "sncbt-theme-overlay rounded-lg border border-default/80 shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    modal: {
      slots: {
        content: "sncbt-theme-overlay rounded-xl border border-default/80 shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    badge: {
      slots: {
        base: "rounded-md font-medium",
      },
    },
  },
});
