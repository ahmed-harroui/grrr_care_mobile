import type { CareSnapshot } from '@/widgets/care-snapshot';

// iOS and web: no home-screen widgets yet. Android has its own care-widget-task.android.tsx.

export function registerCareWidgets() {}

export async function pushCareWidgets(_snapshot: CareSnapshot | null) {}
