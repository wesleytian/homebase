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
  completionsToday: number;
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
  isToggle?: boolean; // true = collapsible toggle header, hides indented children when collapsed
  toggleCollapsed?: boolean; // for toggle todos, whether children are hidden
}

export interface ToggleSection {
  id: string;
  name: string;
  collapsed: boolean;
  order: number;
  createdAt: number;
  parentId?: string | null;
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
  overallLife: string;
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
  // Health page
  healthTestNotes?: string;
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

export type HealthSection = 'fact' | 'supplement' | 'medkit' | 'test' | 'record';

export interface HealthItem {
  id: string;
  section: HealthSection;
  name: string;
  value: string; // for tests: CSV of YYYY-MM-DD dates (history of when test was done)
  link: string;
  date: string;  // for tests: CSV of scheduled month numbers (1-12)
  whereAt: string;
  frequency: string;
  emoji: string;
  priority: string; // '' = normal, 'low' = later in life
  notes: string;   // user-editable rationale / research per item
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export const TEST_FREQUENCIES: { value: string; label: string; tone: string }[] = [
  { value: '', label: 'Frequency…', tone: 'neutral' },
  { value: 'monthly', label: 'Monthly', tone: 'violet' },
  { value: 'quarterly', label: 'Every 3 months', tone: 'blue' },
  { value: 'semi-annual', label: 'Every 6 months', tone: 'teal' },
  { value: 'annual', label: 'Annual', tone: 'green' },
  { value: 'biennial', label: 'Every 2 years', tone: 'orange' },
  { value: 'one-time', label: 'One-time', tone: 'gold' },
  { value: 'as-needed', label: 'As needed', tone: 'neutral' },
];

export function frequencyTone(value: string): string {
  return TEST_FREQUENCIES.find((f) => f.value === value)?.tone || 'neutral';
}

export const HEALTH_SECTION_META: { key: HealthSection; label: string; icon: string; hint: string; schedule?: 'months' }[] = [
  { key: 'fact', label: 'Quick Facts', icon: '🩺', hint: 'Blood type, allergies, conditions, emergency contact…' },
  { key: 'supplement', label: 'Supplements', icon: '💊', hint: 'Daily vitamins, prescriptions, dosages' },
  { key: 'medkit', label: 'Medkit', icon: '🧰', hint: "What's in your first-aid kit / travel kit" },
  { key: 'test', label: 'Tests & Scans', icon: '🧪', hint: 'Recurring scans — pick the months you do them', schedule: 'months' },
  { key: 'record', label: 'Records & Links', icon: '🔗', hint: 'Kaiser portal, 23andMe, vaccination records…' },
];

export interface TestSuggestion {
  name: string;
  emoji: string;
  frequency: string;
  priority?: 'low';
  rationale: string; // short one-liner
  details: string;   // longer paragraphs; pre-fills the user's notes when added
}

export const TEST_SUGGESTIONS: TestSuggestion[] = [
  {
    name: 'Annual physical', emoji: '🩺', frequency: 'annual',
    rationale: 'Overall checkup with your primary care provider.',
    details: `A general yearly visit with your primary care provider. Covers vitals (BP, heart rate, BMI), a physical exam, and a chance to discuss anything new since your last visit. Often paired with bloodwork ordered at the same visit.\n\nMostly low-value as a pure screening exercise if you're young and healthy, but the relationship with a PCP becomes increasingly useful as you age. Start in your 20s, annually.`,
  },
  {
    name: 'Bloodwork', emoji: '🩸', frequency: 'annual',
    rationale: 'Comprehensive blood panel — metabolic, kidney, thyroid, lipids, A1c.',
    details: `A standard comprehensive panel typically includes:\n• CBC (complete blood count) — anemia, infection, immune signals\n• CMP (comprehensive metabolic panel) — kidney, liver, electrolytes, glucose\n• A1c — 3-month average blood sugar\n• TSH (+ free T4 if abnormal) — thyroid\n• Iron / ferritin\n\nFor longevity-focused optimization, often add:\n• ApoB + Lp(a) — cardiovascular risk (better than LDL alone)\n• hsCRP / homocysteine — inflammation markers\n• Fasting insulin — metabolic health pre-diabetes signal\n• Vitamin D, B12\n\nCadence: annually from your 20s. Every 3–6 months if actively trying to move a specific marker.`,
  },
  {
    name: 'Lipid panel', emoji: '🫀', frequency: 'annual',
    rationale: 'Cardiovascular risk markers — especially ApoB and Lp(a).',
    details: `Standard lipid panel covers total cholesterol, LDL-C, HDL-C, triglycerides.\n\nAdvanced lipid panel adds ApoB (number of atherogenic particles) and Lp(a) (a genetically determined particle that confers independent cardiovascular risk). ApoB is increasingly viewed as a better predictor of cardiovascular risk than LDL-C alone.\n\nLp(a) is checked once in a lifetime — it's basically fixed by your genetics. ApoB is tracked annually as a target.\n\nIf you do a comprehensive bloodwork panel that already includes these, you don't need a separate lipid panel.`,
  },
  {
    name: 'Hormone panel', emoji: '⚗️', frequency: 'annual',
    rationale: 'Trend testosterone, cortisol, vitamin D, thyroid.',
    details: `Tracks the major endocrine markers over time:\n• Total + free testosterone\n• Cortisol (morning)\n• Vitamin D (25-OH)\n• Thyroid (TSH, free T4, sometimes free T3 and reverse T3)\n• SHBG\n• DHEA-S\n\nFor longevity work, the value is in trend lines, not point-in-time interpretation. Worth knowing your baseline early and watching for drift over the years.`,
  },
  {
    name: 'DEXA scan', emoji: '🦴', frequency: 'annual',
    rationale: 'Body composition (visceral fat, muscle mass) + bone density.',
    details: `A DEXA (dual-energy X-ray absorptiometry) measures two important things:\n\n1. Bone mineral density — early signal for osteoporosis risk.\n2. Body composition — specifically visceral adipose tissue (the metabolically active fat around your organs), subcutaneous fat, and lean muscle mass.\n\nVisceral fat is a strong predictor of metabolic syndrome, type-2 diabetes, and cardiovascular disease — BMI doesn't capture this. A DEXA gives you a direct number you can trend.\n\nCadence: annually from your 30s is a reasonable cadence to track trends. Many longevity practitioners (Attia, Sinclair) recommend annual.\n\nWhere: Bodyspec ($45), DexaFit, or any imaging center. Often more expensive at a hospital but covered if ordered for osteoporosis.`,
  },
  {
    name: 'VO2max', emoji: '🫁', frequency: 'annual',
    rationale: 'Strongest single predictor of all-cause mortality.',
    details: `VO2max is the maximum rate of oxygen your body can use during intense exercise — a direct measure of cardiorespiratory fitness.\n\nResearch (most notably Mandsager et al., 2018) shows VO2max is the strongest single predictor of all-cause mortality across age groups. The difference between low and elite VO2max is comparable to never-smoker vs. heavy-smoker for life expectancy.\n\nThe test itself: 8–12 minutes on a treadmill or bike, wearing a mask that measures gas exchange. Get a real VO2max test (not estimated from a smartwatch).\n\nCadence: annually. Goal is to climb percentile bands for your age group (elite = top 2.5%). Trend > absolute number.\n\nWhere: Most performance / exercise physiology labs offer it ($150–$300).`,
  },
  {
    name: 'Eye exam', emoji: '👁️', frequency: 'biennial',
    rationale: 'Vision check + retinal health.',
    details: `Standard eye exam covers visual acuity, intraocular pressure (glaucoma screening), and a dilated retinal exam (catches diabetic retinopathy, macular degeneration, retinal tears).\n\nCadence: every 1–2 years if you have no vision issues; annually if you wear corrective lenses or have a family history of glaucoma / macular degeneration. After 60, annually.`,
  },
  {
    name: 'Dental cleaning', emoji: '🦷', frequency: 'semi-annual',
    rationale: 'Oral health → cardiovascular + cognitive health.',
    details: `Periodontal disease (gum disease) is increasingly linked to cardiovascular disease, type-2 diabetes, and possibly Alzheimer's via systemic inflammation. The treatment is cheap: brushing, flossing, and cleanings every 6 months.\n\nMost dentists also do an annual x-ray and oral cancer screening at one of the two yearly visits.`,
  },
  {
    name: 'Derm test', emoji: '🧴', frequency: 'annual',
    rationale: 'Full-body skin / mole check — skin cancer screening.',
    details: `A full-body skin exam by a dermatologist catches early signs of melanoma, basal cell carcinoma, and squamous cell carcinoma. Melanoma in particular is highly treatable if caught early and aggressive if not.\n\nCadence: annually for most people. More often if you're fair-skinned, have many moles, family history of skin cancer, or significant sun exposure history (Bay Area / Southern California / surfers / outdoor athletes).\n\nKeep your own photos of moles for comparison between visits.`,
  },
  // One-time baselines
  {
    name: 'Sleep study', emoji: '😴', frequency: 'one-time',
    rationale: 'Baseline check for sleep apnea.',
    details: `A sleep study (polysomnography) checks for sleep apnea — pauses in breathing during sleep that fragment sleep architecture and are linked to cardiovascular disease, cognitive decline, and reduced life expectancy.\n\nMany people with sleep apnea don't realize they have it; daytime sleepiness, loud snoring, and waking up unrefreshed are common signs but not always present.\n\nOptions:\n• At-home test (WatchPAT, Lofta) — $200–$300, easier, sufficient for most people without complex conditions\n• In-lab study — gold standard but inconvenient\n\nCadence: one-time baseline. Re-test if symptoms develop or if you gain significant weight.`,
  },
  {
    name: 'Genetic test', emoji: '🧬', frequency: 'one-time',
    rationale: 'Carrier status, hereditary disease risk, pharmacogenomics.',
    details: `Direct-to-consumer or clinical genetic testing. Options:\n\n• 23andMe / AncestryDNA — limited but cheap; useful for ancestry, some carrier status, raw data to upload elsewhere\n• Nucleus Genomics — whole-genome with clinical-grade reports; more expensive but more comprehensive\n• Color / Invitae — clinical-grade hereditary cancer + cardiac panels via doctor order\n\nUseful for:\n• Carrier status (planning kids)\n• BRCA1/2, Lynch syndrome (hereditary cancers)\n• Pharmacogenomics (how you metabolize common drugs)\n• APOE genotype (Alzheimer's risk — see separate entry)\n\nCadence: one-time. Re-analyses are getting cheaper, so you might re-process old data periodically as new associations are discovered.`,
  },
  {
    name: 'APOE genotype', emoji: '🧠', frequency: 'one-time',
    rationale: "Alzheimer's risk variant.",
    details: `APOE is a gene with three common variants: ε2, ε3, ε4. Having one ε4 allele roughly doubles to triples Alzheimer's risk; two copies (ε4/ε4) is the highest known genetic risk factor for late-onset Alzheimer's.\n\nKnowing your status is controversial — there's no proven treatment for Alzheimer's, so the value is in earlier and more aggressive lifestyle/cognitive prevention (exercise, sleep, cardiovascular health, hearing protection).\n\nMany people choose not to know. If you do want to know, you can get this from a 23andMe raw data download (free if you've already done 23andMe) or via a clinical test through your doctor.\n\nCadence: one-time. Your genotype doesn't change.`,
  },
  // Later in life
  {
    name: 'Colonoscopy', emoji: '🩻', frequency: 'biennial', priority: 'low',
    rationale: 'Colorectal cancer screening.',
    details: `Gold-standard screening for colorectal cancer — direct visualization of the colon with the ability to remove polyps in the same procedure.\n\nGuidelines (US):\n• Start at 45 for average-risk adults (used to be 50; was lowered due to rising rates in younger adults).\n• Earlier (often 40) if first-degree family history of colon cancer or polyps.\n• If your colonoscopy is clean → repeat every 10 years.\n• If polyps were found → repeat in 3–5 years depending on type.\n\nNon-invasive alternatives: Cologuard (every 3 yrs) or FIT (annually). Less sensitive but easier; positive result still requires a colonoscopy.`,
  },
  {
    name: 'Prostate (PSA)', emoji: '🧪', frequency: 'annual', priority: 'low',
    rationale: 'PSA blood test for prostate cancer screening.',
    details: `Simple blood test for prostate-specific antigen, a marker that can be elevated in prostate cancer (and also in BPH and prostatitis — it's non-specific).\n\nGuidelines vary. USPSTF: shared decision-making at 55–69. Many urologists recommend earlier baseline (40–45) with annual tracking, since trend over time is more informative than single values.\n\nThe controversy: PSA screening leads to over-diagnosis of indolent cancers. Counterbalanced by more recent approaches (PSA velocity, MRI-targeted biopsy) that avoid unnecessary biopsies.`,
  },
  {
    name: 'Mammogram', emoji: '🎀', frequency: 'annual', priority: 'low',
    rationale: 'Breast cancer screening.',
    details: `Mammogram (X-ray of breast tissue) is the standard breast cancer screening.\n\nGuidelines:\n• USPSTF: biennial starting at 40.\n• American Cancer Society: annual at 45, biennial at 55+.\n• Earlier (often 30s) and supplemented with breast MRI if BRCA1/2 carrier or strong family history.\n\nFor dense breasts, supplemental ultrasound or MRI may be recommended (mammograms are less sensitive in dense tissue).`,
  },
  {
    name: 'Bone density', emoji: '🦴', frequency: 'biennial', priority: 'low',
    rationale: 'Osteoporosis screening (distinct from longevity-DEXA).',
    details: `Same technology as a longevity-DEXA, but specifically focused on bone mineral density of the hip and spine, with formal T-score reporting (used to diagnose osteopenia and osteoporosis).\n\nGuidelines:\n• Women: routine at 65 (earlier with risk factors like low body weight, early menopause, smoking, steroid use).\n• Men: routine at 70 (earlier with risk factors).\n\nIf you're already doing annual full-DEXA for body composition, you usually get bone density numbers as part of that. This entry is for when you want the formal clinical bone-only assessment.`,
  },
  {
    name: 'Hearing test', emoji: '👂', frequency: 'biennial', priority: 'low',
    rationale: 'Hearing loss correlates with cognitive decline.',
    details: `Hearing loss is one of the strongest modifiable risk factors for dementia (Lancet 2020 commission). Untreated hearing loss accelerates cognitive decline; using hearing aids significantly mitigates the risk.\n\nBaseline at 50, then every 1–3 years (more often after 60). Sooner if you notice difficulty in noisy environments or family says you're asking them to repeat things.`,
  },
  {
    name: 'Cardiac calcium scan', emoji: '❤️', frequency: 'one-time', priority: 'low',
    rationale: 'CT measuring coronary artery calcium — atherosclerosis baseline.',
    details: `Low-dose CT scan that measures calcium deposits in the coronary arteries. A calcium score of 0 means very low cardiovascular risk over the next 10 years; high scores indicate established atherosclerosis.\n\nUseful as a one-time baseline at 40–50 (men) or 45–55 (women) to stratify cardiovascular risk and decide whether to be more aggressive with lifestyle and lipid management.\n\nIf the initial scan is non-zero / elevated, repeat in 3–5 years to assess progression. If zero and you don't have other major risk factors, you can defer for many years.\n\nCost: usually $100–$300, often not covered by insurance. Many hospitals run promotions.`,
  },
];

// Common name variations that should map to a canonical suggestion
const SUGGESTION_ALIASES: Record<string, string> = {
  'blood test': 'Bloodwork',
  'blood work': 'Bloodwork',
  'blood panel': 'Bloodwork',
  'bloods': 'Bloodwork',
  'bloodwork (comprehensive)': 'Bloodwork',
  'lipid': 'Lipid panel',
  'lipids': 'Lipid panel',
  'cholesterol': 'Lipid panel',
  'apob': 'Lipid panel',
  'lipid panel (advanced)': 'Lipid panel',
  'hormones': 'Hormone panel',
  'hormone': 'Hormone panel',
  'testosterone': 'Hormone panel',
  'dexa': 'DEXA scan',
  'body comp': 'DEXA scan',
  'vo2': 'VO2max',
  'vo2 max': 'VO2max',
  'vo2max test': 'VO2max',
  'cardio test': 'VO2max',
  'eye': 'Eye exam',
  'optometry': 'Eye exam',
  'vision': 'Eye exam',
  'dental': 'Dental cleaning',
  'dental clean': 'Dental cleaning',
  'dental exam': 'Dental cleaning',
  'dentist': 'Dental cleaning',
  'cleaning': 'Dental cleaning',
  'derm': 'Derm test',
  'dermatology': 'Derm test',
  'skin': 'Derm test',
  'skin check': 'Derm test',
  'mole check': 'Derm test',
  'skin check (dermatology)': 'Derm test',
  'physical': 'Annual physical',
  'checkup': 'Annual physical',
  'pcp visit': 'Annual physical',
  'sleep': 'Sleep study',
  'sleep test': 'Sleep study',
  'apnea': 'Sleep study',
  '23andme': 'Genetic test',
  'genetics': 'Genetic test',
  'nucleus': 'Genetic test',
  'dna test': 'Genetic test',
  'genetic test (23andme / nucleus)': 'Genetic test',
  'apoe': 'APOE genotype',
  'colon': 'Colonoscopy',
  'psa': 'Prostate (PSA)',
  'prostate': 'Prostate (PSA)',
  'mammo': 'Mammogram',
  'mammogram / chest mri': 'Mammogram',
  'bone density (full)': 'Bone density',
  'bone density (osteoporosis)': 'Bone density',
  'osteoporosis': 'Bone density',
  'hearing': 'Hearing test',
  'audiogram': 'Hearing test',
  'cardiac calcium': 'Cardiac calcium scan',
  'calcium scan': 'Cardiac calcium scan',
  'cac': 'Cardiac calcium scan',
  'coronary calcium': 'Cardiac calcium scan',
};

export function findTestSuggestion(name: string): TestSuggestion | null {
  const normalized = name.toLowerCase().trim();
  if (!normalized) return null;
  const direct = TEST_SUGGESTIONS.find((s) => s.name.toLowerCase() === normalized);
  if (direct) return direct;
  const aliasTarget = SUGGESTION_ALIASES[normalized];
  if (aliasTarget) {
    return TEST_SUGGESTIONS.find((s) => s.name === aliasTarget) || null;
  }
  return null;
}

export const TEST_PRIORITIES = [
  { value: '', label: 'Active' },
  { value: 'low', label: 'Later in life' },
];

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function parseMonthSchedule(csv: string): Set<number> {
  const set = new Set<number>();
  if (!csv) return set;
  for (const part of csv.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (n >= 1 && n <= 12) set.add(n);
  }
  return set;
}

export function serializeMonthSchedule(months: Set<number>): string {
  return Array.from(months).sort((a, b) => a - b).join(',');
}

export const QUICK_FACT_SUGGESTIONS = [
  'Blood type',
  'Allergies',
  'Medical conditions',
  'Date of birth',
  'Height',
  'Primary care doctor',
  'Emergency contact',
  'Insurance',
];
