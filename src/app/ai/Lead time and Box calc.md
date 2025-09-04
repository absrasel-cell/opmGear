📋 Prompt: Lead Time + Box Calculation

Task: Given order details, calculate lead time (days + delivery date) and box packaging plan.

Inputs:

leadTimeStr (e.g. ": 1 week (Blank), 2 weeks (Decorated)")

logoSetup ("Blank", "TwoLogo", "ThreeLogo", "FourLogo", etc.)

deliveryType ("Regular", "Priority", or "Pick a Date")

totalQuantity (int)

lines (optional breakdown by color/size, with quantities)

accessoriesSelections (array)

capSetupSelections (array)

piecesPerBox (default 48)

todayDate (ISO)

Lead Time Rules:

Parse base from leadTimeStr: Blank = n7 days, Decorated = m7 days. If missing → 7 days each.

If logoSetup = "Blank" use Blank base, else use Decorated.

Add days:

TwoLogo/ThreeLogo → +1

FourLogo → +2

Delivery adders:

Blank: Regular +8, Priority +4

Decorated: Regular +5, Priority +3

Quantity: floor(totalQuantity/1000)*2

Colors: floor(lines.length / 2)

Accessories+CapSetup: floor((A+S)/2)

Total lead time = sum of all above.

Delivery date = today + totalLeadTime (calendar days).

If Pick a Date: use chosen date, set days = diff, map to nearest Regular (15) or Priority (11).

Box Rules (Production Orders):

Box options (pieces, max, dims, inner, volume):

200 (max 210), 96×44×38, 4×(94×21×18), vol=160,128

144 (max 155), 70×44×38, 4×(68×21×18), vol=116,960

100 (max 110), 60×44×38, vol=100,320

72 (max 80), 70×44×21, vol=64,680

48 (max 55), 60×43×20, vol=51,600

24 (max 30), 70×22×20, vol=30,800

Special cases:

400 or 600 → only 200-piece boxes (inner = 50/inner).

432 → 3×144 boxes (36/inner).

General case:

Sort boxes largest → smallest.

If remaining qty fits (≥pieces and ≤max): assign 1 box of that size.

If >max: assign multiple of that type; distribute evenly (ceil(remaining/numBoxes), ≤max).

If still unmatched: assign 1 box of smallest possible that fits.

Fallback: use largest box with min(remaining,max).

Weights:

Net weight = totalQuantity * 0.12 kg.

Chargeable weight = ceil(Σ(volume/5000 * count)) + boxCount.

Outputs:

Return JSON:

{
  "leadTime": {
    "totalDays": 15,
    "deliveryDate": "2025-09-17",
    "details": ["Base: 7 days", "Regular (Blank): +8 days"]
  },
  "boxes": {
    "lines": [
      {"label": "Black", "count": 2, "pieces": 72, "dimensions": "70x44x21"}
    ],
    "totalBoxes": 4,
    "netWeightKg": 17.3,
    "chargeableWeightKg": 25
  }
}