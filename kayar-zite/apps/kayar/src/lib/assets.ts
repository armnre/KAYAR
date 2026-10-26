// Stable asset map — every image in the app is resolved here, never hardcoded in components.
// All images are original AI-generated assets owned by the project (see OVERVIEW.md → Assets).

export const ASSETS = {
  hero: `/media/img_pMf4iZFlJSygMHuN.jpg`,
  food: `/media/img_ai6ZYZ51BvMhO8EF.jpg`,
  morshed: `/media/img_7HSPmaPFIRMPDirp.jpg`,
};

export const CATEGORY_IMAGES: Record<string, string> = {
  chest: `/media/img_IJG13EHiq50wnjQM.jpg`,
  back: `/media/img_fQtT5ZmtTmn4VyRx.jpg`,
  shoulders: `/media/img_3ba2ENCR4BJTe6B3.jpg`,
  arms: `/media/img_0NqyhAiYSW5fv7QG.jpg`,
  legs: `/media/img_cRTYyUga-huYc2qY.jpg`,
  core: `/media/img_ZfPNrGcnxyGLzP_M.jpg`,
  cardio: `/media/img_HLNH5yXa4eVmcrD-.jpg`,
  warmup: `/media/img_HLNH5yXa4eVmcrD-.jpg`,
  mobility: `/media/img_W1uLj8pWkSmT-DKq.jpg`,
  stretching: `/media/img_W1uLj8pWkSmT-DKq.jpg`,
  recovery: `/media/img_59dOR5rVZR9p4NMc.jpg`,
};

export const categoryImage = (c?: string) => (c && CATEGORY_IMAGES[c]) || null;

export const CATEGORY_LABELS: Record<string, string> = {
  chest: 'سینه', back: 'پشت', shoulders: 'سرشانه', arms: 'بازو', legs: 'پا', core: 'میان‌تنه',
  cardio: 'هوازی', mobility: 'تحرک', stretching: 'کشش', warmup: 'گرم کردن', recovery: 'ریکاوری',
};
export const DIFFICULTY_LABELS: Record<string, string> = { beginner: 'مبتدی', intermediate: 'متوسط', advanced: 'پیشرفته' };
export const MEAL_LABELS: Record<string, string> = { breakfast: 'صبحانه', lunch: 'ناهار', dinner: 'شام', snack: 'میان‌وعده' };
export const GENRE_LABELS: Record<string, string> = { workout: 'تمرین', running: 'دویدن', walking: 'پیاده‌روی', focus: 'تمرکز', recovery: 'ریکاوری', fitness: 'تناسب اندام', nutrition: 'تغذیه' };
