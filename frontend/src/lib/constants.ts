export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const DSA_TOPICS = [
  'ARRAYS', 'STRINGS', 'HASHING', 'LINKED_LIST', 'STACK', 'QUEUE',
  'TREE', 'BST', 'HEAP', 'GRAPH', 'DP', 'GREEDY', 'BACKTRACKING',
  'TRIE', 'SEGMENT_TREE', 'BINARY_SEARCH', 'SLIDING_WINDOW', 'TWO_POINTERS',
] as const;

export const DSA_PLATFORMS = ['LEETCODE', 'GFG', 'CODEFORCES', 'CODECHEF', 'HACKERRANK'] as const;
export const DSA_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export const TASK_SCOPES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const JOB_STATUSES = ['WISHLIST', 'APPLIED', 'OA', 'INTERVIEW', 'REJECTED', 'OFFER', 'SELECTED'] as const;

export const LEARNING_CATEGORIES = ['BACKEND', 'DEVOPS', 'BLOCKCHAIN', 'AUTOMATION', 'SYSTEM_DESIGN', 'AI'] as const;
export const LEARNING_TYPES = ['NOTE', 'VIDEO', 'ARTICLE', 'PDF', 'IMAGE', 'CHEAT_SHEET', 'PROJECT', 'ROADMAP'] as const;

export const PLACEMENT_SECTIONS = [
  'DBMS', 'OS', 'CN', 'OOP', 'SYSTEM_DESIGN', 'APTITUDE',
  'QUANT', 'REASONING', 'VERBAL', 'HR', 'INTERVIEW_EXPERIENCE',
] as const;

export const BOOK_CATEGORIES = ['DSA', 'BACKEND', 'DEVOPS', 'BLOCKCHAIN', 'SYSTEM_DESIGN', 'PRODUCTIVITY'] as const;
export const READING_STATUSES = ['WANT_TO_READ', 'READING', 'COMPLETED', 'PAUSED'] as const;

export const RESOURCE_TYPES = [
  'YOUTUBE', 'WEBSITE', 'PDF', 'IMAGE', 'COURSE', 'PLAYLIST', 'BLOG', 'DOCUMENTATION', 'CHEAT_SHEET'
] as const;

export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 90];

export const SIDEBAR_NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Planner', path: '/planner', icon: 'CalendarCheck' },
  { label: 'DSA Tracker', path: '/dsa', icon: 'Code2' },
  { label: 'Notes', path: '/notes', icon: 'FileText' },
  { label: 'Learning Hub', path: '/learning', icon: 'GraduationCap' },
  { label: 'Resources', path: '/resources', icon: 'BookMarked' },
  { label: 'Placement Prep', path: '/placement', icon: 'Target' },
  { label: 'Job Tracker', path: '/jobs', icon: 'Briefcase' },
  { label: 'Books', path: '/books', icon: 'Library' },
  { label: 'GitHub Activity', path: '/github', icon: 'Github' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart2' },
  { label: 'Knowledge Graph', path: '/graph', icon: 'Network' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
];
