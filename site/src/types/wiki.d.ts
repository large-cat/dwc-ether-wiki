// Type declarations for wiki/ and tools/ JSON imports

export interface Leaf {
  id: string;
  topic: string;
  content_path: string[];
  source: string;
  confidence: string;
  created_at: string;
  updated_at?: string;
  status: string;
}

export interface Chapter {
  id: string;
  number?: number;
  title: string;
  title_cn: string;
  page_start: number;
  page_end: number;
  status: string;
  reads_count?: number;
  last_read?: string;
  description: string;
  leaves_config: string;
  leaf_count: number;
}

export interface ChapterLeavesConfig {
  chapter_id: string;
  chapter_title: string;
  leaves: Leaf[];
}

declare module '@wiki/growing_knowledge_tree.json' {
  const value: {
    _schema: {
      version: string;
      description: string;
      principle: string;
    };
    metadata: {
      document: string;
      document_path: string;
      version: string;
      date: string;
      company: string;
      total_pages: number;
      knowledge_tree_version: string;
      created_at: string;
      last_updated: string;
      total_reads_from_pdf: number;
      total_knowledge_leaves_created: number;
      total_questions_answered?: number;
      documents?: Array<{
        filename: string;
        title: string;
        page_count: number;
        description: string;
        added_at: string;
        status: string;
      }>;
    };
    chapters: Chapter[];
  };
  export default value;
}
