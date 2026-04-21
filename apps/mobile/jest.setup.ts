/** Configuration Jest globale (matchers RNTL inclus dans v12+ sans extend-expect séparé). */

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: () => React.createElement(View, { testID: 'webview-mock' }),
  };
});
