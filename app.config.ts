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

    card: {
      slots: {
        root: [
          "rounded-2xl border border-default/80 bg-default",
          "shadow-[var(--sncbt-shadow-card)]",
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
          "min-h-9 rounded-lg font-semibold",
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
        content: "rounded-xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    selectMenu: {
      slots: {
        base: "rounded-lg shadow-[var(--sncbt-shadow-control)]",
        content: "rounded-xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    dropdownMenu: {
      slots: {
        content: "rounded-xl border border-default/80 shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    modal: {
      slots: {
        content: "rounded-2xl border border-default/80 shadow-[var(--sncbt-shadow-overlay)] sm:rounded-3xl",
      },
    },

    badge: {
      slots: {
        base: "rounded-full font-medium",
      },
    },
  },
});
