CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'super_admin'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: amazon_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.amazon_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text,
    client_secret text,
    refresh_token text,
    marketplace text DEFAULT 'US'::text,
    update_frequency_hours integer DEFAULT 24,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sync_at timestamp with time zone
);

ALTER TABLE ONLY public.amazon_settings FORCE ROW LEVEL SECURITY;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auto_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid,
    order_id text,
    status text DEFAULT 'pending'::text,
    profit numeric(10,2),
    order_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: best_selling_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.best_selling_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    image_url text,
    price numeric DEFAULT 0 NOT NULL,
    sales_count integer DEFAULT 0 NOT NULL,
    country text DEFAULT 'US'::text NOT NULL,
    ebay_url text,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text DEFAULT 'percentage'::text NOT NULL,
    discount_value numeric DEFAULT 0 NOT NULL,
    min_order_amount numeric,
    max_discount_amount numeric,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    is_one_time_per_user boolean DEFAULT true NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    applicable_plans text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid,
    alert_type text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'UNREAD'::text
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text,
    description text,
    price numeric(10,2),
    asin text,
    sku text,
    category text,
    status text DEFAULT 'active'::text,
    amazon_data jsonb DEFAULT '{}'::jsonb,
    ebay_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: must_sell_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.must_sell_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    image_url text,
    price numeric DEFAULT 0 NOT NULL,
    profit numeric DEFAULT 0 NOT NULL,
    sales_count integer DEFAULT 0 NOT NULL,
    total_sold integer DEFAULT 0 NOT NULL,
    country text DEFAULT 'US'::text NOT NULL,
    category text,
    ebay_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text,
    is_active boolean DEFAULT true,
    starts_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    content text,
    priority integer DEFAULT 0,
    target_audience text DEFAULT 'all'::text,
    created_by uuid
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_notifications_enabled boolean DEFAULT true,
    notify_out_of_stock boolean DEFAULT true,
    notify_low_stock boolean DEFAULT true,
    notify_price_increase boolean DEFAULT true,
    notify_price_decrease boolean DEFAULT true,
    price_change_threshold integer DEFAULT 10,
    notification_email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text,
    price_monthly numeric(10,2),
    price_yearly numeric(10,2),
    features jsonb DEFAULT '[]'::jsonb,
    stripe_price_id_monthly text,
    stripe_price_id_yearly text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    max_listings integer DEFAULT 0,
    max_auto_orders integer DEFAULT 0,
    credits_per_month integer DEFAULT 0
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    credits integer DEFAULT 0,
    is_active boolean DEFAULT true,
    plan_id text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone
);


--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    prompt_type text NOT NULL,
    is_default boolean DEFAULT false,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid,
    status text DEFAULT 'active'::text,
    stripe_subscription_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: amazon_settings amazon_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.amazon_settings
    ADD CONSTRAINT amazon_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auto_orders auto_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_orders
    ADD CONSTRAINT auto_orders_pkey PRIMARY KEY (id);


--
-- Name: best_selling_items best_selling_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.best_selling_items
    ADD CONSTRAINT best_selling_items_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: inventory_alerts inventory_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_alerts
    ADD CONSTRAINT inventory_alerts_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: must_sell_items must_sell_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.must_sell_items
    ADD CONSTRAINT must_sell_items_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_plans user_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: auto_orders auto_orders_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_orders
    ADD CONSTRAINT auto_orders_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: auto_orders auto_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_orders
    ADD CONSTRAINT auto_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: best_selling_items best_selling_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.best_selling_items
    ADD CONSTRAINT best_selling_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: coupons coupons_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: inventory_alerts inventory_alerts_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_alerts
    ADD CONSTRAINT inventory_alerts_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: inventory_alerts inventory_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_alerts
    ADD CONSTRAINT inventory_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: listings listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notices notices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompts prompts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: usage_logs usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_plans user_plans_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: user_plans user_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_plans
    ADD CONSTRAINT user_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notices Active notices are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active notices are viewable" ON public.notices FOR SELECT USING ((is_active = true));


--
-- Name: audit_logs Admins can manage audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage audit logs" ON public.audit_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: best_selling_items Admins can manage best selling items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage best selling items" ON public.best_selling_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins can manage coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage coupons" ON public.coupons USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: must_sell_items Admins can manage must sell items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage must sell items" ON public.must_sell_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notices Admins can manage notices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage notices" ON public.notices USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.admin_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_plans Admins can manage user plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user plans" ON public.user_plans USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usage_logs Admins can view all usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all usage logs" ON public.usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usage_logs Authenticated users can insert own usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert own usage logs" ON public.usage_logs FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id IS NULL) OR (auth.uid() = user_id))));


--
-- Name: best_selling_items Everyone can view active best selling items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active best selling items" ON public.best_selling_items FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: coupons Everyone can view active coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active coupons" ON public.coupons FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: must_sell_items Everyone can view active must sell items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active must sell items" ON public.must_sell_items FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: amazon_settings Only admins can delete amazon settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete amazon settings" ON public.amazon_settings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: amazon_settings Only admins can insert amazon settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert amazon settings" ON public.amazon_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: amazon_settings Only admins can update amazon settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update amazon settings" ON public.amazon_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: amazon_settings Only admins can view amazon settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view amazon settings" ON public.amazon_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plans Plans are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);


--
-- Name: listings Users can delete own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: listings Users can insert own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: auto_orders Users can insert own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own orders" ON public.auto_orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_settings Users can insert own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own settings" ON public.notification_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: prompts Users can manage own prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own prompts" ON public.prompts USING ((auth.uid() = user_id));


--
-- Name: inventory_alerts Users can update own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own alerts" ON public.inventory_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: listings Users can update own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: auto_orders Users can update own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own orders" ON public.auto_orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: notification_settings Users can update own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own settings" ON public.notification_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: inventory_alerts Users can view own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own alerts" ON public.inventory_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: listings Users can view own listings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own listings" ON public.listings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: prompts Users can view own or default prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own or default prompts" ON public.prompts FOR SELECT USING (((user_id IS NULL) OR (auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: auto_orders Users can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders" ON public.auto_orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_plans Users can view own plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plans" ON public.user_plans FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_settings Users can view own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own settings" ON public.notification_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_logs Users can view own usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage logs" ON public.usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_settings Users can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view settings" ON public.admin_settings FOR SELECT USING (true);


--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: amazon_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.amazon_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auto_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auto_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: best_selling_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.best_selling_items ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

--
-- Name: must_sell_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.must_sell_items ENABLE ROW LEVEL SECURITY;

--
-- Name: notices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;