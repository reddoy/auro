const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Expo config plugin to remove PassKit framework from iOS build
 * This prevents PassKit from being included in the app binary
 */
const withNoPassKit = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    try {
      // Get all build configuration sections
      const sections = xcodeProject.pbxXCBuildConfigurationSection();
      
      // Iterate through all build configurations
      Object.keys(sections).forEach((configUuid) => {
        const buildSettings = sections[configUuid];
        
        if (buildSettings && buildSettings.buildSettings) {
          // Remove PassKit from OTHER_LDFLAGS (framework linking flags)
          if (buildSettings.buildSettings.OTHER_LDFLAGS) {
            const ldFlags = buildSettings.buildSettings.OTHER_LDFLAGS;
            if (Array.isArray(ldFlags)) {
              buildSettings.buildSettings.OTHER_LDFLAGS = ldFlags.filter(
                flag => !String(flag || '').includes('PassKit')
              );
            } else if (typeof ldFlags === 'string') {
              // Handle string format
              buildSettings.buildSettings.OTHER_LDFLAGS = ldFlags
                .split(' ')
                .filter(flag => !flag.includes('PassKit'))
                .join(' ');
            }
          }
          
          // Remove PassKit from FRAMEWORK_SEARCH_PATHS
          if (buildSettings.buildSettings.FRAMEWORK_SEARCH_PATHS) {
            const paths = buildSettings.buildSettings.FRAMEWORK_SEARCH_PATHS;
            if (Array.isArray(paths)) {
              buildSettings.buildSettings.FRAMEWORK_SEARCH_PATHS = paths.filter(
                path => !String(path || '').includes('PassKit')
              );
            }
          }
        }
      });
    } catch (error) {
      console.warn('[withNoPassKit] Error removing PassKit:', error);
      // Don't throw - allow build to continue even if plugin fails
    }
    
    return config;
  });
};

module.exports = withNoPassKit;

