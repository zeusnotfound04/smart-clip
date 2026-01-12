import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// 🔥 VIRAL SUBTITLE FONTS - Local Fonts with Bold Variants

// Bangers - THE BEST for viral subtitles!
export const bangers = localFont({
  src: [
    {
      path: '../public/fonts/Bangers/Bangers-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-bangers',
  display: 'swap',
});

// Anton - BOLD IMPACT for viral content
export const anton = localFont({
  src: [
    {
      path: '../public/fonts/Anton/Anton-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-anton',
  display: 'swap',
});

// Montserrat - Best Overall
export const montserrat = localFont({
  src: [
    {
      path: '../public/fonts/Montserrat/Montserrat-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Montserrat/Montserrat-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Montserrat/Montserrat-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Montserrat/Montserrat-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Montserrat/Montserrat-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/Montserrat/Montserrat-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-montserrat',
  display: 'swap',
});

// Rubik - Punchy Messages
export const rubik = localFont({
  src: [
    {
      path: '../public/fonts/Rubik/Rubik-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Rubik/Rubik-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Rubik/Rubik-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/Rubik/Rubik-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-rubik',
  display: 'swap',
});

// Gabarito - Fitness & TikTok
export const gabarito = localFont({
  src: [
    {
      path: '../public/fonts/Gabarito/Gabarito-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Gabarito/Gabarito-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Gabarito/Gabarito-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/Gabarito/Gabarito-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-gabarito',
  display: 'swap',
});

// Poppins - Educational
export const poppins = localFont({
  src: [
    {
      path: '../public/fonts/Poppins/Poppins-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Poppins/Poppins-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Poppins/Poppins-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/Poppins/Poppins-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

// Roboto - Health Videos
export const roboto = localFont({
  src: [
    {
      path: '../public/fonts/Roboto/Roboto-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Roboto/Roboto-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Roboto/Roboto-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-roboto',
  display: 'swap',
});

// DM Serif Display - Storytelling
export const dmSerifDisplay = localFont({
  src: [
    {
      path: '../public/fonts/DM_Serif_Display/DMSerifDisplay-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-dm-serif',
  display: 'swap',
});

// Fira Sans Condensed - Circular Alternative
export const circular = localFont({
  src: [
    {
      path: '../public/fonts/Fira_Sans_Condensed/FiraSansCondensed-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Fira_Sans_Condensed/FiraSansCondensed-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-circular',
  display: 'swap',
});

// Teko - Modern Impact (SemiBold)
export const teko = localFont({
  src: [
    {
      path: '../public/fonts/Teko/Teko-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Teko/Teko-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Teko/Teko-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Teko/Teko-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-teko',
  display: 'swap',
});

// TikTok Sans - Official TikTok Font
export const tiktokSans = localFont({
  src: [
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/fonts/TikTok_Sans/TikTokSans-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-tiktok-sans',
  display: 'swap',
});
