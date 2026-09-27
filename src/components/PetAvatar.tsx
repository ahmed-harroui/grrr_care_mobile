import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐕',
  cat: '🐱',
  rabbit: '🐰',
  bird: '🐦',
  fish: '🐠',
  hamster: '🐹',
  horse: '🐴',
};

export function speciesEmoji(species?: string) {
  const s = (species || '').toLowerCase();
  const key = Object.keys(SPECIES_EMOJI).find(k => s.includes(k));
  return key ? SPECIES_EMOJI[key] : '🐾';
}

// GRRRR app can store a device-local file:// path, which no other device can load
function isDisplayable(url?: string | null) {
  return !!url && /^(https?:|data:image)/.test(url);
}

interface PetAvatarProps {
  photoUrl?: string | null;
  species?: string;
  size?: number;
}

export function PetAvatar({ photoUrl, species, size = 56 }: PetAvatarProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const showPhoto = isDisplayable(photoUrl) && !failed;
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.base, shape, { backgroundColor: colors.primary + '14' }]}>
      {showPhoto ? (
        <Image source={{ uri: photoUrl! }} style={shape} onError={() => setFailed(true)} />
      ) : (
        <Text style={{ fontSize: size * 0.5 }}>{speciesEmoji(species)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
});
