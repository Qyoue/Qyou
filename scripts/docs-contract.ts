export interface DocRequirement {
  file: string;
  required: boolean;
  minSize: number;
  sections: string[];
}

export interface WorkspaceDocContract {
  workspace: string;
  docsDir: string;
  requirements: DocRequirement[];
}

export const DOC_CONTRACTS: WorkspaceDocContract[] = [
  {
    workspace: '@qyou/api',
    docsDir: 'apps/api/docs',
    requirements: [
      { file: 'development.md', required: true, minSize: 100, sections: ['Setup', 'Configuration', 'Running'] },
      { file: 'architecture.md', required: true, minSize: 200, sections: ['Overview', 'Modules', 'Data Flow'] },
      { file: 'testing.md', required: true, minSize: 100, sections: ['Test Setup', 'Running Tests', 'Fixtures'] },
      { file: 'deployment.md', required: false, minSize: 100, sections: ['Environment', 'Deploy Steps'] },
    ],
  },
  {
    workspace: '@qyou/web',
    docsDir: 'apps/web/docs',
    requirements: [
      { file: 'development.md', required: true, minSize: 100, sections: ['Setup', 'Configuration', 'Running'] },
      { file: 'architecture.md', required: true, minSize: 200, sections: ['Overview', 'Pages', 'Components'] },
      { file: 'testing.md', required: true, minSize: 100, sections: ['Test Setup', 'Running Tests'] },
    ],
  },
  {
    workspace: '@qyou/mobile',
    docsDir: 'apps/mobile/docs',
    requirements: [
      { file: 'development.md', required: true, minSize: 100, sections: ['Setup', 'Configuration', 'Running'] },
      { file: 'architecture.md', required: true, minSize: 200, sections: ['Overview', 'Screens', 'Navigation'] },
    ],
  },
  {
    workspace: '@qyou/shared',
    docsDir: 'packages/shared/docs',
    requirements: [
      { file: 'architecture.md', required: true, minSize: 100, sections: ['Overview', 'Exports'] },
    ],
  },
  {
    workspace: '@qyou/stellar',
    docsDir: 'packages/stellar/docs',
    requirements: [
      { file: 'architecture.md', required: true, minSize: 100, sections: ['Overview', 'Contracts'] },
    ],
  },
];

export function getDocContract(name: string): WorkspaceDocContract | undefined {
  return DOC_CONTRACTS.find((c) => c.workspace === name);
}

export function validateDocContents(
  content: string,
  requirement: DocRequirement,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (content.length < requirement.minSize) {
    errors.push(`${requirement.file}: too short (${content.length} chars, min ${requirement.minSize})`);
  }

  for (const section of requirement.sections) {
    if (!content.toLowerCase().includes(section.toLowerCase())) {
      errors.push(`${requirement.file}: missing section "${section}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
