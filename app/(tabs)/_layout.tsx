import { Tabs } from 'expo-router';
import FloatingTabBar from '../../components/FloatingTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="historial" />
      <Tabs.Screen name="registrar" />
      <Tabs.Screen name="estadisticas" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
