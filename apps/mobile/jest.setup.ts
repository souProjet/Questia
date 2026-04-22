/** Configuration Jest globale (matchers RNTL inclus dans v12+ sans extend-expect séparé). */

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: () => React.createElement(View, { testID: 'webview-mock' }),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style, ...rest }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style, ...rest }, children),
  };
});
