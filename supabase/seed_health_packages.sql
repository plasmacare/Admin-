-- Run this once in the Supabase SQL editor.
-- Adds the 8 health packages (Full Body, Senior Citizen, Women, Men,
-- Child, Arthritis, Cancer, Heart) as real bookable packages, the same
-- way Lipid Profile / Stool Routine etc. already work. Prices below are
-- placeholders — edit them anytime from Admin → Catalog → Packages.

insert into packages (name, description, price, is_active)
select v.name, v.description, v.price, true
from (values
  ('Full Body Package', 'Comprehensive full-body health checkup', 1499),
  ('Senior Citizen Package', 'Checkup tailored for senior citizens', 1799),
  ('Women Package', 'Health checkup tailored for women', 1299),
  ('Men Package', 'Health checkup tailored for men', 1299),
  ('Child Package', 'Health checkup for children', 999),
  ('Arthritis Package', 'Joint and bone health screening', 1199),
  ('Cancer Package', 'Cancer risk screening panel', 2499),
  ('Heart Package', 'Cardiac health screening panel', 1599)
) as v(name, description, price)
where not exists (
  select 1 from packages p where p.name = v.name
);
