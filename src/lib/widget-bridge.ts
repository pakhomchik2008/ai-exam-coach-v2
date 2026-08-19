/**
 * Bridge to the native iOS Home/Lock Screen widget and the Exam Sim Live
 * Activity. Both live in WidgetBridgePlugin.swift (App target) and read the
 * shared UserDefaults(suiteName: "group.app.examik.ios") the widget extension
 * also reads — same App Group pattern as every other native bridge here.
 * No-ops on web and on Android; the plugin only exists in the iOS app target.
 */
import { registerPlugin } from "@capacitor/core";
import { isNativeIOS } from "./platform";

interface WidgetBridgePluginContract {
  updateBrief(options: {
    streak: number;
    planTopic: string;
    examName: string;
    examDaysAway: number;
  }): Promise<void>;
  startExamActivity(options: { examName: string; endEpochMs: number }): Promise<void>;
  endExamActivity(): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePluginContract>("WidgetBridge");

export function pushWidgetBrief(data: {
  streak: number;
  planTopic: string;
  examName: string;
  examDaysAway: number;
}): void {
  if (!isNativeIOS()) return;
  void WidgetBridge.updateBrief(data).catch(() => {
    // Widget extension not installed/reachable — never block the UI
  });
}

/** endEpochMs is when the exam clock hits zero — the widget renders its own
 * live countdown from that (SwiftUI Text(timerInterval:)), no per-second JS calls needed. */
export function startExamLiveActivity(examName: string, endEpochMs: number): void {
  if (!isNativeIOS()) return;
  void WidgetBridge.startExamActivity({ examName, endEpochMs }).catch(() => {});
}

export function endExamLiveActivity(): void {
  if (!isNativeIOS()) return;
  void WidgetBridge.endExamActivity().catch(() => {});
}

// curriculum-store.jsx-style consumers: DailyBriefCard.jsx is a window-global
// marker file with no imports of its own, same reason platform.ts publishes apiUrl.
Object.assign(window, { pushWidgetBrief, startExamLiveActivity, endExamLiveActivity });
