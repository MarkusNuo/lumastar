-- Due cards count only while a lesson exercise practises their item (PRD F8), looked up per card by item.
CREATE INDEX exercises_item_ids_idx ON exercises USING gin (item_ids);
