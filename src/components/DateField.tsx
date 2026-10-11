import { createElement, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  /** 'datetime' also asks the time (a vet appointment) */
  mode?: 'date' | 'datetime';
  locale: string;
  colors: any;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** A date (and time) to pick: the browser's own field on the web, the system picker on a phone. */
export function DateField({ value, onChange, mode = 'date', locale, colors }: DateFieldProps) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: mode === 'datetime' ? 'datetime-local' : 'date',
      value: mode === 'datetime' ? `${dayValue(value)}T${timeValue(value)}` : dayValue(value),
      onChange: (event: any) => {
        const text: string = event.target.value;
        if (!text) return;
        const [day, time] = text.split('T');
        const [y, m, d] = day.split('-').map(Number);
        const [h, min] = (time ?? `${pad(value.getHours())}:${pad(value.getMinutes())}`).split(':').map(Number);
        const next = new Date(y, m - 1, d, h, min);
        if (!Number.isNaN(next.getTime())) onChange(next);
      },
      style: {
        height: 48, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.backgroundElement, color: colors.text,
        padding: '0 12px', fontSize: 15, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', colorScheme: 'light dark',
      },
    });
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]} onPress={() => setPicking('date')}>
        <Text style={[styles.text, { color: colors.text }]}>📅 {value.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </TouchableOpacity>
      {mode === 'datetime' && (
        <TouchableOpacity style={[styles.button, styles.time, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]} onPress={() => setPicking('time')}>
          <Text style={[styles.text, { color: colors.text }]}>🕒 {timeValue(value)}</Text>
        </TouchableOpacity>
      )}
      {picking && (
        <DateTimePicker
          value={value}
          mode={picking}
          is24Hour
          onChange={(_event: any, date?: Date) => {
            setPicking(null);
            if (date) onChange(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, justifyContent: 'center' },
  time: { flex: 0, minWidth: 110 },
  text: { fontSize: 15, fontWeight: '500' },
});
