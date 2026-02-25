import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabConfig {
  icon: IconName;
  iconActive: IconName;
  isCenter?: boolean;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index:        { icon: 'home-outline',           iconActive: 'home'              },
  registrar:    { icon: 'plus',                   iconActive: 'plus', isCenter: true },
  historial:    { icon: 'calendar-month-outline', iconActive: 'calendar-month'    },
  estadisticas: { icon: 'chart-line-variant',     iconActive: 'chart-line-variant'},
  ajustes:      { icon: 'cog-outline',            iconActive: 'cog'               },
};

export default function FloatingTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12) + 8;

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? { icon: 'help', iconActive: 'help' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (config.isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={[styles.centerButton, isFocused && styles.centerButtonActive]}
                activeOpacity={0.82}
              >
                <MaterialCommunityIcons name="plus" size={26} color="#fff" />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={isFocused ? styles.activeIndicator : styles.indicator}>
                <MaterialCommunityIcons
                  name={isFocused ? config.iconActive : config.icon}
                  size={22}
                  color={isFocused ? COLORS.primary : '#94A3B8'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 18,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeIndicator: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  centerButton: {
    backgroundColor: COLORS.primary,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  centerButtonActive: {
    shadowOpacity: 0.6,
  },
});
