const path = require("path");

const dbPkg = path.resolve(__dirname, "../../packages/db/src");

module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|heroui-native|uniwind|tailwind-variants|victory-native|@shopify/react-native-skia|drizzle-orm)",
  ],
  moduleNameMapper: {
    "^@ironlog/db/(.*)$": `${dbPkg}/$1`,
  },
};
