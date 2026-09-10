# 명찰 만들기 Design System

## 0. Research Log
Embedded references: minimalist UI + Notion warm document surfaces. The approved operational brief takes precedence over marketing research, concept generation, and extra runtime tooling. reference.png is context, not a pixel target. The supplied `bi.PNG` is the Gyeonggi Sports Council brand asset and is rendered as a real image in the UI and printed card, never recreated as text or decorative geometry. No external assets are requested at runtime.

## 1. Atmosphere & Identity
A Gyeonggi Sports Council print workbench: warm paper, dark ink, and a bright four-colour sport ribbon used only as a small directional signature. The right side is the real sheet workspace; the left side establishes the event, then the roster. Content and physical dimensions remain the signature.

## 2. Color
Canvas #f6f5f2; paper #ffffff; ink #272923; secondary #666a61; line #dedfd7; action #087fbd; action hover #066a9f; soft blue #e8f4fa; disabled #e9eae4. Focus #087fbd. Error #9d302b on #fff1ef. Brand ribbon: blue #008cd1, green #02a95c, yellow #f4c300, red #df252b; use these only in the logo or the four-stop ribbon, never as competing button accents.

## 3. Typography
Local Noto Sans KR variable, 400–700. Body 14px/1.65, interface 15px, title 32px/1.25, section 18px/1.4, metric 26px, caption 12px. Korean prose uses keep-all and overflow-wrap:anywhere. Printed card uses the plan's 48–24pt names and 22–14pt organizations.

## 4. Spacing & Layout
4px base with 8/12/16/20/24/32/40/48px steps. Max width 1280px, desktop sidebar 320px and remaining preview. At 800px stack panels; mobile outer padding 20px. The document owns scrolling. Preview scaling must never change print dimensions.

## 5. Components
Brand mark: supplied BI image, with full `경기도체육회` alternative text in the app header and an empty alternative text in the card because its adjacent text labels the same organisation. Event field: full-width labelled native text input with an always-visible current value. Buttons: primary blue, secondary paper border, ghost; 44px minimum touch targets; hover darkens, pressed translates 1px, focus 3px outline, disabled muted. Panels: paper, 1px line, 12px radius, 24px padding. Statistics: paired label/value definition list. Dialog: native modal dialog with labelled heading, description, radio-card choices, close/cancel buttons, Escape and focus return. Empty preview: real DOM with badge outline illustration and actionable guidance, no print pages. Inputs: native controls with visible labels. Nametag: small organisation label, real BI image, event title, optional institution, then recipient name; this hierarchy is fixed to preserve printing legibility.

## 6. Motion & Interaction
No decorative animation. Button and input state changes use a 160ms opacity/colour/transform transition; focus and selected states carry meaning. Native dialog traps focus and returns focus to its trigger. Respect `prefers-reduced-motion` by removing the transition.

## 7. Depth & Surface
Tonal separation, thin borders. Sheet and modal only use diffuse shadows. Cards and buttons do not float.

## 8. Accessibility Constraints & Accepted Debt
WCAG AA target, keyboard access, 44px touch controls, visible focus, labelled radio groups and dialogs. Intended users are event staff working quickly and keyboard-only users. No accepted accessibility debt. Task 1 is a shell; workbook import and actual printing are subsequent approved tasks.
