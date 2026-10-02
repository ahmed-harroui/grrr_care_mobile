// Entry: Expo Router, plus the home-screen widgets' handler, which Android calls even when the
// app is closed (it has to be registered here, outside any screen).
import 'expo-router/entry';
import { registerCareWidgets } from '@/widgets/care-widget-task';

registerCareWidgets();
