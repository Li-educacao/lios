const config = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                brand: {
                    black: '#010101',
                    white: '#FFFFFF',
                    gray: '#76777A',
                    blue: '#0084C8',
                    'blue-dark': '#0E4C93',
                },
            },
            fontFamily: {
                heading: ['MADE Tommy ExtraBold', 'sans-serif'],
                subtitle: ['MADE Tommy Medium', 'sans-serif'],
                body: ['MADE Tommy Regular', 'Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
