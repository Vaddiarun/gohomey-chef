// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exclusionList = require('metro-config/private/defaults/exclusionList').default;

const config = getDefaultConfig(__dirname);

// This project directory contains a stale, gitignored nested checkout of the
// same repo at ./gohomey-chef (its own node_modules, its own git history).
// Without excluding it, Metro crawls both copies of every dependency and
// bundles two instances of native-view-registering packages like
// react-native-safe-area-context, which crashes at runtime with:
// "Invariant Violation: Tried to register two views with the same name".
config.resolver.blockList = exclusionList([/gohomey-chef[\/\\].*/]);

module.exports = config;
