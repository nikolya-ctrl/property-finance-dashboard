alter extension btree_gist set schema extensions;

insert into public.channels (name, color, default_commission_pct, payout_delay_days, sort_order) values
  ('Booking.com', '#3B82F6', 15, 5, 1),
  ('Airbnb',      '#F43F5E', 3,  1, 2),
  ('Agoda',       '#F59E0B', 17, 30, 3),
  ('Direct',      '#10B981', 0,  0, 4),
  ('TripAdvisor', '#14B8A6', 12, 14, 5),
  ('Other',       '#64748B', 0,  0, 6);

insert into public.expense_categories (name, sort_order) values
  ('Cleaning & laundry', 1), ('Staff salaries', 2), ('Electricity', 3), ('Water', 4),
  ('Internet', 5), ('Gas', 6), ('Rent / lease', 7), ('Repairs & maintenance', 8),
  ('Furniture & supplies', 9), ('Toiletries', 10), ('Platform / subscription fees', 11), ('Other', 12);
