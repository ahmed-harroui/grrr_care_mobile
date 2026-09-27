import React, { useEffect } from 'react';
import {
  Animated,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface AnimatedCardProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  delay?: number;
}

export function AnimatedCard({ style, children, delay = 0 }: AnimatedCardProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
