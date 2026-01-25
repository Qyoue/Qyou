const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);


config.watchFolders = [workspaceRoot];


config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];



config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react' || moduleName === 'react-native') {
        return {
            filePath: require.resolve(moduleName, { paths: [projectRoot] }),
            type: 'sourceFile',
        };
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;