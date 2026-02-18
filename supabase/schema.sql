-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table profiles (
  id uuid references auth.users not null primary key,
  role text check (role in ('client', 'artist', 'admin')) default 'client',
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- ACTS TABLE
create table acts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  category text not null, -- e.g., 'Musicians', 'Circus', 'DJs'
  price_range text, -- e.g., '$500 - $1000'
  video_url text,
  image_url text,
  description text,
  specs text, -- Technical rider info
  owner_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table acts enable row level security;

create policy "Acts are viewable by everyone."
  on acts for select
  using ( true );

create policy "Artists can insert their own acts."
  on acts for insert
  with check ( auth.uid() = owner_id );

create policy "Artists can update their own acts."
  on acts for update
  using ( auth.uid() = owner_id );

-- BOOKINGS TABLE
create table bookings (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id) not null,
  act_id uuid references acts(id) not null,
  status text check (status in ('pending', 'confirmed', 'completed', 'cancelled')) default 'pending',
  event_date date,
  location text,
  duration text,
  quote_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table bookings enable row level security;

create policy "Users can view their own bookings."
  on bookings for select
  using ( auth.uid() = client_id );

create policy "Users can create bookings."
  on bookings for insert
  with check ( auth.uid() = client_id );

-- REVIEWS TABLE
create table reviews (
  id uuid default uuid_generate_v4() primary key,
  booking_id uuid references bookings(id) not null,
  reviewer_id uuid references profiles(id) not null,
  act_id uuid references acts(id) not null,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table reviews enable row level security;

create policy "Reviews are viewable by everyone."
  on reviews for select
  using ( true );

create policy "Users can create reviews for their bookings."
  on reviews for insert
  with check ( auth.uid() = reviewer_id );
