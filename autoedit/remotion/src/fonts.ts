import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';

// Solo los pesos/subsets que usamos → evita las ~120 requests de fuentes por render.
export const {fontFamily: ANTON} = loadAnton('normal', {
  weights: ['400'],
  subsets: ['latin'],
  ignoreTooManyRequestsWarning: true,
});
export const {fontFamily: INTER} = loadInter('normal', {
  weights: ['600', '700', '800'],
  subsets: ['latin'],
  ignoreTooManyRequestsWarning: true,
});
