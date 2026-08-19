//
//  ExamikWidgetLiveActivity.swift
//  Exam Sim countdown on Lock Screen + Dynamic Island. ExamTimerAttributes is
//  shared with the App target (ExamTimerAttributes.swift, dual target membership) —
//  WidgetBridgePlugin.swift starts/ends this via Activity<ExamTimerAttributes>.
//  Text(timerInterval:) renders its own live countdown, so no per-second updates needed.
//
import ActivityKit
import WidgetKit
import SwiftUI

struct ExamikWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ExamTimerAttributes.self) { context in
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.examName).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                    Text("Exam Sim").font(.system(size: 11)).foregroundStyle(.secondary)
                }
                Spacer()
                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
            .padding(16)
            .activityBackgroundTint(Color.black)
            .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.examName).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                        .font(.system(size: 16, weight: .bold, design: .rounded)).monospacedDigit()
                }
            } compactLeading: {
                Image(systemName: "timer")
            } compactTrailing: {
                Text(timerInterval: Date.now...context.state.endDate, countsDown: true)
                    .font(.system(size: 12, weight: .semibold, design: .rounded)).monospacedDigit()
                    .frame(width: 40)
            } minimal: {
                Image(systemName: "timer")
            }
        }
    }
}
