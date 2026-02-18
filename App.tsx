import { SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'https://SUA_URL_AQUI' }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </SafeAreaView>
  );
}
