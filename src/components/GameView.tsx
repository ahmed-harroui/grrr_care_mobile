import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { gameUrl, type GameViewProps } from './game-url';

/** The game "help your pets" in the phone app: its page of the Care site, in a WebView. */
export function GameView({ onEvent, ...options }: GameViewProps) {
  return (
    <WebView
      source={{ uri: gameUrl(options, 'https://care.greatrascals.com') }}
      style={styles.game}
      originWhitelist={['https://care.greatrascals.com']}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      bounces={false}
      scrollEnabled={false}
      onMessage={event => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message?.source === 'grrr-care-game') onEvent(message.type, message.payload ?? {});
        } catch {
          // Not one of the game's messages
        }
      }}
    />
  );
}

const styles = StyleSheet.create({ game: { flex: 1, backgroundColor: '#5fbcff' } });
