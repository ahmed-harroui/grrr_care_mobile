import React from 'react';
import { ColorProp, FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { CARE_LINKS, CareSnapshot } from '@/widgets/care-snapshot';

// GRRR Care's Android home-screen widgets (declared in app.json). Drawn outside the app from the
// snapshot only, in the app's blue.

export const CARE_WIDGETS = ['CareHealth', 'CareToday'] as const;

const BLUE = '#2563EB';
const BLUE_DEEP = '#1E40AF';
const SOFT = '#DBEAFE';
const BACKGROUND = '#F8F9FA';
const TEXT = '#1A1A1A';
const GREY = '#666666';
const RED = '#EF4444';
const WHITE = '#FFFFFF';

const open = (uri: string) => ({ clickAction: 'OPEN_URI' as const, clickActionData: { uri } });

function EmptyWidget() {
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BACKGROUND, borderRadius: 22, padding: 14, alignItems: 'center', justifyContent: 'center' }} clickAction="OPEN_APP">
      <TextWidget text="GRRR Care 🩺" style={{ fontSize: 19, fontWeight: 'bold', color: BLUE }} />
      <TextWidget text="Open the app to follow your companion's health · Ouvre l'app pour suivre sa santé" style={{ fontSize: 11, color: GREY, marginTop: 4, textAlign: 'center' }} maxLines={3} />
    </FlexWidget>
  );
}

function HealthWidget({ snapshot }: { snapshot: CareSnapshot }) {
  const { pet, health } = snapshot;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BACKGROUND, borderRadius: 22, padding: 12, flexDirection: 'row', alignItems: 'center', flexGap: 12 }} {...open(CARE_LINKS.health)}>
      {/* The score in a colored ring */}
      <FlexWidget style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: health.color as ColorProp, alignItems: 'center', justifyContent: 'center' }}>
        <FlexWidget style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={health.score} style={{ fontSize: 24, fontWeight: 'bold', color: TEXT }} />
          <TextWidget text="/100" style={{ fontSize: 9, color: GREY }} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          {pet.photo ? <ImageWidget image={pet.photo as `https:${string}`} imageWidth={22} imageHeight={22} radius={11} /> : <TextWidget text={pet.icon} style={{ fontSize: 16 }} />}
          <TextWidget text={pet.name} style={{ fontSize: 16, fontWeight: 'bold', color: TEXT }} maxLines={1} truncate="END" />
        </FlexWidget>
        <TextWidget text={health.label} style={{ fontSize: 12, fontWeight: 'bold', color: health.color as ColorProp, marginTop: 2 }} maxLines={1} />
        <TextWidget text={health.advice} style={{ fontSize: 11, color: GREY, marginTop: 3 }} maxLines={2} truncate="END" />
        <TextWidget text={health.next} style={{ fontSize: 11, fontWeight: 'bold', color: BLUE_DEEP, marginTop: 4 }} maxLines={1} truncate="END" />
      </FlexWidget>
    </FlexWidget>
  );
}

function TodayWidget({ snapshot }: { snapshot: CareSnapshot }) {
  const { today } = snapshot;
  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: BLUE, borderRadius: 22, padding: 12, flexDirection: 'column', flexGap: 6 }} {...open(CARE_LINKS.health)}>
      <TextWidget text={`🩺 ${today.title}`} style={{ fontSize: 13, fontWeight: 'bold', color: WHITE }} maxLines={1} truncate="END" />
      {today.items.length === 0 ? (
        <FlexWidget style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={today.empty} style={{ fontSize: 14, color: WHITE }} />
        </FlexWidget>
      ) : (
        today.items.map((item, index) => (
          <FlexWidget key={index} style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 7, backgroundColor: item.urgent ? WHITE : SOFT, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }}>
            <TextWidget text={item.icon} style={{ fontSize: 14 }} />
            <TextWidget text={item.text} style={{ fontSize: 12, fontWeight: item.urgent ? 'bold' : 'normal', color: item.urgent && item.icon === '⚠️' ? RED : TEXT }} maxLines={1} truncate="END" />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}

export function renderCareWidget(name: string, snapshot: CareSnapshot | null) {
  if (!snapshot) return <EmptyWidget />;
  return name === 'CareToday' ? <TodayWidget snapshot={snapshot} /> : <HealthWidget snapshot={snapshot} />;
}
