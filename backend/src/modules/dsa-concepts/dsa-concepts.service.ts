import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { CreateDsaConceptDto, UpdateDsaConceptDto, DsaConceptQueryDto } from './dsa-concepts.schema';

const INITIAL_CONCEPTS = [
  {
    topic: 'Range-based For Loop',
    category: 'STL',
    shortDescription: 'Used to iterate over containers easily.',
    detailedNotes: `### Range-based For Loop in C++
A range-based \`for\` loop simplifies iteration over containers like \`vector\`, \`string\`, \`map\`, \`set\`, etc.

- **Pass by value**: \`for (int x : nums)\` (copies elements)
- **Pass by reference**: \`for (int &x : nums)\` (allows modifying elements in-place)
- **Pass by const reference**: \`for (const auto &x : nums)\` (read-only, avoids copy overhead)`,
    codeSnippet: `for (int x : nums) {
    cout << x;
}

// Modify values:
for (int &x : nums) {
    x *= 2;
}`,
    language: 'C++',
    tags: ['STL', 'Loops', 'C++'],
    difficulty: 'EASY' as const,
    isFavorite: true,
  },
  {
    topic: 'ASCII Value',
    category: 'Strings',
    shortDescription: 'Get integer ASCII code of a character by explicit casting.',
    detailedNotes: `### ASCII Value Conversion
Characters in C++ and C are internally stored as ASCII integer codes.
Casting a \`char\` to \`int\` gives its ASCII representation.

- \`'A'\` = 65
- \`'a'\` = 97
- \`'0'\` = 48`,
    codeSnippet: `char ch = 'A';
cout << (int)ch;`,
    language: 'C++',
    tags: ['Strings', 'ASCII', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Character Index',
    category: 'Strings',
    shortDescription: 'Map lowercase character to a 0-indexed integer (0 to 25).',
    detailedNotes: `### Mapping Character to Index
Subtracting \`'a'\` from a lowercase character gives a 0-based index from 0 (\`'a'\`) to 25 (\`'z'\`).
Useful for hash maps, frequency arrays, and trie structures.`,
    codeSnippet: `int index = ch - 'a';`,
    language: 'C++',
    tags: ['Strings', 'Indexing', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Index to Character',
    category: 'Strings',
    shortDescription: 'Convert a 0-25 integer index back to a lowercase character.',
    detailedNotes: `### Converting Index to Character
Adding \`'a'\` to an integer index (0-25) yields the corresponding lowercase character (\`0\` -> \`'a'\`, \`25\` -> \`'z'\`).`,
    codeSnippet: `char ch = index + 'a';`,
    language: 'C++',
    tags: ['Strings', 'Indexing', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Digit to Integer',
    category: 'Strings',
    shortDescription: 'Convert digit character (\'0\'-\'9\') to numerical integer value.',
    detailedNotes: `### Digit Character to Integer
Subtracting \`'0'\` (ASCII 48) from a digit character (\`'0'\` to \`'9'\`) converts it into its equivalent numeric \`int\` value.`,
    codeSnippet: `int digit = ch - '0';`,
    language: 'C++',
    tags: ['Strings', 'Math', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Integer to Digit Character',
    category: 'Strings',
    shortDescription: 'Convert single-digit integer (0-9) to character (\'0\'-\'9\').',
    detailedNotes: `### Integer to Digit Character
Adding \`'0'\` to a single-digit integer (0 through 9) converts it into its character representation.`,
    codeSnippet: `char ch = digit + '0';`,
    language: 'C++',
    tags: ['Strings', 'Math', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Frequency Array',
    category: 'Arrays',
    shortDescription: 'Store and count occurrences of lowercase letters using an array of size 26.',
    detailedNotes: `### Frequency Array Pattern
An efficient O(N) time and O(1) space technique to count frequencies of characters in a string.`,
    codeSnippet: `int freq[26] = {0};

for (char ch : s)
    freq[ch - 'a']++;`,
    language: 'C++',
    tags: ['Arrays', 'Strings', 'Hashing', 'Pattern'],
    difficulty: 'EASY' as const,
    isFavorite: true,
  },
  {
    topic: 'Traverse String',
    category: 'Strings',
    shortDescription: 'Iterate character by character over a string.',
    detailedNotes: `### String Traversal
Range-based loop to process each character of a string sequentially.`,
    codeSnippet: `for (char ch : s)`,
    language: 'C++',
    tags: ['Strings', 'Loops', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Uppercase to Lowercase',
    category: 'Strings',
    shortDescription: 'Convert an uppercase character to lowercase using tolower() or ASCII arithmetic.',
    detailedNotes: `### Lowercase Conversion
Use built-in \`tolower(ch)\` or subtract \`'A'\` and add \`'a'\`.`,
    codeSnippet: `tolower(ch)

// or

ch - 'A' + 'a'`,
    language: 'C++',
    tags: ['Strings', 'ASCII', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
  {
    topic: 'Lowercase to Uppercase',
    category: 'Strings',
    shortDescription: 'Convert a lowercase character to uppercase using toupper() or ASCII arithmetic.',
    detailedNotes: `### Uppercase Conversion
Use built-in \`toupper(ch)\` or subtract \`'a'\` and add \`'A'\`.`,
    codeSnippet: `toupper(ch)

// or

ch - 'a' + 'A'`,
    language: 'C++',
    tags: ['Strings', 'ASCII', 'Basics'],
    difficulty: 'EASY' as const,
    isFavorite: false,
  },
];

export const seedInitialConceptsIfEmpty = async (userId: string) => {
  const count = await prisma.dsaConcept.count({ where: { userId } });
  if (count === 0) {
    await prisma.dsaConcept.createMany({
      data: INITIAL_CONCEPTS.map(c => ({
        ...c,
        userId,
        referenceLinks: [],
      })),
    });
  }
};

export const getConcepts = async (userId: string, q: DsaConceptQueryDto) => {
  // Ensure initial example concepts exist for new users
  await seedInitialConceptsIfEmpty(userId);

  const where: any = { userId };

  if (q.search) {
    where.OR = [
      { topic: { contains: q.search, mode: 'insensitive' } },
      { shortDescription: { contains: q.search, mode: 'insensitive' } },
      { detailedNotes: { contains: q.search, mode: 'insensitive' } },
      { tags: { hasSome: [q.search] } },
    ];
  }

  if (q.category && q.category !== 'ALL') {
    where.category = q.category;
  }

  if (q.tag) {
    where.tags = { has: q.tag };
  }

  if (q.difficulty) {
    where.difficulty = q.difficulty;
  }

  if (q.favorite === 'true') {
    where.isFavorite = true;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (q.sortBy === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (q.sortBy === 'alphabetical_asc') {
    orderBy = { topic: 'asc' };
  } else if (q.sortBy === 'alphabetical_desc') {
    orderBy = { topic: 'desc' };
  }

  const concepts = await prisma.dsaConcept.findMany({
    where,
    orderBy,
  });

  // Get distinct categories and tags for frontend filter dropdowns
  const allUserConcepts = await prisma.dsaConcept.findMany({
    where: { userId },
    select: { category: true, tags: true, difficulty: true },
  });

  const categories = Array.from(new Set(allUserConcepts.map(c => c.category).filter(Boolean)));
  const tags = Array.from(new Set(allUserConcepts.flatMap(c => c.tags || [])));

  return {
    concepts,
    total: concepts.length,
    categories,
    tags,
  };
};

export const getConceptById = async (userId: string, id: string) => {
  const concept = await prisma.dsaConcept.findFirst({
    where: { id, userId },
  });

  if (!concept) {
    throw new AppError('DSA Concept not found', 404);
  }

  return concept;
};

export const createConcept = async (userId: string, dto: CreateDsaConceptDto) => {
  // Check duplicate topic name
  const existing = await prisma.dsaConcept.findFirst({
    where: {
      userId,
      topic: { equals: dto.topic, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw new AppError(`A concept with topic name "${dto.topic}" already exists.`, 400);
  }

  return prisma.dsaConcept.create({
    data: {
      userId,
      topic: dto.topic,
      category: dto.category,
      shortDescription: dto.shortDescription || null,
      detailedNotes: dto.detailedNotes || null,
      codeSnippet: dto.codeSnippet || null,
      language: dto.language || 'C++',
      leetcodeUrl: dto.leetcodeUrl || null,
      gfgUrl: dto.gfgUrl || null,
      codeforcesUrl: dto.codeforcesUrl || null,
      youtubeUrl: dto.youtubeUrl || null,
      referenceLinks: dto.referenceLinks || [],
      tags: dto.tags || [],
      difficulty: dto.difficulty || 'EASY',
      isFavorite: dto.isFavorite || false,
    },
  });
};

export const updateConcept = async (userId: string, id: string, dto: UpdateDsaConceptDto) => {
  const concept = await getConceptById(userId, id);

  if (dto.topic && dto.topic.toLowerCase() !== concept.topic.toLowerCase()) {
    const existing = await prisma.dsaConcept.findFirst({
      where: {
        userId,
        topic: { equals: dto.topic, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existing) {
      throw new AppError(`A concept with topic name "${dto.topic}" already exists.`, 400);
    }
  }

  return prisma.dsaConcept.update({
    where: { id },
    data: {
      ...(dto.topic !== undefined && { topic: dto.topic }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
      ...(dto.detailedNotes !== undefined && { detailedNotes: dto.detailedNotes }),
      ...(dto.codeSnippet !== undefined && { codeSnippet: dto.codeSnippet }),
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.leetcodeUrl !== undefined && { leetcodeUrl: dto.leetcodeUrl }),
      ...(dto.gfgUrl !== undefined && { gfgUrl: dto.gfgUrl }),
      ...(dto.codeforcesUrl !== undefined && { codeforcesUrl: dto.codeforcesUrl }),
      ...(dto.youtubeUrl !== undefined && { youtubeUrl: dto.youtubeUrl }),
      ...(dto.referenceLinks !== undefined && { referenceLinks: dto.referenceLinks }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
      ...(dto.isFavorite !== undefined && { isFavorite: dto.isFavorite }),
    },
  });
};

export const deleteConcept = async (userId: string, id: string) => {
  await getConceptById(userId, id);
  return prisma.dsaConcept.delete({
    where: { id },
  });
};

export const toggleFavorite = async (userId: string, id: string) => {
  const concept = await getConceptById(userId, id);
  return prisma.dsaConcept.update({
    where: { id },
    data: { isFavorite: !concept.isFavorite },
  });
};
