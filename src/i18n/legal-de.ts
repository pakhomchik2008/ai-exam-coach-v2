/**
 * German translation of the Phase 6 legal pages — mirrors legal-en.ts
 * section-for-section (same headings, same order).
 */
import type { LegalSection } from "./legal-en";

const UPDATED = "20. August 2026";

export const LEGAL_PRIVACY_DE: LegalSection[] = [
  { h: "Wer das betreibt", p: `Examik wird von Hlib Pakhomov betrieben, einem ukrainischen Staatsbürger, der Computer Systems Engineering an der University of Warwick (UK) mit einem Studentenvisum studiert — eine Einzelperson, kein eingetragenes Unternehmen. Diese Richtlinie erklärt, was Examik sammelt, warum, und was du dagegen tun kannst. Zuletzt aktualisiert am ${UPDATED}.` },
  { h: "Was wir sammeln", p: "Konto: E-Mail-Adresse und Anzeigename, erstellt über Supabase Auth. Lerndaten: deine Prüfungsliste, deinen Wochenplan, Meisterschafts-/XP-Fortschritt, dein Fehlerjournal, sowie alle Dateien oder Texte, die du dem AI-Coach schickst (Aufsätze, Fotos von Hausaufgaben, Chat-Verläufe). Benachrichtigungseinstellungen: welche der 7 E-Mail-/Push-Trigger du aktiviert hast. Abrechnung: dein Abo-Tarif und deine Stripe-Kunden-/Abo-IDs — deine Kartennummer erreicht unsere Server nie, Stripe verarbeitet sie direkt." },
  { h: "Warum wir es sammeln", p: "Um das Produkt zu betreiben: deinen Lernplan erstellen, deine Übungen bewerten, dir merken was du falsch hattest, und dem AI-Coach den Kontext geben, um mit Bezug auf deinen Stand zu antworten. Wir nutzen deine Daten nicht für Werbung und verkaufen sie an niemanden." },
  { h: "Wer es sonst noch sieht", p: "Auftragsverarbeiter, jeder nur für den genannten Zweck: Supabase (Datenbank + Authentifizierung, Row-Level-Security bedeutet, dass die Daten eines Nutzers für Abfragen eines anderen unsichtbar sind), Vercel (Hosting und die serverlosen Funktionen, über die deine Anfragen laufen), Anthropic (das Claude-Modell, das den AI-Coach antreibt — erhält die Nachricht, die du sendest, und den Lernkontext, der für eine gute Antwort nötig ist), OpenAI (nur Notfall-Fallback, falls Anthropic nicht erreichbar ist — derselbe Nachrichteninhalt, nur wenn der primäre Anbieter ausfällt), Resend (versendet die Transaktions-E-Mails, denen du zugestimmt hast), OneSignal (Web-Push, nur wenn du die Browser-Berechtigung erteilt hast), Stripe (Zahlungsabwicklung für Pro/Ultra). Keiner von ihnen darf deine Daten für eigene Zwecke nutzen." },
  { h: "KI-generierte Lerninhalte", p: "Vom KI generierte Übungsfragen werden gegen eine gemeinsame Fragenbank geprüft (per Hash und Ähnlichkeit), damit nicht zwei Lernende hintereinander dieselbe KI-Frage sehen. Diese Bank speichert den Fragetext und zu welcher Prüfung/welchem Thema er gehört — nicht deinen Namen oder dein Konto." },
  { h: "Wie lange wir es aufbewahren", p: "Solange dein Konto besteht. Lösche dein Konto in Settings, und sowohl deine Lerndaten als auch dein Supabase-Auth-Konto werden entfernt. Manche Aufzeichnungen (wie Stripe-Rechnungen) werden so lange aufbewahrt, wie es das Steuerrecht verlangt, unabhängig von deinem Examik-Konto." },
  { h: "Deine Rechte", p: "Zugriff, Berichtigung, Export oder Löschung deiner Daten — das meiste davon ist Selbstbedienung in Settings; alles andere schreib uns, und wir erledigen es manuell. Wenn du in Großbritannien oder der EU bist, hast du auch das Recht, der Verarbeitung zu widersprechen und dich bei deiner lokalen Datenschutzbehörde zu beschweren (der ICO in Großbritannien), falls du denkst, wir haben etwas falsch gemacht." },
  { h: "Sicherheit", p: "Alles läuft über HTTPS. Deine Daten sind auf Datenbankebene pro Nutzer isoliert (Postgres Row-Level-Security), nicht nur im Anwendungscode. KI-API-Schlüssel liegen ausschließlich serverseitig — sie werden nie an deinen Browser gesendet." },
  { h: "Kinder", p: "Examik richtet sich an Lernende ab 13 Jahren. Details auf der separaten Seite Children's Privacy." },
  { h: "Änderungen", p: "Wenn sich diese Richtlinie wesentlich ändert, kennzeichnen wir das auf dieser Seite und schicken bei materiellen Änderungen eine E-Mail." },
  { h: "Kontakt", p: "Fragen, Anfragen oder ein Konflikt mit dem Recht deines Landes: melde dich über die Kontaktangaben auf der Landingpage, wir klären das." },
];

export const LEGAL_TERMS_DE: LegalSection[] = [
  { h: "Was Examik ist", p: `Ein Lerntool zur Vorbereitung auf standardisierte Prüfungen (NMT, SAT, IELTS, TOEFL, Duolingo English Test, GCSE, A-Level, ZNO und weitere, die wir hinzufügen). Es garantiert keine Note, keinen Score und keine Zulassung irgendwo. Zuletzt aktualisiert am ${UPDATED}.` },
  { h: "Die KI kann sich irren", p: "Übungsfragen, Erklärungen und Bewertungen werden von einem KI-Modell generiert. Behandle sie als Übung, nicht als maßgebliche Quelle — prüfe immer den offiziellen Lehrplan oder echte frühere Prüfungen deines tatsächlichen Prüfungsamts." },
  { h: "Zulässige Nutzung", p: "Examik ist zum Lernen da, nicht zum Täuschen bei einer echten Prüfung — nutze es nicht so. Versuche nicht, die Fragenbank zu extrahieren, zu scrapen oder weiterzuverkaufen, die API zu missbrauchen (automatisierte Anfragen, Login-Sharing zur Umgehung von Limits), oder Inhalte zu erzeugen, die nichts mit dem Lernen zu tun haben." },
  { h: "Konten", p: "Du bist für die Sicherheit deines Kontos verantwortlich. Eine Person, ein Konto — teile keine Zugangsdaten, um Kontolimits zu umgehen. Wir können ein Konto, das den Dienst missbraucht, sperren oder schließen, ohne dass dies einen Anspruch auf Rückerstattung für den missbrauchten Zeitraum begründet." },
  { h: "Abonnements", p: "Pro und Ultra sind kostenpflichtige Tarife mit 3 Tagen kostenloser Testphase, monatlich oder jährlich abgerechnet zum beim Checkout angezeigten Preis. Kündige vor Ablauf der Testphase, und es wird nichts berechnet. Was danach passiert, steht in der Rückerstattungsrichtlinie." },
  { h: "Deine Inhalte", p: "Du behältst das Eigentum an allem, was du hochlädst (Aufsätze, Fotos, Notizen). Du gewährst uns die Lizenz, die zur Verarbeitung nötig ist — an das KI-Modell senden, speichern, dir wieder anzeigen — ausschließlich zum Zweck, den Dienst zu betreiben." },
  { h: "Keine Gewährleistung", p: "Der Dienst wird wie besehen bereitgestellt. Wir arbeiten daran, ihn genau und verfügbar zu halten, versprechen aber nicht, dass er fehlerfrei, unterbrechungsfrei oder für die Anforderungen eines bestimmten Prüfungsamts geeignet ist." },
  { h: "Haftung", p: "Soweit gesetzlich zulässig, haften wir nicht für Prüfungsergebnisse, verpasste Fristen oder indirekte Schäden aus der Nutzung oder Nichtnutzbarkeit von Examik. Nichts hier beschränkt eine Haftung, die das Gesetz nicht beschränken lässt." },
  { h: "Änderungen dieser Bedingungen", p: "Wir können diese Bedingungen mit der Weiterentwicklung des Produkts aktualisieren. Wesentliche Änderungen werden auf dieser Seite gekennzeichnet." },
  { h: "Anwendbares Recht", p: "Diese Bedingungen unterliegen dem Recht von England und Wales, unbeschadet zwingender Verbraucherrechte nach dem Recht deines Wohnsitzlandes." },
];

export const LEGAL_EULA_DE: LegalSection[] = [
  { h: "Was du darfst", p: `Eine persönliche, nicht übertragbare Lizenz zur Nutzung der Examik-App und -Website für deine eigene Prüfungsvorbereitung. Dies ist eine Nutzungslizenz für die Software, kein Verkauf davon, und keine Lizenz am zugrunde liegenden Code. Zuletzt aktualisiert am ${UPDATED}.` },
  { h: "Was du nicht darfst", p: "Reverse Engineering, Dekompilierung oder Versuche, den Quellcode, Modell-Prompts oder die Fragenbank zu extrahieren; Zugang weiterverkaufen oder unterlizenzieren; die App auf eine Weise nutzen, die diese Bedingungen oder die Terms of Service verletzt." },
  { h: "Speziell für iOS", p: "Die iOS-Version folgt zusätzlich der Standard-EULA von Apple (der in den App Store Terms), soweit diese Vereinbarung nicht durch diese ersetzt wird. Examik verkauft Abos nicht über Apple In-App Purchase — Pro/Ultra werden vollständig auf examik.net verwaltet, im Web, außerhalb der App." },
  { h: "Lektionsinhalte", p: "Theorie, Übungsfragen und Erklärungen im Learn-Bereich werden von einem KI-Modell nach einem Lehrplan generiert, den wir entworfen haben oder die KI entworfen und wir geprüft haben — dies ist keine offizielle Veröffentlichung eines Bildungsministeriums oder Prüfungsamts, prüfe immer den echten Lehrplan." },
  { h: "Beendigung", p: "Diese Lizenz endet automatisch, wenn du gegen ihre Bedingungen verstößt, oder wenn du dein Konto löschst. Das Ende der Lizenz macht bereits Berechnetes nicht rückgängig — siehe Rückerstattungsrichtlinie." },
];

export const LEGAL_REFUND_DE: LegalSection[] = [
  { h: "Die Testphase", p: "Jeder kostenpflichtige Tarif (Pro, Ultra) beginnt mit einer 3-tägigen kostenlosen Testphase. Kündige jederzeit innerhalb dieser 3 Tage in Settings, und es wird nichts berechnet." },
  { h: "Nach der Testphase", p: "Nach Ablauf der Testphase wird deine Karte mit dem beim Checkout angezeigten Preis für den gewählten Tarif und Abrechnungszeitraum (monatlich oder jährlich) belastet. Wiederkehrende Belastungen folgen danach im selben Rhythmus, bis du kündigst." },
  { h: "Kündigen", p: "Kündige jederzeit unter Settings → Subscription oder über das dort verlinkte Billing-Portal. Kündigen stoppt zukünftige Verlängerungen; es erstattet nicht automatisch den bereits bezahlten Zeitraum." },
  { h: "Rückerstattungsfenster", p: "Wenn seit einer Belastung (Umwandlung Testphase→bezahlt oder jede Verlängerung) weniger als 14 Tage vergangen sind und du die Belastung nicht beabsichtigt hast, oder der Dienst für dich wesentlich nicht funktioniert hat, melde dich bei uns — wir erstatten es, ohne Verhör, ohne Kleingedrucktes über diesen Absatz hinaus." },
  { h: "Außerhalb des Fensters", p: "Nach 14 Tagen erstatten wir einen abgeschlossenen Abrechnungszeitraum in der Regel nicht, prüfen aber echte Probleme (ein Abrechnungsfehler unsererseits, ein Ausfall, der deine Lernzeit gekostet hat) trotzdem im Einzelfall." },
  { h: "Wie Rückerstattungen erfolgen", p: "Rückerstattungen gehen über Stripe an die ursprüngliche Zahlungsmethode zurück, je nach Bank meist innerhalb von 5–10 Werktagen." },
  { h: "Noch keine App-Store-Abrechnung", p: "Derzeit gibt es keinen Apple In-App Purchase für Pro/Ultra — die gesamte Abrechnung läuft über Stripe im Web, daher gilt hier Apples eigener Rückerstattungsprozess nicht." },
];

export const LEGAL_COOKIES_DE: LegalSection[] = [
  { h: "Was wir tatsächlich nutzen", p: "Ein Supabase-Session-Cookie/Token, das dich eingeloggt hält. Deine Sprache, dein Theme und andere Einstellungen im localStorage deines Geräts (werden nie irgendwohin außer an unsere eigenen Server gesendet, wenn relevant). Eine OneSignal-Kennung, nur wenn du die Browser-Push-Berechtigung ausdrücklich erteilt hast." },
  { h: "Was wir nicht nutzen", p: "Keine Werbe-Tracker Dritter, keine seitenübergreifenden Tracking-Pixel, kein Google Analytics oder Äquivalent, weder auf der Landingpage noch in der App. Sollte sich das jemals ändern, wäre das eine separate, offengelegte Entscheidung — nicht still hinzugefügt." },
  { h: "Verwaltung", p: "Das Löschen des Browser-Speichers meldet dich ab und setzt lokale Einstellungen zurück. Der Widerruf der Push-Berechtigung in den Browsereinstellungen stoppt die Nutzung der OneSignal-Kennung." },
];

export const LEGAL_CHILDREN_DE: LegalSection[] = [
  { h: "Alter", p: "Examik richtet sich an Lernende ab 13 Jahren. Wenn du jünger als 13 bist, erstelle bitte kein Konto — bitte ein Elternteil oder eine Erziehungsberechtigte Person, dir bei einer altersgerechten Alternative zu helfen." },
  { h: "Eltern und Erziehungsberechtigte", p: "Wenn du glaubst, dass ein Kind unter 13 Jahren ein Konto erstellt oder uns persönliche Daten gegeben hat, melde dich bei uns, und wir löschen sie. Da viele unserer Prüfungen (GCSE, ZNO, A-Level) von Lernenden abgelegt werden, die nach dem Recht ihres Landes auch mit 13+ noch minderjährig sind, halten wir die von Teenagern erhobenen Daten auf das für das Produkt tatsächlich nötige Minimum — Lernfortschritt und Kontogrundlagen, kein Verhaltensprofiling." },
  { h: "Regionale Unterschiede", p: "Das Alter, ab dem ein junger Mensch selbst einem Online-Dienst zustimmen kann, variiert je nach Land (13 in Großbritannien und den USA; bis zu 16 in manchen EU-Mitgliedstaaten). Wenn dein Land ein höheres Alter als 13 festlegt, gilt dieses Alter, und ein Elternteil oder Erziehungsberechtigter sollte das Konto stattdessen einrichten." },
];
