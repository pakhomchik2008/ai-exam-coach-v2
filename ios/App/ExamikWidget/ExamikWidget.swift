//
//  ExamikWidget.swift
//  Home Screen + Lock Screen widget. Reads the brief WidgetBridgePlugin.swift
//  writes into the shared App Group — no configuration, one fixed layout per
//  family, refreshed whenever the app calls updateBrief() (WidgetCenter.reloadAllTimelines).
//
import WidgetKit
import SwiftUI

struct BriefEntry: TimelineEntry {
    let date: Date
    let streak: Int
    let planTopic: String
    let examName: String
    let examDaysAway: Int
}

struct BriefProvider: TimelineProvider {
    private let suiteName = "group.app.examik.ios"

    private func readEntry() -> BriefEntry {
        let d = UserDefaults(suiteName: suiteName)
        return BriefEntry(
            date: Date(),
            streak: d?.integer(forKey: "widget_streak") ?? 0,
            planTopic: d?.string(forKey: "widget_planTopic") ?? "",
            examName: d?.string(forKey: "widget_examName") ?? "",
            examDaysAway: d?.object(forKey: "widget_examDaysAway") != nil ? d!.integer(forKey: "widget_examDaysAway") : -1
        )
    }

    func placeholder(in context: Context) -> BriefEntry {
        BriefEntry(date: Date(), streak: 4, planTopic: "Quadratic equations", examName: "NMT Math", examDaysAway: 12)
    }

    func getSnapshot(in context: Context, completion: @escaping (BriefEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BriefEntry>) -> Void) {
        // No countdown math here — the entry is just "current brief"; the app
        // pushes a fresh one via updateBrief() whenever the numbers change.
        completion(Timeline(entries: [readEntry()], policy: .never))
    }
}

struct ExamikWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: BriefEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            VStack(spacing: 0) {
                Text("🔥").font(.system(size: 14))
                Text("\(entry.streak)").font(.system(size: 15, weight: .bold))
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.planTopic.isEmpty ? "No session today" : entry.planTopic)
                    .font(.system(size: 13, weight: .semibold)).lineLimit(1)
                if !entry.examName.isEmpty && entry.examDaysAway >= 0 {
                    Text("\(entry.examName) · \(entry.examDaysAway)d").font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                Text("EXAMIK").font(.system(size: 10, weight: .bold)).foregroundStyle(.secondary)
                Text(entry.planTopic.isEmpty ? "Rest day" : entry.planTopic)
                    .font(.system(size: 15, weight: .semibold)).lineLimit(2)
                Spacer(minLength: 0)
                HStack(spacing: 10) {
                    if entry.streak > 0 {
                        Label("\(entry.streak)", systemImage: "flame.fill").font(.system(size: 12, weight: .medium))
                    }
                    if !entry.examName.isEmpty && entry.examDaysAway >= 0 {
                        Label("\(entry.examDaysAway)d", systemImage: "calendar").font(.system(size: 12, weight: .medium))
                    }
                }
            }
            .padding(2)
        }
    }
}

struct ExamikWidget: Widget {
    let kind: String = "ExamikWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BriefProvider()) { entry in
            ExamikWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Daily Brief")
        .description("Today's plan, streak, and nearest exam.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}

#Preview(as: .systemSmall) {
    ExamikWidget()
} timeline: {
    BriefEntry(date: .now, streak: 4, planTopic: "Quadratic equations", examName: "NMT Math", examDaysAway: 12)
}
