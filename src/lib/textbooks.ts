// Textbook data for Padanamithra Textbook Hub.
// All textbook links point to official SCERT Kerala sources.
// Padanamithra does NOT host, copy, or redistribute any textbook content.

export type Medium = 'Malayalam' | 'English';
export type Subject = 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics';
export type ClassName = 'Class 9';

export interface Textbook {
  id: string;
  className: ClassName;
  board: string;
  subject: Subject;
  medium: Medium;
  title: string;
  sourceUrl: string;
  sourceName: string;
}

// Official SCERT Kerala Standard 9 textbook page
const SCERT_STANDARD_9 = 'https://scert.kerala.gov.in/standard-9/';
// Official SCERT 2024 revised textbook resources
const SCERT_2024_PART2 = 'https://scert.kerala.gov.in/textbook2024part2/';
const SCERT_SOURCE = 'Official SCERT Kerala';

export const TEXTBOOKS: Textbook[] = [
  // Class 9 — Malayalam Medium
  { id: 'class9-physics-malayalam', className: 'Class 9', board: 'Kerala SCERT', subject: 'Physics', medium: 'Malayalam', title: 'Class 9 Physics (Malayalam Medium)', sourceUrl: SCERT_STANDARD_9, sourceName: SCERT_SOURCE },
  { id: 'class9-chemistry-malayalam', className: 'Class 9', board: 'Kerala SCERT', subject: 'Chemistry', medium: 'Malayalam', title: 'Class 9 Chemistry (Malayalam Medium)', sourceUrl: SCERT_STANDARD_9, sourceName: SCERT_SOURCE },
  { id: 'class9-biology-malayalam', className: 'Class 9', board: 'Kerala SCERT', subject: 'Biology', medium: 'Malayalam', title: 'Class 9 Biology (Malayalam Medium)', sourceUrl: SCERT_STANDARD_9, sourceName: SCERT_SOURCE },
  { id: 'class9-mathematics-malayalam', className: 'Class 9', board: 'Kerala SCERT', subject: 'Mathematics', medium: 'Malayalam', title: 'Class 9 Mathematics (Malayalam Medium)', sourceUrl: SCERT_STANDARD_9, sourceName: SCERT_SOURCE },
  // Class 9 — English Medium
  { id: 'class9-physics-english', className: 'Class 9', board: 'Kerala SCERT', subject: 'Physics', medium: 'English', title: 'Class 9 Physics (English Medium)', sourceUrl: SCERT_2024_PART2, sourceName: SCERT_SOURCE },
  { id: 'class9-chemistry-english', className: 'Class 9', board: 'Kerala SCERT', subject: 'Chemistry', medium: 'English', title: 'Class 9 Chemistry (English Medium)', sourceUrl: SCERT_2024_PART2, sourceName: SCERT_SOURCE },
  { id: 'class9-biology-english', className: 'Class 9', board: 'Kerala SCERT', subject: 'Biology', medium: 'English', title: 'Class 9 Biology (English Medium)', sourceUrl: SCERT_2024_PART2, sourceName: SCERT_SOURCE },
  { id: 'class9-mathematics-english', className: 'Class 9', board: 'Kerala SCERT', subject: 'Mathematics', medium: 'English', title: 'Class 9 Mathematics (English Medium)', sourceUrl: SCERT_2024_PART2, sourceName: SCERT_SOURCE },
];

export const SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Biology', 'Mathematics'];
export const MEDIUMS: Medium[] = ['Malayalam', 'English'];
export const CLASSES: ClassName[] = ['Class 9'];

export interface TutorContextPayload {
  subject: Subject;
  medium: Medium;
  className: ClassName;
  textbookTitle: string;
}
