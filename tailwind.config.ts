import colors from "tailwindcss/colors";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      boxShadow: {
        "center-glow": `0 0 25px 10px ${colors.violet[500]}cc`, // 80% opacity with larger spread
      },
    },
  },
};
