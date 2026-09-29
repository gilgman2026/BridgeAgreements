// Pixel-precise positions for overlaying acblState values onto the exact
// background image of the reference ACBL card (assets/acbl-card-front.png),
// measured directly from that card's own PDF (vector rects for every
// checkbox, character-level positions for every blank line) via
// pdfplumber — not eyeballed. Units are PDF points from the page's
// top-left corner (the page is 576x612pt = 8in x 8.5in), which map 1:1 to
// CSS `pt` units, so acbl-render.js can position overlay elements with
// left/top in `pt` directly from these numbers with no conversion.
//
// IMPORTANT convention: a field's `y` is the same top coordinate as the
// printed label/checkbox on that row — NOT a baseline-adjusted value. An
// earlier version of this file added an extra ~7-8pt downward offset to
// every text/range value assuming it was needed for visual alignment; it
// wasn't measured, and it pushed most typed values down into the next
// printed row. Don't reintroduce a "baseline" offset without measuring it
// against a rendered proof first.
//
// Shape per field, matching acbl-schema.js's field types:
//   checkbox / one option of a checklist  -> {x, y}            (box top-left)
//   checkboxText                          -> {box:{x,y}, text:{x,y}}
//   text                                  -> {x, y}             (start of the blank line)
//   range                                 -> {from:{x,y}, to:{x,y}}
//   checklist                             -> {optionValue: {x,y}, ...}
//
// A field/option with no entry here (a handful of very granular items on
// the original card that acbl-schema.js doesn't model — see the scoping
// notes) simply never gets an overlay; the pre-printed card underneath is
// unaffected.

const ACBL_IMAGE_POSITIONS = {
  specialDoubles: {
    afterOvercall: { box: { x: 86.4, y: 28.3 }, text: { x: 98.6, y: 28.3 } },
    negative: { box: { x: 38.3, y: 40.3 }, text: { x: 67.9, y: 40.3 } },
    responsive: { box: { x: 47.1, y: 52.3 }, text: { x: 82.1, y: 52.3 } },
    maximal: { x: 133.7, y: 52.3 },
    support: { box: { x: 54.4, y: 64.3 }, text: { x: 84.1, y: 64.3 } },
    supportRedbl: { x: 126.6, y: 64.3 },
    cardShowing: { x: 55.7, y: 76.3 },
    minOffshapeTO: { x: 135.4, y: 76.3 },
    other: { x: 10.4, y: 88.3 }
  },
  simpleOvercall: {
    range: { from: { x: 36.0, y: 116.7 }, to: { x: 65.6, y: 116.7 } },
    often4Cards: { x: 57.5, y: 127.5 },
    veryLightStyle: { x: 120.3, y: 127.5 },
    newSuit: { forcing: { x: 73.7, y: 148.3 }, nfConstructive: { x: 113.1, y: 148.3 }, nf: { x: 133.6, y: 148.3 } },
    jumpRaise: { forcing: { x: 83.0, y: 158.3 }, inv: { x: 106.5, y: 158.3 }, weak: { x: 136.0, y: 158.3 } }
  },
  jumpOvercall: {
    style: { strong: { x: 31.3, y: 199.3 }, intermediate: { x: 92.6, y: 199.3 }, weak: { x: 130.7, y: 199.3 } },
    other: { x: 10.4, y: 209.3 }
  },
  openingPreempts: {
    style: { sound: { x: 61.1, y: 249.3 }, light: { x: 91.6, y: 249.3 }, veryLight: { x: 128.1, y: 249.3 } },
    convResp: { x: 57.2, y: 259.3 }
  },
  directCuebid: {
    overMinor: { natural: { x: 77.6, y: 302.3 }, strongTO: { x: 77.6, y: 312.3 }, michaels: { x: 77.6, y: 322.3 } },
    overMajor: { natural: { x: 112.6, y: 302.3 }, strongTO: { x: 112.6, y: 312.3 }, michaels: { x: 112.6, y: 322.3 } },
    other: { x: 14.7, y: 328.3 }
  },
  slamConventions: {
    fourNT: { gerber: { x: 128.3, y: 347.4 }, blackwood: { x: 203.4, y: 347.4 }, rkc: { x: 233.2, y: 347.4 }, the1430: { x: 267.0, y: 347.4 } },
    notes: { x: 10.4, y: 358.4 },
    interference: { dopi: { x: 89.8, y: 380.4 }, depo: { x: 128.7, y: 380.4 }, ropi: { x: 271.5, y: 380.4 } },
    interferenceLevel: { x: 177.0, y: 380.4 }
  },
  leads: {
    lengthLeadsSuits: { fourthBest: { x: 116.0, y: 520.2 }, thirdFifth: { x: 116.0, y: 531.2 } },
    lengthLeadsNT: { fourthBest: { x: 152.0, y: 520.2 }, thirdFifth: { x: 152.0, y: 531.2 }, attitude: { x: 152.0, y: 542.2 } },
    primarySignal: { attitude: { x: 40.3, y: 570.7 }, count: { x: 79.7, y: 570.7 }, suitPreference: { x: 147.9, y: 570.7 } }
  },
  defensiveCarding: {
    suits: { standard: { x: 242.7, y: 417.1 }, upsideDown: { x: 242.7, y: 461.2 } },
    nt: { standard: { x: 268.7, y: 417.1 }, upsideDown: { x: 268.7, y: 461.2 } },
    except: { x: 170.7, y: 436.6 }
  },
  firstDiscard: {
    signal: { lavinthal: { x: 242.7, y: 510.3 }, oddEven: { x: 242.7, y: 520.0 } }
  },
  otherCarding: {
    items: { smithEcho: { x: 242.7, y: 551.5 }, trumpSuitPref: { x: 242.7, y: 559.4 }, fosterEcho: { x: 242.7, y: 571.1 } },
    specialCarding: { x: 161.1, y: 586.4 },
    pleaseAsk: { x: 152.0, y: 541.8 }
  },

  notrumpOvercalls: {
    direct: { from: { x: 184.7, y: 29.4 }, to: { x: 214.3, y: 29.4 } },
    directSystemsOn: { x: 272.5, y: 29.4 },
    directConv: { x: 186.0, y: 40.4 },
    balancing: { from: { x: 200.1, y: 51.4 }, to: { x: 239.1, y: 51.4 } },
    jumpTo2NT: { minors: { x: 227.8, y: 62.4 }, twoLowest: { x: 271.1, y: 62.4 } },
    balancingConv: { x: 186.0, y: 73.4 }
  },
  defenseVsNotrump: {
    vs2c: { x: 175.3, y: 111.0 },
    vs2d: { x: 175.3, y: 121.0 },
    vs2h: { x: 175.3, y: 131.0 },
    vs2s: { x: 175.3, y: 141.2 },
    vsDbl: { x: 175.3, y: 151.2 },
    other: { x: 175.3, y: 160.3 }
  },
  overOppTODouble: {
    newSuitForcing: { oneLevel: { x: 233.4, y: 198.2 }, twoLevel: { x: 262.3, y: 198.2 } },
    jumpShift: { forcing: { x: 217.9, y: 209.5 }, inv: { x: 237.1, y: 209.5 }, weak: { x: 263.5, y: 209.5 } },
    redoubleNoFit: { x: 227.9, y: 220.8 },
    twoNTOverMajors: { limitPlus: { x: 210.8, y: 243.4 }, limit: { x: 237.8, y: 243.4 }, weak: { x: 262.5, y: 243.4 } },
    twoNTOverMinors: { limitPlus: { x: 210.8, y: 253.4 }, limit: { x: 237.8, y: 253.4 }, weak: { x: 262.5, y: 253.4 } },
    other: { x: 175.3, y: 264.7 }
  },
  vsOpeningPreempts: {
    doubleIs: { takeout: { x: 181.5, y: 295.3 }, penalty: { x: 267.6, y: 295.3 } },
    takeoutThru: { x: 212.3, y: 295.3 },
    convTakeout: { x: 208.0, y: 306.6 },
    lebensohl: { x: 244.0, y: 317.9 },
    other: { x: 180.0, y: 329.2 }
  },

  names: {
    pairNames: { x: 316.9, y: 25.4 }
  },
  generalApproach: {
    twoOverOne: { gameForcing: { x: 394.4, y: 67.9 }, gfExceptSuitRebid: { x: 531.6, y: 67.9 } },
    veryLight: { openings: { x: 369.6, y: 78.2 }, thirdHand: { x: 422.3, y: 78.2 }, overcalls: { x: 472.5, y: 78.2 }, preempts: { x: 524.0, y: 78.2 } },
    forcingOpening: { oneClub: { x: 374.4, y: 88.2 }, twoClub: { x: 402.2, y: 88.2 }, natural2Bids: { x: 462.0, y: 88.2 } },
    forcingOpeningOther: { x: 507.4, y: 88.5 }
  },
  notrumpOpening: {
    range1: { from: { x: 292.2, y: 123.4 }, to: { x: 334.3, y: 123.4 } },
    range2: { from: { x: 292.2, y: 135.4 }, to: { x: 334.3, y: 135.4 } },
    fiveCardMajorCommon: { x: 363.4, y: 142.9 },
    systemOnOverInterference: { x: 340.1, y: 156.4 },
    twoClub: { stayman: { x: 335.3, y: 166.2 }, puppet: { x: 366.9, y: 166.2 } },
    twoDiamond: { transferHearts: { x: 350.0, y: 177.1 }, forcingStayman: { x: 360.8, y: 187.9 } },
    twoHeart: { x: 350.0, y: 198.1 },
    twoSpade: { x: 308.9, y: 208.9 },
    twoNT: { x: 308.9, y: 219.9 },
    threeClub: { x: 396.5, y: 120.2 },
    threeDiamond: { x: 396.5, y: 132.5 },
    threeHeart: { x: 396.5, y: 143.2 },
    threeSpade: { x: 396.5, y: 154.7 },
    other4Suit: { fourTransfer: { x: 443.2, y: 178.3 }, smolen: { x: 405.5, y: 187.9 }, lebensohl: { x: 414.5, y: 198.1 } },
    lebensohlDenies: { x: 429, y: 199.4 },
    negDouble: { x: 433, y: 209.8 },
    other: { x: 402.8, y: 220.2 },
    twoNTRange: { from: { x: 499.4, y: 111.0 }, to: { x: 532.1, y: 111.0 } },
    puppetStayman2NT: { x: 541.6, y: 120.2 },
    transferResponses: { jacoby: { x: 511.9, y: 140.6 }, texas: { x: 550.3, y: 140.6 } },
    threeNTRange: { from: { x: 499.3, y: 174.4 }, to: { x: 532.1, y: 174.4 } },
    conventionalNTOpenings: { x: 478.6, y: 210.4 }
  },
  majorOpening: {
    minLength1st2nd: { four: { x: 381.2, y: 264.8 }, five: { x: 403.2, y: 264.8 } },
    minLength3rd4th: { four: { x: 381.2, y: 276.8 }, five: { x: 403.2, y: 276.8 } },
    doubleRaise: { force: { x: 358.4, y: 300.8 }, inv: { x: 380.6, y: 300.8 }, weak: { x: 410.2, y: 300.8 } },
    afterOvercall: { force: { x: 362.8, y: 312.8 }, inv: { x: 385.1, y: 312.8 }, weak: { x: 414.6, y: 312.8 } },
    convRaise: { twoNT: { x: 351.7, y: 324.8 }, threeNT: { x: 376.9, y: 324.8 }, splinter: { x: 413.5, y: 324.8 } },
    other: { x: 315.9, y: 336.8 },
    oneNT: { forcing: { x: 335.5, y: 348.8 }, semiForcing: { x: 393.9, y: 348.8 } },
    twoNTForcing: { x: 335.3, y: 360.8 },
    twoNTInvRange: { from: { x: 369.8, y: 360.8 }, to: { x: 399.4, y: 360.8 } },
    threeNTRange: { from: { x: 320.2, y: 372.8 }, to: { x: 354.4, y: 372.8 } },
    drury: { reverse: { x: 350.8, y: 384.8 }, twoWay: { x: 384.0, y: 384.8 }, fit: { x: 403.5, y: 384.8 } }
  },
  minorOpening: {
    minLength1st2nd: { four: { x: 512.4, y: 264.1 }, three: { x: 525.4, y: 264.1 }, zeroToTwoConv: { x: 538.4, y: 264.1 } },
    minLength3rd4th: { four: { x: 512.4, y: 276.1 }, three: { x: 525.4, y: 276.1 }, zeroToTwoConv: { x: 538.4, y: 276.1 } },
    doubleRaise: { force: { x: 498.8, y: 300.4 }, inv: { x: 524.6, y: 300.4 }, weak: { x: 554.9, y: 300.4 } },
    afterOvercall: { force: { x: 505.1, y: 312.4 }, inv: { x: 530.8, y: 312.4 }, weak: { x: 561.1, y: 312.4 } },
    forcingRaiseJS: { x: 552.3, y: 324.4 },
    singleRaiseOther: { x: 511.0, y: 336.4 },
    bypass4Diamond: { x: 518.5, y: 348.1 },
    oneNTOneClubRange: { from: { x: 468.0, y: 360.4 }, to: { x: 516.4, y: 360.4 } },
    twoNTForcing: { x: 476.4, y: 372.4 },
    twoNTInvRange: { from: { x: 515.1, y: 372.4 }, to: { x: 544.7, y: 372.4 } },
    threeNTRange: { from: { x: 458.1, y: 384.4 }, to: { x: 497.1, y: 384.4 } }
  },
  twoLevelDescribe: {
    twoClubRange: { from: { x: 319.4, y: 423.0 }, to: { x: 350.6, y: 423.0 } },
    twoClubStyle: { strong: { x: 338.4, y: 435.5 }, other: { x: 373.8, y: 435.5 } },
    twoClubResponses: { x: 313.9, y: 405.3 },
    twoDiamondResp: { neg: { x: 357.3, y: 445.9 }, waiting: { x: 401.6, y: 445.9 } },
    twoDiamondRange: { from: { x: 317.6, y: 460.5 }, to: { x: 348.7, y: 460.5 } },
    twoDiamondStyle: { weak: { x: 339.0, y: 472.6 }, intermediate: { x: 387.6, y: 472.6 }, strong: { x: 420.8, y: 472.6 }, conv: { x: 452.3, y: 472.6 } },
    twoDiamondRebids: { twoNTForce: { x: 506.2, y: 472.6 }, newSuitNF: { x: 558.4, y: 472.6 } },
    twoHeartRange: { from: { x: 319.4, y: 485.9 }, to: { x: 350.6, y: 485.9 } },
    twoHeartStyle: { weak: { x: 339.0, y: 498.0 }, intermediate: { x: 387.6, y: 498.0 }, strong: { x: 420.8, y: 498.0 }, conv: { x: 452.3, y: 498.0 } },
    twoHeartRebids: { twoNTForce: { x: 506.2, y: 498.0 }, newSuitNF: { x: 558.4, y: 498.0 } },
    twoSpadeRange: { from: { x: 319.4, y: 511.3 }, to: { x: 350.6, y: 511.3 } },
    twoSpadeStyle: { weak: { x: 339.0, y: 524.9 }, intermediate: { x: 387.6, y: 524.9 }, strong: { x: 420.8, y: 524.9 }, conv: { x: 452.3, y: 524.9 } },
    twoSpadeRebids: { twoNTForce: { x: 506.2, y: 524.9 }, newSuitNF: { x: 558.4, y: 524.9 } },
    newMinorForcing: { nmf: { x: 459.8, y: 539.3 }, twoWayNMF: { x: 515.4, y: 539.3 } },
    weakJumpShifts: { inComp: { x: 387.9, y: 551.3 }, notInComp: { x: 450.1, y: 551.3 } },
    fourthSuitForcing: { oneRound: { x: 367.0, y: 563.3 }, game: { x: 396.9, y: 563.3 } }
  }
};
