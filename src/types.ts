export interface Routine {
  id: string;
  name: string;
  frequencyPerWeek: number;
  metadata: string;
  order: number;
  createdAt: number;
  // Streak tracking (weekly streaks - consecutive weeks meeting frequency target)
  currentStreak: number;
  longestStreak: number;
  lastStreakWeek: number | null; // week-start timestamp of last streak week
  streakGraceUsed: boolean; // true if grace period was used (missed 1 week)
}

export interface Completion {
  id: string;
  routineId: string;
  completedAt: number;
  weekStart: number;
}

export interface RoutineWithProgress extends Routine {
  completedThisWeek: number;
  completedToday: boolean;
  streakAtRisk: boolean; // true if using grace period (missed last week but streak preserved)
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  sectionId: string | null;
  order: number;
  indent: number; // 0 = no indent, 1 = one level, etc.
  createdAt: number;
  completedAt: number | null; // timestamp when marked complete
  isBullet?: boolean; // true = bullet note (no checkbox), false/undefined = regular todo
}

export interface ToggleSection {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
  createdAt: number;
}

export interface GoalSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  subtasks: GoalSubtask[];
  order: number;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  gratefulFor: string;
  makeItGreat: string;
  affirmations: string;
  amazingThings: string; // placeholder for evening question 1
  learned: string;
  createdAt: number;
  updatedAt: number;
}

export interface MonthlyReflection {
  id: string;
  month: string; // YYYY-MM format
  overall: string;
  challenges: string;
  lookingForward: string;
  ratingOverall: number;
  ratingHealth: number;
  ratingCareer: number;
  ratingFinances: number;
  ratingFriends: number;
  ratingFamily: number;
  ratingRomance: number;
  ratingFun: number;
  ratingGrowth: number;
  ratingMentalHealth: number;
  ratingSpirituality: number;
  ratingEnvironment: number;
  ratingProductivity: number;
  notesOverall: string;
  notesHealth: string;
  notesCareer: string;
  notesFinances: string;
  notesFriends: string;
  notesFamily: string;
  notesRomance: string;
  notesFun: string;
  notesGrowth: string;
  notesMentalHealth: string;
  notesSpirituality: string;
  notesEnvironment: string;
  notesProductivity: string;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingNote {
  id: string;
  source: string; // URL or name
  content: string;
  createdAt: number;
}

export type FriendTier = 1 | 2 | 3 | 4;

export const FRIEND_TIER_LABELS: Record<FriendTier, string> = {
  1: 'Inner Circle',
  2: 'Close Friends',
  3: 'Friends',
  4: 'Acquaintances',
};

export interface Friend {
  id: string;
  name: string;
  notes: string;
  tier: FriendTier;
  lastContact: number | null;
  order: number;
  createdAt: number;
}

export interface FriendConnection {
  id: string;
  friendId1: string;
  friendId2: string;
  createdAt: number;
}

export interface CookieJarContent {
  id: string;
  content: string;
  updatedAt: number;
}

export interface FinancesContent {
  id: string;
  content: string;
  updatedAt: number;
}

export interface Hobby {
  name: string;
  frequency: string; // e.g., 'daily', 'weekly', '2x-week'
}

export interface AppSettings {
  autoSortCompletedTodos: boolean;
  confettiEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  anthropicApiKey: string;
  mapboxToken: string;
  // AI context settings
  userRole: string;
  aiHelpPreferences: string[]; // multi-select
  companyStage: string;
  teamSize: string;
  energyLevel: string;
  // Personal info
  firstName: string;
  lastName: string;
  location: string; // city, country (combined display)
  customCity: string; // for custom city entry
  customCountry: string; // for custom country selection
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  heightUnit: 'ft' | 'cm' | '';
  heightFeet: string;
  heightInches: string;
  heightCm: string;
  weightUnit: 'lbs' | 'kg' | '';
  weightValue: string;
  bodyFatPercentage: string;
  bodyFatMethod: string;
  hobbies: Hobby[];
  financeSheetUrl: string;
  // Personality
  mbtiType: string;
  enneagramType: string;
  big5Openness: string;
  big5Conscientiousness: string;
  big5Extraversion: string;
  big5Agreeableness: string;
  big5Neuroticism: string;
  // Background
  upbringing: string;
  values: string;
  strengths: string;
  weaknesses: string;
  loveLanguage: string;
  attachmentStyle: string;
}

export const BODY_FAT_METHOD_OPTIONS = [
  { value: 'dexa', label: 'DEXA Scan' },
  { value: 'bod-pod', label: 'Bod Pod' },
  { value: 'hydrostatic', label: 'Hydrostatic (underwater)' },
  { value: 'bia', label: 'Bioelectrical Impedance (scale)' },
  { value: 'calipers', label: 'Skinfold Calipers' },
  { value: 'navy', label: 'Navy Method (tape measure)' },
  { value: 'visual', label: 'Visual Estimate' },
];

export const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark',
  'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Macau', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
  'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'UAE', 'Uganda', 'UK', 'Ukraine', 'Uruguay', 'USA',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia',
  'Zimbabwe',
];

export const DEFAULT_SETTINGS: AppSettings = {
  autoSortCompletedTodos: false,
  confettiEnabled: true,
  fontSize: 'medium',
  anthropicApiKey: '',
  mapboxToken: '',
  userRole: '',
  aiHelpPreferences: [],
  companyStage: '',
  teamSize: '',
  energyLevel: '',
  firstName: '',
  lastName: '',
  location: '',
  customCity: '',
  customCountry: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  heightUnit: '',
  heightFeet: '',
  heightInches: '',
  heightCm: '',
  weightUnit: '',
  weightValue: '',
  bodyFatPercentage: '',
  bodyFatMethod: '',
  hobbies: [],
  financeSheetUrl: '',
  mbtiType: '',
  enneagramType: '',
  big5Openness: '',
  big5Conscientiousness: '',
  big5Extraversion: '',
  big5Agreeableness: '',
  big5Neuroticism: '',
  upbringing: '',
  values: '',
  strengths: '',
  weaknesses: '',
  loveLanguage: '',
  attachmentStyle: '',
};

export const AI_HELP_OPTIONS = [
  { value: 'prioritization', label: 'Prioritization help' },
  { value: 'accountability', label: 'Accountability' },
  { value: 'brainstorming', label: 'Brainstorming' },
  { value: 'reflection', label: 'Just listen & reflect' },
  { value: 'challenge', label: 'Challenge my thinking' },
];

export const COMPANY_STAGE_OPTIONS = [
  { value: 'pre-revenue', label: 'Pre-revenue' },
  { value: 'under-100k', label: '< $100K' },
  { value: '100k-500k', label: '$100K – $500K' },
  { value: '500k-1m', label: '$500K – $1M' },
  { value: '1m-5m', label: '$1M – $5M' },
  { value: '5m-10m', label: '$5M – $10M' },
  { value: '10m-plus', label: '$10M+' },
];

export const TEAM_SIZE_OPTIONS = [
  { value: 'solo', label: 'Solo' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-20', label: '6-20 people' },
  { value: '21-50', label: '21-50 people' },
  { value: '50-plus', label: '50+ people' },
];

export const ENERGY_LEVEL_OPTIONS = [
  { value: 'low', label: 'Low - tired, need to pace myself' },
  { value: 'moderate', label: 'Moderate - steady, normal capacity' },
  { value: 'good', label: 'Good - feeling capable and focused' },
  { value: 'high', label: 'High - energized, excited to work' },
];

export const HOBBY_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '4-6x-week', label: '4-6x per week' },
  { value: '2-3x-week', label: '2-3x per week' },
  { value: 'weekly', label: 'Weekly' },
  { value: '2-3x-month', label: '2-3x per month' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'occasionally', label: 'Occasionally' },
];

export interface FriendSection {
  id: string;
  name: string;
  tier: number;
}

export const DEFAULT_SECTIONS: FriendSection[] = [
  { id: 'close', name: 'Close Friends', tier: 1 },
  { id: 'friends', name: 'Friends', tier: 2 },
  { id: 'nofollow', name: 'No Follow Up', tier: 3 },
];
