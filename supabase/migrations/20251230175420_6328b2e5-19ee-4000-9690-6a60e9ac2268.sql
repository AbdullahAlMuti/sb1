-- Enable realtime for plans table
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;

-- Ensure full row data is captured for updates
ALTER TABLE public.plans REPLICA IDENTITY FULL;