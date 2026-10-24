// Stable asset map — every image in the app is resolved here, never hardcoded in components.
// All images are original AI-generated assets owned by the project (see OVERVIEW.md → Assets).
const B = 'https://images.fillout.com/903633/bbpd4utajh/generated-images';

export const ASSETS = {
  hero: `${B}/2gKcj34yv1sCi8g3rFqUQG/img_pMf4iZFlJSygMHuN.jpg`,
  food: `${B}/hShafRTBM2psAKtfRJxEEr/img_ai6ZYZ51BvMhO8EF.jpg`,
  morshed: `${B}/fXKLStbixgqiRFJgdkYEmi/img_7HSPmaPFIRMPDirp.jpg`,
};

export const CATEGORY_IMAGES: Record<string, string> = {
  chest: `${B}/twWQ8D1L7BzTBEc5g8T151/img_IJG13EHiq50wnjQM.jpg`,
  back: `${B}/3rhy51vhErmA62V7fwLzSf/img_fQtT5ZmtTmn4VyRx.jpg`,
  shoulders: `${B}/wcDctgAXx4Qme68Rej6rNU/img_3ba2ENCR4BJTe6B3.jpg`,
  arms: `${B}/fchmddCmfruy73BRDrgT8D/img_0NqyhAiYSW5fv7QG.jpg`,
  legs: `${B}/jCXNsNzi5WreJbz1PLweN7/img_cRTYyUga-huYc2qY.jpg`,
  core: `${B}/xBfV4RGdSQDt8gngusU9sL/img_ZfPNrGcnxyGLzP_M.jpg`,
  cardio: `${B}/nr5oFpLyGvG8rGnSeVLgZv/img_HLNH5yXa4eVmcrD-.jpg`,
  warmup: `${B}/nr5oFpLyGvG8rGnSeVLgZv/img_HLNH5yXa4eVmcrD-.jpg`,
  mobility: `${B}/46wrYdWfM4vVa3ANkruhAG/img_W1uLj8pWkSmT-DKq.jpg`,
  stretching: `${B}/46wrYdWfM4vVa3ANkruhAG/img_W1uLj8pWkSmT-DKq.jpg`,
  recovery: `${B}/vJfanCQFZiXCXDc2x7K6Hu/img_59dOR5rVZR9p4NMc.jpg`,
};

export const categoryImage = (c?: string) => (c && CATEGORY_IMAGES[c]) || null;

export const CATEGORY_LABELS: Record<string, string> = {
  chest: 'سینه', back: 'پشت', shoulders: 'سرشانه', arms: 'بازو', legs: 'پا', core: 'میان‌تنه',
  cardio: 'هوازی', mobility: 'تحرک', stretching: 'کشش', warmup: 'گرم کردن', recovery: 'ریکاوری',
};
export const DIFFICULTY_LABELS: Record<string, string> = { beginner: 'مبتدی', intermediate: 'متوسط', advanced: 'پیشرفته' };
export const MEAL_LABELS: Record<string, string> = { breakfast: 'صبحانه', lunch: 'ناهار', dinner: 'شام', snack: 'میان‌وعده' };
export const GENRE_LABELS: Record<string, string> = { workout: 'تمرین', running: 'دویدن', walking: 'پیاده‌روی', focus: 'تمرکز', recovery: 'ریکاوری', fitness: 'تناسب اندام', nutrition: 'تغذیه' };
