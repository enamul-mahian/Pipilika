-- Owner's cake price list (2026-10-21): 250 g = 400 taka, +300 taka for every extra 250 g, for every flavour.
UPDATE "CakeBasePrice" SET "price" = 400 + 300 * ("grams" / 250 - 1) WHERE "grams" % 250 = 0;
