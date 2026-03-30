/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Auro',
    slug: 'auro',
    scheme: 'auro',
    userInterfaceStyle: 'automatic',
    experiments: {
      // Static web export is served from Next.js at /app/* (see site/next.config.js)
      baseUrl: '/app',
    },
  },
};
