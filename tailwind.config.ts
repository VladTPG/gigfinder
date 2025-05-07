import colors from "tailwindcss/colors";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  theme: {
    extend: {
      boxShadow: {
        "center-glow": `0 0 25px 10px ${colors.violet[500]}cc`, // 80% opacity with larger spread
      },
    },
  },
};
