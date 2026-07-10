const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Limit watch folders to only the current app and packages/shared (exclude node_modules)
config.watchFolders = config.watchFolders.filter(folder => {
  return !folder.includes('node_modules') && (
         folder.endsWith('packages/shared') || 
         folder === __dirname
  );
});

// Ignore other apps and large backend dependencies to save inotify watches
const customBlockList = [
  /apps\/api\/.*/,
  /apps\/web\/.*/,
  /apps\/mobile\/.*/,
  /node_modules\/.*pdf-parse.*/,
  /node_modules\/.*puppeteer.*/,
  /node_modules\/.*playwright.*/
];

if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = [...config.resolver.blockList, ...customBlockList];
} else if (config.resolver.blockList) {
  config.resolver.blockList = [config.resolver.blockList, ...customBlockList];
} else {
  config.resolver.blockList = customBlockList;
}

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

module.exports = config;
