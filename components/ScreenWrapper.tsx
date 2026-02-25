import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';

export default function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(10);

      const anim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      anim.start();
      return () => anim.stop();
    }, []),
  );

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
