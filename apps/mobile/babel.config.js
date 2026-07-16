/** @type {import('react-native-unistyles/plugin').UnistylesPluginOptions} */
const unistylesPluginOptions = {
  // All files under src/ (theme, components, lib) are processed.
  root: 'src',
  // Route files live in app/ (outside root). Process any of them that pull in
  // Unistyles directly (e.g. StyleSheet.create / useUnistyles). Components they
  // render from src/ manage their own theme re-renders via the Unistyles engine.
  autoProcessImports: ['react-native-unistyles'],
}

module.exports = (api) => {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-unistyles/plugin', unistylesPluginOptions],
      'react-native-worklets/plugin', // must be last
    ],
  }
}
