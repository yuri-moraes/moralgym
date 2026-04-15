/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// ── Design System MoralGym ─────────────────────────────
				gym: {
					bg:       '#0B0B0D',    // fundo raiz
					surface:  '#111115',    // cards elevados
					surface2: '#1A1A21',    // overlay / nested
					border:   '#26262F',    // bordas sutis
					border2:  '#35353F',    // bordas levemente mais visíveis
					text:     '#F1F1F5',    // texto primário
					muted:    '#8B8FA8',    // texto secundário
					accent:   '#7C6FF7',    // índigo vibrante (principal)
					'accent-2': '#A78BFA',  // índigo claro (hover/variante)
					success:  '#22C55E',    // verde (séries completas)
					amber:    '#F59E0B',    // âmbar (RPE alto)
					danger:   '#EF4444',    // vermelho (erro)
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
			},
			keyframes: {
				'fade-in': {
					from: { opacity: '0' },
					to:   { opacity: '1' },
				},
				'slide-up': {
					from: { opacity: '0', transform: 'translateY(12px)' },
					to:   { opacity: '1', transform: 'translateY(0)' },
				},
				'slide-down': {
					from: { opacity: '0', transform: 'translateY(-8px)' },
					to:   { opacity: '1', transform: 'translateY(0)' },
				},
				'pop': {
					'0%':   { transform: 'scale(1)' },
					'50%':  { transform: 'scale(1.08)' },
					'100%': { transform: 'scale(1)' },
				},
				'spin-slow': {
					from: { transform: 'rotate(0deg)' },
					to:   { transform: 'rotate(360deg)' },
				},
				'pulse-ring': {
					'0%':   { transform: 'scale(1)',    opacity: '0.8' },
					'100%': { transform: 'scale(1.4)',  opacity: '0' },
				},
				'shimmer': {
					from: { backgroundPosition: '-200% 0' },
					to:   { backgroundPosition: '200% 0' },
				},
				'check-draw': {
					from: { strokeDashoffset: '30' },
					to:   { strokeDashoffset: '0' },
				},
			},
			animation: {
				'fade-in':    'fade-in 0.2s ease-out both',
				'slide-up':   'slide-up 0.25s ease-out both',
				'slide-down': 'slide-down 0.2s ease-out both',
				'pop':        'pop 0.3s ease-out',
				'spin-slow':  'spin-slow 2s linear infinite',
				'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
				'shimmer':    'shimmer 1.8s linear infinite',
				'check-draw': 'check-draw 0.3s ease-out forwards',
			},
			backgroundImage: {
				'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
			},
		},
	},
	plugins: [
		function({ addUtilities }) {
			addUtilities({
				'.scrollbar-hide': {
					'scrollbar-width': 'none',
					'&::-webkit-scrollbar': { display: 'none' },
				},
			});
		}
	],
};
