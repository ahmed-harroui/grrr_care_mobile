import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler, requestWidgetUpdate, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { supabase } from '@/lib/supabase';
import { CARE_WIDGETS, renderCareWidget } from '@/widgets/care-widgets';
import { buildCareSnapshot, CARE_SNAPSHOT_KEY, CareSnapshot, readCareSnapshot, readLanguage } from '@/widgets/care-snapshot';

const TIMEOUT_MS = 9000;

// Called by Android when a widget is added, resized or refreshed (every 30 minutes), app closed
// or not: drawn at once with what was saved, then with fresh numbers from the database.
async function careWidgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED' || props.widgetAction === 'WIDGET_CLICK') return;
  const saved = await readCareSnapshot();
  props.renderWidget(renderCareWidget(props.widgetInfo.widgetName, saved));
  if (!saved || props.widgetAction !== 'WIDGET_UPDATE') return;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const fresh = await Promise.race([buildCareSnapshot(saved.petId, await readLanguage()), new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))]);
    if (!fresh) return;
    await AsyncStorage.setItem(CARE_SNAPSHOT_KEY, JSON.stringify(fresh));
    props.renderWidget(renderCareWidget(props.widgetInfo.widgetName, fresh));
  } catch {
    // Offline: the saved numbers stay.
  }
}

export function registerCareWidgets() {
  if (Platform.OS === 'android') registerWidgetTaskHandler(careWidgetTaskHandler);
}

/** Saves what the widgets show and redraws the ones on the home screen (null: signed out). */
export async function pushCareWidgets(snapshot: CareSnapshot | null) {
  if (Platform.OS !== 'android') return;
  if (snapshot) await AsyncStorage.setItem(CARE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  else await AsyncStorage.removeItem(CARE_SNAPSHOT_KEY);
  await Promise.all(CARE_WIDGETS.map((widgetName) => requestWidgetUpdate({ widgetName, renderWidget: () => renderCareWidget(widgetName, snapshot), widgetNotFound: () => {} })));
}
