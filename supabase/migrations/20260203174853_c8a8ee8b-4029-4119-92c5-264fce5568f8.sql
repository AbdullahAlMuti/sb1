-- Trial plan: enforce default max_listings = 10 (admin override may exceed)
update public.plans
set max_listings = 10,
    updated_at = now()
where name = 'Trial';

-- Pricing UI helper: ensure Trial features include "Up to 10 Listings" (no duplicates)
update public.plans
set features = (
  case
    when jsonb_typeof(features) = 'array' then
      case
        when exists (
          select 1
          from jsonb_array_elements_text(features) as f
          where f = 'Up to 10 Listings'
        ) then features
        else features || to_jsonb('Up to 10 Listings'::text)
      end
    else to_jsonb(array['Up to 10 Listings']::text[])
  end
),
updated_at = now()
where name = 'Trial';