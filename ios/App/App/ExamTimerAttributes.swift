//
//  ExamTimerAttributes.swift
//  Shared between App and ExamikWidgetExtension — the Live Activity's data
//  contract, so both sides compile against the identical type. Must carry
//  Target Membership ticked for BOTH targets in Xcode's File Inspector.
//
import ActivityKit
import Foundation

struct ExamTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var endDate: Date
    }

    var examName: String
}
