
export type StudentEducationalLevel =
  | "College"
  | "Diploma"
  | "Senior High School";

export type LibraryCardStatus =
  | "None"
  | "On Process"
  | "Printed"
  | "Released"
  | "Replacement"
  | "Duplicated";

export interface StudentProgramOption {
  label: string;
  value: string;
  educationalLevel:
    StudentEducationalLevel;
}

export interface StudentYearLevelOption {
  label: string;
  value: number;
}

export const STUDENT_EDUCATIONAL_LEVELS:
  StudentEducationalLevel[] = [
    "College",
    "Diploma",
    "Senior High School",
  ];

export const LIBRARY_CARD_STATUSES:
  LibraryCardStatus[] = [
    "None",
    "On Process",
    "Printed",
    "Released",
    "Replacement",
    "Duplicated",
  ];

export const STUDENT_PROGRAM_OPTIONS: StudentProgramOption[] = [
  {
    label: "BS in Business Administration – Marketing Management",
    value: "BS in Business Administration (Major in Marketing Management)",
    educationalLevel: "College",
  },
  {
    label: "BS in Business Administration – Financial Management",
    value: "BS in Business Administration (Major in Financial Management)",
    educationalLevel: "College",
  },
  {
    label: "BS in Computer Engineering",
    value: "BS in Computer Engineering",
    educationalLevel: "College",
  },
  {
    label: "BS in Computer Science",
    value: "BS in Computer Science",
    educationalLevel: "College",
  },
  {
    label: "BS in Criminology",
    value: "BS in Criminology",
    educationalLevel: "College",
  },
  {
    label: "BS in Information Technology",
    value: "BS in Information Technology",
    educationalLevel: "College",
  },
  {
    label: "BS in Hospitality Management",
    value: "BS in Hospitality Management",
    educationalLevel: "College",
  },
  {
    label: "BS in Tourism Management",
    value: "BS in Tourism Management",
    educationalLevel: "College",
  },

  {
    label: "Diploma in Hospitality Technology",
    value: "Diploma in Hospitality Technology",
    educationalLevel: "Diploma",
  },
  {
    label: "Diploma in Information Technology",
    value: "Diploma in Information Technology",
    educationalLevel: "Diploma",
  },
  {
    label: "Diploma in Computer Technology (DCT)",
    value: "Diploma in Computer Technology",
    educationalLevel: "Diploma",
  },
  {
    label: "Diploma in Computer Engineering Technology",
    value: "Diploma in Computer Engineering Technology",
    educationalLevel: "Diploma",
  },
  {
    label: "Diploma in Tourism Technology",
    value: "Diploma in Tourism Technology",
    educationalLevel: "Diploma",
  },

  /*
   * The supplied membership spreadsheet explicitly shows
   * ACADEMIC - HUMSS. Additional SNCBT strands can be inserted here
   * when their official names are confirmed.
   */
  {
    label: "Humanities and Social Sciences – HUMSS",
    value: "Humanities and Social Sciences - HUMSS",
    educationalLevel: "Senior High School",
  },
  {
    label: "Accountancy, Business Management – ABM",
    value: "Accountancy, Business Management - ABM",
    educationalLevel: "Senior High School",
  },
  {
    label: "General Academic Strand – GAS",
    value: "General Academic Strand - GAS",
    educationalLevel: "Senior High School",
  },
  {
    label: "Science, Technology, Engineering and Mathematics – STEM",
    value: "Science, Technology, Engineering and Mathematics - STEM",
    educationalLevel: "Senior High School",
  },
];

export function programsForLevel(
  level: StudentEducationalLevel,
): StudentProgramOption[] {
  return STUDENT_PROGRAM_OPTIONS.filter(
    (program) =>
      program.educationalLevel ===
      level,
  );
}

export function yearLevelsFor(
  level: StudentEducationalLevel,
): StudentYearLevelOption[] {
  if (
    level ===
    "Senior High School"
  ) {
    return [
      {
        label: "Grade 11",
        value: 11,
      },
      {
        label: "Grade 12",
        value: 12,
      },
    ];
  }

  if (level === "Diploma") {
    return [
      {
        label: "1st Year",
        value: 1,
      },
      {
        label: "2nd Year",
        value: 2,
      },
      {
        label: "3rd Year",
        value: 3,
      },
    ];
  }

  return [
    {
      label: "1st Year",
      value: 1,
    },
    {
      label: "2nd Year",
      value: 2,
    },
    {
      label: "3rd Year",
      value: 3,
    },
    {
      label: "4th Year",
      value: 4,
    },
    {
      label: "5th Year",
      value: 5,
    },
  ];
}

export function yearGradeLabel(
  level: StudentEducationalLevel,
  yearLevel?: number | null,
): string {
  if (!yearLevel) {
    return "";
  }

  if (
    level ===
    "Senior High School"
  ) {
    return `Grade ${yearLevel}`;
  }

  const lastTwo =
    yearLevel % 100;
  const last =
    yearLevel % 10;

  let suffix = "th";

  if (
    lastTwo < 11 ||
    lastTwo > 13
  ) {
    if (last === 1) {
      suffix = "st";
    } else if (last === 2) {
      suffix = "nd";
    } else if (last === 3) {
      suffix = "rd";
    }
  }

  return `${yearLevel}${suffix} Year`;
}
