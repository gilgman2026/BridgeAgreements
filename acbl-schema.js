// Data-driven definition of the standard ACBL convention card, used by both
// acbl-wizard.js (collects answers) and acbl-render.js (prints them). One
// schema drives both, so a field only has to be defined once.
//
// This is a best-effort recreation of the card's sections/fields, not a
// pixel copy — the exact lead-card-by-card grid is intentionally left out
// (see the "leads" section) in favor of the standard radio choices, since
// full fidelity there would need a much larger UI for something most
// partnerships fill in sparsely.
//
// Field types:
//   text          - free text, value: string
//   textarea      - multi-line text, value: string
//   checkbox      - single yes/no, value: boolean
//   checkboxText  - a checkbox with an adjoining blank (e.g. "Penalty [ ] ____"),
//                   value: { checked: boolean, text: string }
//   range         - "____ to ____", value: { from: string, to: string }
//   checklist     - a row of independent checkboxes sharing one label,
//                   value: { [optionValue]: boolean }
//
// `column` places a section in the printed layout: "left" | "middle" |
// "right" | "bottom" (bottom spans the full width, used for the notes
// section that catches anything the hint-matcher couldn't place).

// Prefix for the hidden data marker embedded in a generated ACBL PDF (see
// acbl-export.js) — distinct from the regular card's DATA_MARKER (app.js)
// so the two file types are never confused when re-uploaded.
const ACBL_DATA_MARKER = "BRIDGEACBL1:";

const ACBL_SECTIONS = [
  {
    id: "specialDoubles", title: "Special Doubles", column: "left",
    fields: [
      { key: "afterOvercall", type: "checkboxText", label: "After Overcall: Penalty", textPlaceholder: "detail" },
      { key: "negative", type: "checkboxText", label: "Negative, thru", textPlaceholder: "e.g. 4♠" },
      { key: "responsive", type: "checkboxText", label: "Responsive, thru", textPlaceholder: "level" },
      { key: "maximal", type: "checkbox", label: "Maximal" },
      { key: "support", type: "checkboxText", label: "Support Dbl, thru", textPlaceholder: "level" },
      { key: "supportRedbl", type: "checkbox", label: "Support Redbl" },
      { key: "cardShowing", type: "checkbox", label: "Card-showing" },
      { key: "minOffshapeTO", type: "checkbox", label: "Min. Offshape T/O" },
      { key: "other", type: "text", label: "Other" }
    ]
  },
  {
    id: "simpleOvercall", title: "Simple Overcall", column: "left",
    fields: [
      { key: "range", type: "range", label: "1-level, HCP (usually)" },
      { key: "often4Cards", type: "checkbox", label: "Often 4 cards" },
      { key: "veryLightStyle", type: "checkbox", label: "Very light style" },
      { key: "newSuit", type: "checklist", label: "New Suit", options: [
        { value: "forcing", label: "Forcing" }, { value: "nfConstructive", label: "NF Constructive" }, { value: "nf", label: "NF" }
      ] },
      { key: "jumpRaise", type: "checklist", label: "Jump Raise", options: [
        { value: "forcing", label: "Forcing" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] }
    ]
  },
  {
    id: "jumpOvercall", title: "Jump Overcall", column: "left",
    fields: [
      { key: "style", type: "checklist", label: "", options: [
        { value: "strong", label: "Strong" }, { value: "intermediate", label: "Intermediate" }, { value: "weak", label: "Weak" }
      ] },
      { key: "other", type: "text", label: "Other" }
    ]
  },
  {
    id: "openingPreempts", title: "Opening Preempts", column: "left",
    fields: [
      { key: "style", type: "checklist", label: "3/4-bids", options: [
        { value: "sound", label: "Sound" }, { value: "light", label: "Light" }, { value: "veryLight", label: "Very Light" }
      ] },
      { key: "convResp", type: "text", label: "Conv./Resp." }
    ]
  },
  {
    id: "directCuebid", title: "Direct Cuebid", column: "left",
    fields: [
      { key: "overMinor", type: "checklist", label: "Over Minor", options: [
        { value: "natural", label: "Natural" }, { value: "strongTO", label: "Strong T/O" }, { value: "michaels", label: "Michaels" }
      ] },
      { key: "overMajor", type: "checklist", label: "Over Major", options: [
        { value: "natural", label: "Natural" }, { value: "strongTO", label: "Strong T/O" }, { value: "michaels", label: "Michaels" }
      ] },
      { key: "other", type: "text", label: "Other" }
    ]
  },
  {
    id: "slamConventions", title: "Slam Conventions", column: "left",
    fields: [
      { key: "fourNT", type: "checklist", label: "4NT", options: [
        { value: "gerber", label: "Gerber" }, { value: "blackwood", label: "Blackwood" }, { value: "rkc", label: "RKC" }, { value: "the1430", label: "1430" }
      ] },
      { key: "notes", type: "text", label: "Notes" },
      { key: "interference", type: "checklist", label: "vs Interference", options: [
        { value: "dopi", label: "DOPI" }, { value: "depo", label: "DEPO" }, { value: "ropi", label: "ROPI" }
      ] },
      { key: "interferenceLevel", type: "text", label: "Level" }
    ]
  },
  {
    id: "leads", title: "Leads", column: "left",
    fields: [
      { key: "lengthLeadsSuits", type: "checklist", label: "vs Suits", options: [
        { value: "fourthBest", label: "4th Best" }, { value: "thirdFifth", label: "3rd/5th Best" }
      ] },
      { key: "lengthLeadsNT", type: "checklist", label: "vs Notrump", options: [
        { value: "fourthBest", label: "4th Best" }, { value: "thirdFifth", label: "3rd/5th Best" }, { value: "attitude", label: "Attitude" }
      ] },
      { key: "primarySignal", type: "checklist", label: "Primary signal to partner's leads", options: [
        { value: "attitude", label: "Attitude" }, { value: "count", label: "Count" }, { value: "suitPreference", label: "Suit preference" }
      ] }
    ]
  },
  {
    id: "defensiveCarding", title: "Defensive Carding", column: "left",
    fields: [
      { key: "suits", type: "checklist", label: "vs Suits", options: [
        { value: "standard", label: "Standard" }, { value: "upsideDownCount", label: "Upside-Down (count)" }, { value: "upsideDownAttitude", label: "Upside-Down (attitude)" }
      ] },
      { key: "nt", type: "checklist", label: "vs Notrump", options: [
        { value: "standard", label: "Standard" }, { value: "upsideDownCount", label: "Upside-Down (count)" }, { value: "upsideDownAttitude", label: "Upside-Down (attitude)" }
      ] },
      { key: "except", type: "checkboxText", label: "Except", textPlaceholder: "detail" }
    ]
  },
  {
    id: "firstDiscard", title: "First Discard", column: "left",
    fields: [
      { key: "signal", type: "checklist", label: "", options: [
        { value: "lavinthal", label: "Lavinthal" }, { value: "oddEven", label: "Odd/Even" }
      ] }
    ]
  },
  {
    id: "otherCarding", title: "Other Carding", column: "left",
    fields: [
      { key: "items", type: "checklist", label: "", options: [
        { value: "smithEcho", label: "Smith Echo" }, { value: "trumpSuitPref", label: "Trump Suit Pref." }, { value: "fosterEcho", label: "Foster Echo" }
      ] },
      { key: "specialCarding", type: "checkbox", label: "Special Carding (attach sheet)" },
      { key: "pleaseAsk", type: "checkbox", label: "Please Ask" }
    ]
  },

  {
    id: "notrumpOvercalls", title: "Notrump Overcalls", column: "middle",
    fields: [
      { key: "direct", type: "range", label: "Direct" },
      { key: "directSystemsOn", type: "checkbox", label: "Systems on" },
      { key: "directConv", type: "text", label: "Conv." },
      { key: "balancing", type: "range", label: "Balancing" },
      { key: "jumpTo2NT", type: "checklist", label: "Jump to 2NT", options: [
        { value: "minors", label: "Minors" }, { value: "twoLowest", label: "2 Lowest" }
      ] },
      { key: "balancingConv", type: "text", label: "Conv." }
    ]
  },
  {
    id: "defenseVsNotrump", title: "Defense vs Notrump", column: "middle",
    fields: [
      { key: "vs2c", type: "text", label: "vs 2♣" },
      { key: "vs2d", type: "text", label: "vs 2♦" },
      { key: "vs2h", type: "text", label: "vs 2♥" },
      { key: "vs2s", type: "text", label: "vs 2♠" },
      { key: "vsDbl", type: "text", label: "vs Dbl" },
      { key: "other", type: "text", label: "Other" }
    ]
  },
  {
    id: "overOppTODouble", title: "Over Opp's T/O Double", column: "middle",
    fields: [
      { key: "newSuitForcing", type: "checklist", label: "New Suit Forcing", options: [
        { value: "oneLevel", label: "1 level" }, { value: "twoLevel", label: "2 level" }
      ] },
      { key: "jumpShift", type: "checklist", label: "Jump Shift", options: [
        { value: "forcing", label: "Forcing" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] },
      { key: "redoubleNoFit", type: "checkbox", label: "Redouble implies no fit" },
      { key: "twoNTOverMajors", type: "checklist", label: "2NT Over — Majors", options: [
        { value: "limitPlus", label: "Limit+" }, { value: "limit", label: "Limit" }, { value: "weak", label: "Weak" }
      ] },
      { key: "twoNTOverMinors", type: "checklist", label: "2NT Over — Minors", options: [
        { value: "limitPlus", label: "Limit+" }, { value: "limit", label: "Limit" }, { value: "weak", label: "Weak" }
      ] },
      { key: "other", type: "text", label: "Other" }
    ]
  },
  {
    id: "vsOpeningPreempts", title: "vs Opening Preempts", column: "middle",
    fields: [
      { key: "doubleIs", type: "checklist", label: "Double Is", options: [
        { value: "takeout", label: "Takeout" }, { value: "penalty", label: "Penalty" }
      ] },
      { key: "takeoutThru", type: "text", label: "Takeout thru" },
      { key: "convTakeout", type: "text", label: "Conv. Takeout" },
      { key: "lebensohl", type: "checkbox", label: "Lebensohl 2NT Response" },
      { key: "other", type: "text", label: "Other" }
    ]
  },

  {
    id: "names", title: "Names", column: "right",
    fields: [
      { key: "pairNames", type: "text", label: "Names" }
    ]
  },
  {
    id: "generalApproach", title: "General Approach", column: "right",
    fields: [
      { key: "twoOverOne", type: "checklist", label: "Two Over One", options: [
        { value: "gameForcing", label: "Game Forcing" }, { value: "gfExceptSuitRebid", label: "GF Except When Suit Rebid" }
      ] },
      { key: "veryLight", type: "checklist", label: "Very Light", options: [
        { value: "openings", label: "Openings" }, { value: "thirdHand", label: "3rd Hand" }, { value: "overcalls", label: "Overcalls" }, { value: "preempts", label: "Preempts" }
      ] },
      { key: "forcingOpening", type: "checklist", label: "Forcing Opening", options: [
        { value: "oneClub", label: "1♣" }, { value: "twoClub", label: "2♣" }, { value: "natural2Bids", label: "Natural 2 Bids" }
      ] },
      { key: "forcingOpeningOther", type: "text", label: "Other" }
    ]
  },
  {
    id: "notrumpOpening", title: "Notrump Opening Bids", column: "right",
    fields: [
      { key: "range1", type: "range", label: "1NT range (1st/2nd seat)" },
      { key: "range2", type: "range", label: "1NT range (3rd/4th seat)" },
      { key: "fiveCardMajorCommon", type: "checkbox", label: "5-card Major common" },
      { key: "systemOnOverInterference", type: "text", label: "System on over interference" },
      { key: "twoClub", type: "checklist", label: "2♣", options: [
        { value: "stayman", label: "Stayman" }, { value: "puppet", label: "Puppet" }
      ] },
      { key: "twoDiamond", type: "checklist", label: "2♦", options: [
        { value: "transferHearts", label: "Transfer to ♥" }, { value: "forcingStayman", label: "Forcing Stayman" }
      ] },
      { key: "twoHeart", type: "checkbox", label: "2♥ Transfer to ♠" },
      { key: "twoSpade", type: "text", label: "2♠" },
      { key: "twoNT", type: "text", label: "2NT" },
      { key: "threeClub", type: "text", label: "3♣" },
      { key: "threeDiamond", type: "text", label: "3♦" },
      { key: "threeHeart", type: "text", label: "3♥" },
      { key: "threeSpade", type: "text", label: "3♠" },
      { key: "other4Suit", type: "checklist", label: "", options: [
        { value: "fourTransfer", label: "4♦/4♥ Transfer" }, { value: "smolen", label: "Smolen" }, { value: "lebensohl", label: "Lebensohl" }
      ] },
      { key: "lebensohlDenies", type: "text", label: "Lebensohl denies" },
      { key: "negDouble", type: "text", label: "Neg. Double" },
      { key: "other", type: "text", label: "Other" },
      { key: "twoNTRange", type: "range", label: "2NT range" },
      { key: "puppetStayman2NT", type: "checkbox", label: "Puppet Stayman (over 2NT)" },
      { key: "transferResponses", type: "checklist", label: "Transfer Responses", options: [
        { value: "jacoby", label: "Jacoby" }, { value: "texas", label: "Texas" }
      ] },
      { key: "threeNTRange", type: "range", label: "3NT range" },
      { key: "conventionalNTOpenings", type: "text", label: "Conventional NT Openings" }
    ]
  },
  {
    id: "majorOpening", title: "Major Opening", column: "right",
    fields: [
      { key: "minLength1st2nd", type: "checklist", label: "Expected Min. Length (1st/2nd)", options: [
        { value: "four", label: "4" }, { value: "five", label: "5" }
      ] },
      { key: "minLength3rd4th", type: "checklist", label: "Expected Min. Length (3rd/4th)", options: [
        { value: "four", label: "4" }, { value: "five", label: "5" }
      ] },
      { key: "doubleRaise", type: "checklist", label: "Double Raise", options: [
        { value: "force", label: "Force" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] },
      { key: "afterOvercall", type: "checklist", label: "After Overcall", options: [
        { value: "force", label: "Force" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] },
      { key: "convRaise", type: "checklist", label: "Conv. Raise", options: [
        { value: "twoNT", label: "2NT" }, { value: "threeNT", label: "3NT" }, { value: "splinter", label: "Splinter" }
      ] },
      { key: "other", type: "text", label: "Other" },
      { key: "oneNT", type: "checklist", label: "1NT", options: [
        { value: "forcing", label: "Forcing" }, { value: "semiForcing", label: "Semi-forcing" }
      ] },
      { key: "twoNTForcing", type: "checkbox", label: "2NT Forcing" },
      { key: "twoNTInvRange", type: "range", label: "2NT Inv. range" },
      { key: "threeNTRange", type: "range", label: "3NT range" },
      { key: "drury", type: "checklist", label: "Drury", options: [
        { value: "reverse", label: "Reverse" }, { value: "twoWay", label: "2-Way" }, { value: "fit", label: "Fit" }
      ] }
    ]
  },
  {
    id: "minorOpening", title: "Minor Opening", column: "right",
    fields: [
      { key: "minLength1st2nd", type: "checklist", label: "Expected Min. Length (1st/2nd)", options: [
        { value: "four", label: "4" }, { value: "three", label: "3" }, { value: "zeroToTwoConv", label: "0–2 Conv." }
      ] },
      { key: "minLength3rd4th", type: "checklist", label: "Expected Min. Length (3rd/4th)", options: [
        { value: "four", label: "4" }, { value: "three", label: "3" }, { value: "zeroToTwoConv", label: "0–2 Conv." }
      ] },
      { key: "doubleRaise", type: "checklist", label: "Double Raise", options: [
        { value: "force", label: "Force" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] },
      { key: "afterOvercall", type: "checklist", label: "After Overcall", options: [
        { value: "force", label: "Force" }, { value: "inv", label: "Inv." }, { value: "weak", label: "Weak" }
      ] },
      { key: "forcingRaiseJS", type: "checkbox", label: "Forcing Raise: J/S in other minor" },
      { key: "singleRaiseOther", type: "text", label: "Single raise Other" },
      { key: "bypass4Diamond", type: "checkbox", label: "Frequently bypass 4+♦" },
      { key: "oneNTOneClubRange", type: "range", label: "1NT/1♣ range" },
      { key: "twoNTForcing", type: "checkbox", label: "2NT Forcing" },
      { key: "twoNTInvRange", type: "range", label: "2NT Inv. range" },
      { key: "threeNTRange", type: "range", label: "3NT range" }
    ]
  },
  {
    id: "twoLevelDescribe", title: "2♣ / 2♦ / 2♥ / 2♠ — Describe, Responses & Rebids", column: "right",
    fields: [
      { key: "twoClubRange", type: "range", label: "2♣ HCP" },
      { key: "twoClubStyle", type: "checklist", label: "2♣", options: [
        { value: "strong", label: "Strong" }, { value: "other", label: "Other" }
      ] },
      { key: "twoClubResponses", type: "text", label: "2♣ Responses/Rebids" },
      { key: "twoDiamondResp", type: "checklist", label: "2♦ Resp.", options: [
        { value: "neg", label: "Neg." }, { value: "waiting", label: "Waiting" }
      ] },
      { key: "twoDiamondRange", type: "range", label: "2♦ HCP" },
      { key: "twoDiamondStyle", type: "checklist", label: "2♦ Natural", options: [
        { value: "weak", label: "Weak" }, { value: "intermediate", label: "Intermediate" }, { value: "strong", label: "Strong" }, { value: "conv", label: "Conv." }
      ] },
      { key: "twoDiamondRebids", type: "checklist", label: "2♦ Rebids", options: [
        { value: "twoNTForce", label: "2NT Force" }, { value: "newSuitNF", label: "New Suit NF" }
      ] },
      { key: "twoHeartRange", type: "range", label: "2♥ HCP" },
      { key: "twoHeartStyle", type: "checklist", label: "2♥ Natural", options: [
        { value: "weak", label: "Weak" }, { value: "intermediate", label: "Intermediate" }, { value: "strong", label: "Strong" }, { value: "conv", label: "Conv." }
      ] },
      { key: "twoHeartRebids", type: "checklist", label: "2♥ Rebids", options: [
        { value: "twoNTForce", label: "2NT Force" }, { value: "newSuitNF", label: "New Suit NF" }
      ] },
      { key: "twoSpadeRange", type: "range", label: "2♠ HCP" },
      { key: "twoSpadeStyle", type: "checklist", label: "2♠ Natural", options: [
        { value: "weak", label: "Weak" }, { value: "intermediate", label: "Intermediate" }, { value: "strong", label: "Strong" }, { value: "conv", label: "Conv." }
      ] },
      { key: "twoSpadeRebids", type: "checklist", label: "2♠ Rebids", options: [
        { value: "twoNTForce", label: "2NT Force" }, { value: "newSuitNF", label: "New Suit NF" }
      ] },
      { key: "newMinorForcing", type: "checklist", label: "Other Conv. Calls", options: [
        { value: "nmf", label: "New Minor Forcing" }, { value: "twoWayNMF", label: "2-Way NMF" }
      ] },
      { key: "weakJumpShifts", type: "checklist", label: "Weak Jump Shifts", options: [
        { value: "inComp", label: "In Comp." }, { value: "notInComp", label: "Not in Comp." }
      ] },
      { key: "fourthSuitForcing", type: "checklist", label: "4th Suit Forcing", options: [
        { value: "oneRound", label: "1 Rd." }, { value: "game", label: "Game" }
      ] }
    ]
  },

  {
    id: "additionalNotes", title: "Additional Notes (carried over from your existing card)", column: "bottom",
    fields: [
      { key: "text", type: "textarea", label: "" }
    ]
  }
];

function findAcblField(sectionId, fieldKey) {
  const section = ACBL_SECTIONS.find(s => s.id === sectionId);
  return section && section.fields.find(f => f.key === fieldKey);
}

function defaultAcblState() {
  const s = {};
  ACBL_SECTIONS.forEach(section => { s[section.id] = {}; });
  return s;
}

// Backfills a loaded/older acblState against the current section list, the
// same way app.js's loadState() backfills the regular card against
// DEFAULT_CONFIG — so a PDF generated by an earlier version of this schema
// (missing a section that's since been added) still opens cleanly.
function mergeAcblState(loaded) {
  const merged = defaultAcblState();
  Object.keys(merged).forEach(sectionId => {
    if (loaded && loaded[sectionId]) Object.assign(merged[sectionId], loaded[sectionId]);
  });
  return merged;
}

// ---- Hint matching ----
//
// Looks at the already-completed simplified card and suggests answers for
// the handful of ACBL fields with a clean, high-confidence mapping (names,
// 1NT ranges, and a set of well-known convention keywords). Everything from
// the source card that isn't confidently matched is collected verbatim into
// `extra` instead of being guessed at, and later shown to the user as a
// free-text notes field they can redistribute or leave as-is — nothing from
// the original card is silently dropped.

const ACBL_KEYWORD_HINTS = [
  { re: /stayman/i, apply: h => h.checklistOpt("notrumpOpening", "twoClub", "stayman") },
  { re: /puppet/i, apply: h => h.checklistOpt("notrumpOpening", "twoClub", "puppet") },
  { re: /jacoby/i, apply: h => h.checklistOpt("notrumpOpening", "transferResponses", "jacoby") },
  { re: /texas/i, apply: h => h.checklistOpt("notrumpOpening", "transferResponses", "texas") },
  { re: /smolen/i, apply: h => h.checklistOpt("notrumpOpening", "other4Suit", "smolen") },
  { re: /lebensohl/i, apply: h => h.checklistOpt("notrumpOpening", "other4Suit", "lebensohl") },
  { re: /gerber/i, apply: h => h.checklistOpt("slamConventions", "fourNT", "gerber") },
  { re: /blackwood/i, apply: h => h.checklistOpt("slamConventions", "fourNT", "blackwood") },
  { re: /\brkc\b|roman\s*key\s*card/i, apply: h => h.checklistOpt("slamConventions", "fourNT", "rkc") },
  { re: /1430/, apply: h => h.checklistOpt("slamConventions", "fourNT", "the1430") },
  { re: /4th\s*best/i, apply: h => { h.checklistOpt("leads", "lengthLeadsSuits", "fourthBest"); h.checklistOpt("leads", "lengthLeadsNT", "fourthBest"); } },
  { re: /3rd\W*5th|third\W*fifth/i, apply: h => { h.checklistOpt("leads", "lengthLeadsSuits", "thirdFifth"); h.checklistOpt("leads", "lengthLeadsNT", "thirdFifth"); } },
  { re: /attitude/i, apply: h => h.checklistOpt("leads", "primarySignal", "attitude") },
  { re: /\bcount\b/i, apply: h => h.checklistOpt("leads", "primarySignal", "count") },
  { re: /suit\s*pref/i, apply: h => h.checklistOpt("leads", "primarySignal", "suitPreference") },
  { re: /upside[- ]?down.*attitude|attitude.*upside[- ]?down/i, apply: h => { h.checklistOpt("defensiveCarding", "suits", "upsideDownAttitude"); h.checklistOpt("defensiveCarding", "nt", "upsideDownAttitude"); } },
  { re: /upside[- ]?down.*count|count.*upside[- ]?down/i, apply: h => { h.checklistOpt("defensiveCarding", "suits", "upsideDownCount"); h.checklistOpt("defensiveCarding", "nt", "upsideDownCount"); } },
  { re: /\bstandard\b/i, apply: h => { h.checklistOpt("defensiveCarding", "suits", "standard"); h.checklistOpt("defensiveCarding", "nt", "standard"); } },
  { re: /lavinthal/i, apply: h => h.checklistOpt("firstDiscard", "signal", "lavinthal") },
  { re: /odd[\s/-]*even/i, apply: h => h.checklistOpt("firstDiscard", "signal", "oddEven") },
  { re: /smith\s*echo/i, apply: h => h.checklistOpt("otherCarding", "items", "smithEcho") },
  { re: /trump\s*suit\s*pref/i, apply: h => h.checklistOpt("otherCarding", "items", "trumpSuitPref") },
  { re: /foster\s*echo/i, apply: h => h.checklistOpt("otherCarding", "items", "fosterEcho") },
  { re: /negative\s*double/i, apply: h => h.checkboxTextChecked("specialDoubles", "negative") },
  { re: /responsive\s*double/i, apply: h => h.checkboxTextChecked("specialDoubles", "responsive") },
  { re: /support\s*double/i, apply: h => h.checkboxTextChecked("specialDoubles", "support") },
  { re: /takeout\s*double/i, apply: h => h.checklistOpt("vsOpeningPreempts", "doubleIs", "takeout") }
];

function computeAcblHints(sourceState) {
  const hints = defaultAcblState();
  const extra = [];

  const helpers = {
    checklistOpt(sectionId, fieldKey, optValue) {
      hints[sectionId][fieldKey] = hints[sectionId][fieldKey] || {};
      hints[sectionId][fieldKey][optValue] = true;
    },
    checkboxTextChecked(sectionId, fieldKey) {
      hints[sectionId][fieldKey] = Object.assign({ checked: true, text: "" }, hints[sectionId][fieldKey]);
    }
  };

  if (sourceState.header && sourceState.header.pairNames) {
    hints.names.pairNames = sourceState.header.pairNames;
  }

  const ranges = (sourceState.generalApproach && sourceState.generalApproach.notrumpRanges) || [];
  ranges.slice(0, 2).forEach((r, i) => {
    const m = /(\d+)\s*[-–—]\s*(\d+)/.exec(r.range || "");
    if (m) {
      hints.notrumpOpening[i === 0 ? "range1" : "range2"] = { from: m[1], to: m[2] };
    } else if (r.range) {
      extra.push(`1NT range (${r.seat || "seat"}): ${r.range}`);
    }
  });

  const texts = [];
  (sourceState.notrumpConventions || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(" — ")));
  (sourceState.conventions || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(" — ")));
  (sourceState.leads || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(": ")));
  (sourceState.signals || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(": ")));
  (sourceState.defenses || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(": ")));
  (sourceState.doubles || []).forEach(r => texts.push([r.label, r.note].filter(Boolean).join(": ")));

  texts.filter(Boolean).forEach(text => {
    let matched = false;
    ACBL_KEYWORD_HINTS.forEach(k => {
      if (k.re.test(text)) { k.apply(helpers); matched = true; }
    });
    if (!matched) extra.push(text.trim());
  });

  if (sourceState.generalApproach && sourceState.generalApproach.summary) {
    extra.unshift(`General approach (from original card): ${sourceState.generalApproach.summary}`);
  }
  (sourceState.openingBids || []).forEach(b => {
    if (b.bid || b.meaning) extra.push(`${b.bid || "?"}: ${b.meaning || ""}${b.alert ? " (alert)" : ""}`);
  });
  if (sourceState.notes) extra.push(`Notes (from original card): ${sourceState.notes}`);

  return { hints, extra };
}
