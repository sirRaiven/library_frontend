export default defineAppConfig({
  ui: {
    colors: {
      primary: "emerald",
      secondary: "teal",
      success: "green",
      info: "sky",
      warning: "amber",
      error: "rose",
      neutral: "slate",
    },

    card: {
      slots: {
        root: [
          "rounded-2xl overflow-hidden",
          "shadow-[var(--sncbt-shadow-card)]",
          "transition-[box-shadow,transform,border-color,background-color] duration-200",
        ].join(" "),
        header: "p-4 sm:px-6",
        body: "p-4 sm:p-6",
        footer: "p-4 sm:px-6",
      },
    },

    button: {
      slots: {
        base: "rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150",
      },
    },

    input: {
      slots: {
        base: "rounded-xl shadow-[var(--sncbt-shadow-control)]",
      },
    },

    textarea: {
      slots: {
        base: "rounded-xl shadow-[var(--sncbt-shadow-control)]",
      },
    },

    select: {
      slots: {
        base: "rounded-xl shadow-[var(--sncbt-shadow-control)]",
        content: "rounded-xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    selectMenu: {
      slots: {
        base: "rounded-xl shadow-[var(--sncbt-shadow-control)]",
        content: "rounded-xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    dropdownMenu: {
      slots: {
        content: "rounded-xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },

    modal: {
      slots: {
        content: "rounded-3xl shadow-[var(--sncbt-shadow-overlay)]",
      },
    },
  },
});
