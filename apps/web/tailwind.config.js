/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'primary-foreground': '#ffffff',
        secondary: '#f0f0f0',
        'secondary-foreground': '#000000',
        destructive: '#dc2626',
        'destructive-foreground': '#ffffff',
        muted: '#d1d5db',
        'muted-foreground': '#6b7280',
        accent: '#f3f4f6',
        'accent-foreground': '#000000',
        background: '#ffffff',
        foreground: '#000000',
        ring: '#000000',
        input: '#e5e7eb',
        border: '#e5e7eb',
      },
    },
  },
  plugins: [],
};
