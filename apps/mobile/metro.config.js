const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude node_modules and unrelated packages from the watcher to prevent ENOSPC watcher crash on Linux
config.watchFolders = config.watchFolders.filter((folder) => {
  if (folder.includes('node_modules')) return false;
  if (folder.includes('apps/web')) return false;
  if (folder.includes('apps/api')) return false;
  if (folder.includes('apps/moblie-app')) return false;
  return true;
});

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return {
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
      type: 'sourceFile',
    };
  }

  if (moduleName === 'react-dom' || moduleName.startsWith('react-dom/')) {
    if (platform === 'web') {
      return {
        filePath: require.resolve(moduleName, { paths: [__dirname] }),
        type: 'sourceFile',
      };
    } else {
      return {
        filePath: require.resolve('./react-dom-mock.js'),
        type: 'sourceFile',
      };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./src/global.css",
  browserslistEnv: "web",
});
