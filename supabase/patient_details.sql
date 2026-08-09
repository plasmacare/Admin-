-- Run this once in the Supabase SQL editor.
-- Adds patient detail fields, collected right after OTP verification
-- (the patient being tested may be a family member, not the person
-- who booked — so these are kept separate from customer_name/customer_phone).

alter table bookings
  add column if not exists patient_name text,
  add column if not exists patient_age integer,
  add column if not exists patient_gender text,
  add column if not exists patient_blood_group text;

-- patient_gender: male | female | other
-- patient_blood_group: A+ | A- | B+ | B- | AB+ | AB- | O+ | O- | unknown
