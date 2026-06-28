export interface DocSection {
  name: string;
  minWords: number;
}

export interface DocFileContract {
  filename: string;
  required: boolean;
  minChars: number;
  sections: DocSection[];
}

export interface DocsPhase3Contract {
  workspace: string;
  docsDir: string;
  files: DocFileContract[];
  maxOrphanedFiles: number;
}

export const DOCS_PHASE3_CONTRACTS: DocsPhase3Contract[] = [
  {
    workspace: '@qyou/api',
    docsDir: 'apps/api/docs',
    maxOrphanedFiles: 1,
    files: [
      { filename: 'development.md', required: true, minChars: 200, sections: [{ name: 'Setup', minWords: 20 }, { name: 'Configuration', minWords: 10 }] },
      { filename: 'architecture.md', required: true, minChars: 300, sections: [{ name: 'Overview', minWords: 30 }, { name: 'Modules', minWords: 20 }, { name: 'Data Flow', minWords: 15 }] },
      { filename: 'testing.md', required: true, minChars: 150, sections: [{ name: 'Running Tests', minWords: 10 }] },
      { filename: 'deployment.md', required: false, minChars: 100, sections: [{ name: 'Environment', minWords: 10 }] },
    ],
  },
  {
    workspace: '@qyou/web',
    docsDir: 'apps/web/docs',
    maxOrphanedFiles: 1,
    files: [
      { filename: 'development.md', required: true, minChars: 200, sections: [{ name: 'Setup', minWords: 20 }] },
      { filename: 'architecture.md', required: true, minChars: 300, sections: [{ name: 'Overview', minWords: 30 }, { name: 'Pages', minWords: 15 }] },
      { filename: 'testing.md', required: true, minChars: 150, sections: [{ name: 'Running Tests', minWords: 10 }] },
    ],
  },
  {
    workspace: '@qyou/mobile',
    docsDir: 'apps/mobile/docs',
    maxOrphanedFiles: 1,
    files: [
      { filename: 'development.md', required: true, minChars: 200, sections: [{ name: 'Setup', minWords: 20 }] },
      { filename: 'architecture.md', required: true, minChars: 300, sections: [{ name: 'Overview', minWords: 30 }, { name: 'Screens', minWords: 15 }] },
    ],
  },
  {
    workspace: '@qyou/shared',
    docsDir: 'packages/shared/docs',
    maxOrphanedFiles: 1,
    files: [
      { filename: 'architecture.md', required: true, minChars: 150, sections: [{ name: 'Overview', minWords: 15 }, { name: 'Exports', minWords: 10 }] },
    ],
  },
  {
    workspace: '@qyou/stellar',
    docsDir: 'packages/stellar/docs',
    maxOrphanedFiles: 1,
    files: [
      { filename: 'architecture.md', required: true, minChars: 150, sections: [{ name: 'Overview', minWords: 15 }, { name: 'Contracts', minWords: 10 }] },
    ],
  },
];

export function getDocsPhase3Contract(name: string): DocsPhase3Contract | undefined {
  return DOCS_PHASE3_CONTRACTS.find((c) => c.workspace === name);
}
