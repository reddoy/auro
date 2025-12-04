// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle optional native modules
config.resolver = {
  ...config.resolver,
  // Allow Metro to handle modules that might not be available
  unstable_enablePackageExports: true,
};

module.exports = config;

