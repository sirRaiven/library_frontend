export type LibraryCardStatus =
  | "None"
  | "On Process"
  | "Printed"
  | "Released"
  | "Replacement"
  | "Duplicated";

export const LIBRARY_CARD_STATUSES: LibraryCardStatus[] = [
  "None",
  "On Process",
  "Printed",
  "Released",
  "Replacement",
  "Duplicated",
];

export function yearGradeLabel(
  levelName: string,
  yearLevel?: number | null,
): string {
  if (!yearLevel) return "";

  if (levelName === "Senior High School") {
    return `Grade ${yearLevel}`;
  }

  const lastTwo = yearLevel % 100;
  const last = yearLevel % 10;
  let suffix = "th";

  if (lastTwo < 11 || lastTwo > 13) {
    if (last === 1) suffix = "st";
    else if (last === 2) suffix = "nd";
    else if (last === 3) suffix = "rd";
  }

  return `${yearLevel}${suffix} Year`;
}
