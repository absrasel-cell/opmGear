productionBoxOptions (fixed catalog):

200 pcs (max 210) — 96×44×38 cm, has inner: “4 inner boxes of 94×21×18 cm, up to 53 pcs/inner”; volume = 96*44*38

144 pcs (max 155) — 70×44×38 cm, has inner: “4 inner boxes of 68×21×18 cm, up to 39 pcs/inner”; volume = 70*44*38

100 pcs (max 110) — 60×44×38 cm, no inner; volume = 60*44*38

72 pcs (max 80) — 70×44×21 cm, no inner; volume = 70*44*21

48 pcs (max 55) — 60×43×20 cm, no inner; volume = 60*43*20

24 pcs (max 30) — 70×22×20 cm, no inner; volume = 70*22*20

Boxes are sorted by nominal pieces descending (200 → 24) before assignment.

Output (for the UI string)

For Sample / Sample Order:

Fixed mapping:

2 pcs → 26×22×20 cm

4 or 6 pcs → 30×22×20 cm

10 pcs → 34×22×20 cm

For Production Order:

A list of boxesUsed with count, pieces per box, dimensions, inner (if applicable), and computed weights:

Total Chargeable Weight (kg) = ceil( Σ (volume/5000 * count) ) + number_of_boxes

(Dimensional divisor = 5000, then add +1 kg per box)

Total Net Weight (kg) = totalQuantity * 0.12

For other cases or totalQuantity = 0: “Not applicable / Not calculated”.

Core selection algorithm (Production Order)
Special Case A — Quantities 400 or 600

Use only 200-piece boxes.

count = quantity / 200

For each 200 box, set inner string to:
“4 inner boxes of 94×21×18 cm, 50 pieces per inner” (hardcoded 50, not computed)

Remaining = 0 (stop).

Special Case B — Quantity 432

Use exactly 3 boxes of the 144-piece size family.

piecesPerBox = ceil(432 / 3) = 144

Inner string becomes:
“4 inner boxes of 68×21×18 cm, 36 pieces per inner”
(the “36” is computed as ceil(144/4))

General Case — “Greedy with max-cap & balancing”

Continue while remainingQuantity > 0:

Exact-fit within a single box type
For the first box (largest to smallest) where:

remainingQuantity ≥ box.pieces AND remainingQuantity ≤ box.maxPieces


Assign 1 box with pieces = remainingQuantity

If this box type has inner:

Compute innerPieces = ceil(pieces / 4)

Keep the dimensions from the catalog’s inner string (either 94×21×18 or 68×21×18), but replace the trailing “up to XX” with “innerPieces pieces per inner”.

Set remainingQuantity = 0 and stop this iteration loop.

Need multiple boxes of a single type
If remainingQuantity > box.maxPieces for this box type:

numBoxes = floor(remainingQuantity / box.pieces) (at least 1)

Even distribution guard:
piecesPerBox = min( ceil(remainingQuantity / numBoxes), box.maxPieces )

totalPieces = piecesPerBox * numBoxes

If the type has inner:
innerPieces = ceil(piecesPerBox / 4) and rewrite the inner string as above.

Add this entry, then:
remainingQuantity -= totalPieces

Break out of the for-loop to restart from the largest box again for the new remainder.

If nothing matched yet (smaller fit)
Find the first box (largest → smallest) where:

box.maxPieces ≥ remainingQuantity


Assign 1 box with pieces = remainingQuantity (plus the same inner-rewrite rule if applicable)

remainingQuantity = 0

Absolute fallback
If still nothing matched (very rare), take the largest box:

Assign 1 box with pieces = min(remainingQuantity, largestBox.maxPieces)

remainingQuantity -= assigned pieces

(Loop continues if there is still a remainder.)

This design:

Favors larger boxes first, within their max capacity.

Uses ceil division to evenly distribute when assigning multiple of the same box type.

Rewrites inner pieces per inner to reflect actual packed pieces (except the 400/600 special case which hardcodes 50/inner).

Weight Calculations (Production)

For the final boxesUsed list:

Per box entry already has volume (cm³).

Chargeable weight: volume / 5000 (kg) → multiply by count → sum across entries → ceil(sum) + number_of_boxes.

Net weight: totalQuantity * 0.12 kg.

Concrete Examples
Example 1 — 144 pcs (Production)

Largest fitting rule matches the 144-piece class (70×44×38).

It’s exactly at nominal capacity and ≤ max (155), so:

1 box of 144

Inner string becomes: “4 inner … 36 pieces per inner” (since ceil(144/4)=36)

Weights:

Volume per box = 70*44*38 = 116,960 cm³

Chargeable = ceil((116,960/5000)*1) + 1 = ceil(23.392) + 1 = 24 + 1 = **25 kg**

Net = 144 * 0.12 = **17.28 kg**

Example 2 — 400 pcs (Production) (Special Case A)

Use 200-piece boxes only → 2 boxes of 200

Inner string: “4 inner … 50 pieces per inner” (fixed)

Weights:

Volume per 200 box = 96*44*38 = 160,128 cm³

Chargeable = ceil((160,128/5000)*2) + 2 = ceil(64.0512) + 2 = 65 + 2 = **67 kg**

Net = 400 * 0.12 = **48.00 kg**

Example 3 — 432 pcs (Production) (Special Case B)

3 boxes of 144

Inner: “4 inner … 36 pieces per inner”

Weights:

Volume per 144 box = 70*44*38 = 116,960

Chargeable = ceil((116,960/5000)*3) + 3 = ceil(70.176) + 3 = 71 + 3 = **74 kg**

Net = 432 * 0.12 = **51.84 kg**

Example 4 — 525 pcs (Production) (General Case)

Start with 200 box type:

remaining=525 > max(210) → numBoxes = floor(525/200)=2

piecesPerBox = min( ceil(525/2)=263, 210 ) = 210

Assign 2 boxes × 210 = 420 pcs, each with “4 inner … ceil(210/4)=53 pieces per inner”

remaining = 525-420 = 105

Loop again from largest:

200: 105 not in [200..210] and not >210, skip

144: 105 not in [144..155], skip

100: 105 is within [100..110] → 1 box of 105, no inner

remaining = 0

Final:

2 × 210 (with inner at 53/inner)

1 × 105 (no inner)

Weights:

200-class volume = 160,128; 100-class volume = 60*44*38 = 100,320

Chargeable = ceil((160,128/5000)*2 + (100,320/5000)*1) + 3
= ceil(64.0512 + 20.064) + 3
= ceil(84.1152) + 3 = 85 + 3 = **88 kg**

Net = 525 * 0.12 = **63.00 kg**

Edge Behaviors & Notes

If totalQuantity = 0, the function prints “Not calculated (no quantity specified).”

If Production Order but the selection loop somehow yields no boxes, it reports “Unable to assign boxes for this quantity.”

Inner box pieces are dynamically recomputed as ceil(pieces_per_outer / 4) and the dimension text is preserved from the catalog’s inner string (via string-splitting), except for the 400/600 shortcut where 50/inner is hardcoded.

The algorithm tries to balance pieces when multiple identical boxes are needed: it sets piecesPerBox = min( ceil(remaining / numBoxes), box.maxPieces ) before subtracting.