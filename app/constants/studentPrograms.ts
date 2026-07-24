export const CHED_PROGRAMS: string[] = [
  "BS in Business Administration (Major in Marketing Management)",
  "BS in Business Administration (Major in Financial Management)",
  "BS in Computer Engineering",
  "BS in Computer Science",
  "BS in Criminology",
  "BS in Information Technology",
  "BS in Hospitality Management",
  "BS in Tourism Management",
];

export const THREE_YEAR_DIPLOMA_PROGRAMS:
  string[] = [
    "Diploma in Hospitality Technology (Leading to Bachelor of Science in Hospitality Management)",
    "Diploma in Information Technology (Leading to Bachelor of Science in Information Technology)",
    "Diploma in Computer Technology (Leading to Bachelor of Science in Computer Science)",
    "Diploma in Computer Engineering Technology (Leading to Bachelor of Science in Computer Engineering)",
    "Diploma in Tourism Technology (Leading to Bachelor of Science in Tourism Management)",
  ];

export const STUDENT_PROGRAM_OPTIONS:
  string[] = [
    ...CHED_PROGRAMS,
    ...THREE_YEAR_DIPLOMA_PROGRAMS,
  ];
