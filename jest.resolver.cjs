/*
 * Resolver for the app Jest project. Reanimated 4 and react-native-worklets
 * need their JS (non-.native) builds under Jest, which their own resolver
 * picks; everything else falls through to React Native's preset resolver,
 * which jest-expo normally uses.
 */
const reactNativeResolver = require("@react-native/jest-preset/jest/resolver")
const reanimatedResolver = require("react-native-reanimated/jest/resolver")

module.exports = (request, options) => reanimatedResolver(request, {
  ...options,
  defaultResolver: (innerRequest, innerOptions) => reactNativeResolver(innerRequest, {
    ...innerOptions,
    defaultResolver: options.defaultResolver,
  }),
})
