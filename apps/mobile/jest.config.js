module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Based on jest-expo's own pnpm-aware default (note the leading `.pnpm` in the
  // allowlist, which makes the negative lookahead defer to the inner package
  // name under node_modules/.pnpm/<pkg>@ver/node_modules/<pkg>). Extended with the
  // non-react-native ESM packages this app pulls in (bottom-sheet, flash-list,
  // phosphor, lottie). The last two entries mirror jest-expo and avoid a
  // reentrant reanimated-plugin transform.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@shopify|@gorhom|phosphor-react-native|lottie-react-native))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
