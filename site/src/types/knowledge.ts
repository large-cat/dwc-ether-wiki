export interface Section {
  id: string;
  title: string;
  title_cn: string;
  page: number;
  description: string;
}

export interface Chapter {
  id: string;
  number: number | null;
  title: string;
  title_cn: string;
  page_start: number;
  page_end: number;
  description: string;
  sections?: Section[];
}

export interface QAPair {
  question: string;
  answer: string;
  related_chapters: string[];
  keywords: string[];
}

export interface KnowledgeData {
  document: {
    title: string;
    title_cn: string;
    version: string;
    date: string;
    company: string;
    total_pages: number;
    description: string;
  };
  chapters: Chapter[];
  qa_pairs: QAPair[];
}
