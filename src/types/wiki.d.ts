// Type declarations for wiki/ and tools/ JSON imports

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
      total_questions_answered: number;
      documents?: Array<{
        filename: string;
        title: string;
        page_count: number;
        description: string;
        added_at: string;
        status: string;
      }>;
    };
    chapters: Array<{
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
    }>;
    cache: {
      _description: string;
      entries: Record<string, string>;
      total_chars_cached: number;
    };
    leaves: {
      _description: string;
      _format: string;
      entries: Array<{
        id: string;
        chapter_id: string;
        chapter_title: string;
        topic: string;
        content: string;
        source: string;
        confidence: string;
        created_at: string;
        access_count: number;
      }>;
    };
    qa_log: {
      _description: string;
      entries: Array<{
        timestamp: string;
        question: string;
        chapter_ids: string[];
        context_preview: string;
      }>;
    };
  };
  export default value;
}

declare module '@wiki/knowledge_data.json' {
  const value: {
    document: {
      title: string;
      title_cn: string;
      version: string;
      date: string;
      company: string;
      total_pages: number;
      description: string;
    };
    chapters: Array<{
      id: string;
      number?: number;
      title: string;
      title_cn: string;
      page_start: number;
      page_end: number;
      description: string;
      sections?: Array<{
        id: string;
        title: string;
        title_cn: string;
        page: number;
        description: string;
      }>;
    }>;
    qa_pairs: Array<{
      question: string;
      answer: string;
      related_chapters: string[];
      keywords: string[];
    }>;
  };
  export default value;
}
