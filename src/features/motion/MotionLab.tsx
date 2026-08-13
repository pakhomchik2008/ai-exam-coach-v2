/**
 * In-app stand-in for Storybook — 20 motion pieces on one screen so the
 * 4.4 DoD can be felt without a second build toolchain.
 */
import { EnergyTicker } from "../../components/EnergyTicker";
import { SlotTick } from "../../components/SlotTick";
import {
  AmbientGlow,
  MissionRing,
  ParticleBurst,
  PredictorHero,
  RankBadge,
  StreakFlame,
  TiltCard,
  XPBar,
} from "../../components/energy/fire";
import { AnswerFeedback, DrainTimer, QuestionFlip, SegmentBar } from "../../components/energy/arcade";
import { CoachEye, TypingDots } from "../../components/energy/chat-life";
import { RecapCinema } from "../../components/energy/recap-cinema";
import { Candlestick, Heatmap, RadarChart, Sparkline, Waterfall, buildHeatCells } from "../../components/charts/energy-charts";

export function MotionLab({ onClose }: { onClose: () => void }) {
  return (
    <div className="energy" style={{ maxWidth: 880, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)" }}>Motion lab</h1>
        <button type="button" onClick={onClose}>Close</button>
      </header>
      <EnergyTicker items={[{ id: "a", label: "LIVE" }, { id: "b", label: "EXAM COACH" }]} label="tape" />
      <AmbientGlow>
        <PredictorHero nowLabel="Now" predLabel="Forecast" nowScore={142} predScore={176} />
      </AmbientGlow>
      <div className="energy-fire-row">
        <MissionRing percent={72} label="Today" />
        <StreakFlame days={12} grew />
        <XPBar into={40} need={100} level={3} />
        <RankBadge title="Adept" emoji="🔷" />
      </div>
      <TiltCard back={<p>Back</p>}><p>Tilt me</p></TiltCard>
      <DrainTimer remainingSec={54} totalSec={180} />
      <QuestionFlip flipKey="1"><div className="energy-ok" style={{ padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 12 }}>Correct card</div></QuestionFlip>
      <AnswerFeedback ok xp={30}><span>wave</span></AnswerFeedback>
      <SegmentBar results={[true, false, true, null]} />
      <TypingDots />
      <CoachEye pulse />
      <SlotTick to={176} />
      <ParticleBurst />
      <Sparkline values={[2, 4, 3, 8, 6]} />
      <RadarChart axes={[{ label: "A", value: 70 }, { label: "B", value: 40 }, { label: "C", value: 90 }]} />
      <Heatmap cells={buildHeatCells(28, {})} />
      <Waterfall steps={[{ label: "S", delta: 20 }, { label: "P", delta: 8 }, { label: "N", delta: 5 }]} />
      <Candlestick days={[{ label: "M", open: 2, high: 4, low: 1, close: 3 }]} />
      <RecapCinema score={64} delta={6} trend={[40, 50, 64]} mistakes={["Chain rule"]} comment="Keep the slot." cta={<button type="button">CTA</button>} />
    </div>
  );
}
