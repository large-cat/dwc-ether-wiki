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
  };
  export default value;
}

