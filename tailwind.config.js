/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0d1117',
          1: '#161b22',
          2: '#21262d',
          3: '#30363d',
        },
        border: {
          default: '#30363d',
          muted: '#21262d',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f58',
        },
        accent: {
          blue: '#58a6ff',
          green: '#3fb950',
          red: '#f85149',
          orange: '#d29922',
          purple: '#bc8cff',
        },
        diff: {
          addBg: 'rgba(63, 185, 80, 0.15)',
          addBorder: 'rgba(63, 185, 80, 0.4)',
          removeBg: 'rgba(248, 81, 73, 0.15)',
          removeBorder: 'rgba(248, 81, 73, 0.4)',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
