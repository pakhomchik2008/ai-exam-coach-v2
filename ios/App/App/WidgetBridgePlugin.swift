//
//  WidgetBridgePlugin.swift
//  Capacitor bridge for the Home/Lock Screen widget + Exam Sim Live Activity.
//  Auto-discovered by the Capacitor bridge via CAPBridgedPlugin — no manual
//  registration in capacitor.config or Info.plist needed. App target only
//  (the widget extension reads the same App Group data, it doesn't call this).
//
import Foundation
import Capacitor
import WidgetKit
import ActivityKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateBrief", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startExamActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endExamActivity", returnType: CAPPluginReturnPromise),
    ]

    // Must match the App Group entered in both targets' Signing & Capabilities.
    private let suiteName = "group.app.examik.ios"

    @objc func updateBrief(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            call.reject("App Group unavailable")
            return
        }
        defaults.set(call.getInt("streak") ?? 0, forKey: "widget_streak")
        defaults.set(call.getString("planTopic") ?? "", forKey: "widget_planTopic")
        defaults.set(call.getString("examName") ?? "", forKey: "widget_examName")
        defaults.set(call.getInt("examDaysAway") ?? -1, forKey: "widget_examDaysAway")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func startExamActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(); return }
        let examName = call.getString("examName") ?? "Exam"
        let endEpochMs = call.getDouble("endEpochMs") ?? (Date().timeIntervalSince1970 * 1000)
        let endDate = Date(timeIntervalSince1970: endEpochMs / 1000)
        do {
            _ = try Activity<ExamTimerAttributes>.request(
                attributes: ExamTimerAttributes(examName: examName),
                content: .init(state: .init(endDate: endDate), staleDate: nil)
            )
            call.resolve()
        } catch {
            call.reject("Live Activity failed to start: \(error.localizedDescription)")
        }
    }

    @objc func endExamActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task {
            for activity in Activity<ExamTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
