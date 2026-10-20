# MSR Cafe - Artisanal Coffee & Neighborhood Bistro

MSR Cafe is a warm, welcoming, modern neighborhood cafe storefront and admin tracking system built with a vanilla HTML5/JS/CSS stack, styled using Tailwind CSS, and connected to a live Supabase client.

---

## 🎨 Vibe & Design Aesthetics
- **Color Palette:** Warm espresso brown (`#2C1A14`), rich warm cream/beige (`#FDFBF7`), and subtle amber/gold accents (`#D97706`).
- **Typography:** Elegant serif headings (*Playfair Display*) paired with clean, readable sans-serif body copy (*Plus Jakarta Sans*).
- **Responsive Layout:** Adaptive grids, sliding side drawers, and responsive menus optimized for mobile, tablet, and desktop viewports.

---

## 🚀 Key Features

### 1. Storefront Experience (`index.html`)
- **Sticky Navigation Bar:** Seamless header with brand logo, steaming coffee icon animation, responsive section links, and an active shopping cart view button.
- **Asymmetric Hero Section:** Eye-catching photo grids showcasing cafe ambience, layered cold brews, and toasted paninis alongside dynamic call-to-action buttons.
- **Artisanal Category Menu:** Filterable menu with horizontal scrolling category tags, real-time query search, bestseller badges, and item variants customization sheets (options for sizing, flavors, and oat/soy milk add-ons).
- **Checkout Cart Drawer:** Slide-over cart tracker displaying order items, subtotal, 5% GST calculation, order-type toggles (Dine-In, Takeaway, Delivery), contact form inputs, and checkout submission.
- **Table Reservation Form:** Booking selector capturing Name, WhatsApp number, Date picker, Time slot (Morning, Afternoon, Evening), Guest counts, Seating preferences (Cozy Indoor, Outdoor Terrace, Window Side), and custom request notes.

### 2. Live Supabase Connection & Offline Fallback (`lib/supabase.js`)
- **Supabase JS Client:** Initializes client querying of live backend tables (`orders` and `reservations`).
- **Offline Mock DB Fallback:** Automatic Local Storage database interceptor. If credentials remain at default placeholders, the queries are redirected to browser local storage with simulated network latency to facilitate offline development and sandbox testing.
- **Robust Error Handling:** Submission handlers parse response objects, log the complete Supabase error code to the console, and display detailed user alerts with the exact database response text.

### 3. Order & Reservation Modals
- **Order Confirmed Overlay:** Success checkout modal displaying unique Order ID (`#MSR-XXXX`), customer name, order type, location/table number, estimated prep time (20-30 mins), and itemized invoice details.
- **Reservation Confirmed Overlay:** Table booking receipt showing booking reference (`MSR-RES-XXXXX`), date, slot details, seating selection, special requests, and the Gole Market address.

### 4. Admin backoffice Console (`#admin` Hash Routing)
- Combined into the storefront using React URL hash listeners (`http://localhost:8000/#admin`).
- Protected by a passcode locks screen requesting the PIN (`1234`).
- Displays live statistics counters (Total Orders, Active Orders, Revenue, Table Bookings) alongside tracker tabs:
  - **Orders Tracker:** Lists incoming customer orders sorted by time. Includes quick transition pills to update order status (`Pending` ➔ `Preparing` ➔ `Completed` ➔ `Cancelled`) on the database.
  - **Table Reservations:** Tabulates reservations listing date, slot, guests count, preference, and notes.

### 5. Standalone Dark Admin Dashboard (`orders.html`)
- A standalone, dark-themed dashboard utility querying the database directly on load.
- Automatically connects to the Postgrest endpoint to render active cards for recent storefront orders and table bookings.

---

## 📂 File Structure

```text
msr-cafe-website/
├── index.html          # Main Storefront containing components and admin router views
├── orders.html         # Standalone Admin Dashboard (Dark Theme console)
├── lib/
│   └── supabase.js     # Supabase client configurations and mock database polyfill
├── assets/             # Locally stored high-quality cafe asset images
└── README.md           # Project Documentation
```

---

## 💾 Database Schema Setup (SQL DDL)

To configure the live backend database, run the following DDL statements inside your Supabase Dashboard **SQL Editor**:

```sql
-- 1. Create public orders table
create table public.orders (
    id text primary key, -- Shortened ID (e.g., #MSR-4819)
    customer_name text not null,
    customer_phone text not null,
    order_type text not null check (order_type in ('Dine-In', 'Takeaway', 'Delivery')),
    address_or_table text,
    order_items jsonb not null,
    total_amount numeric not null,
    status text not null default 'Pending' check (status in ('Pending', 'Preparing', 'Completed', 'Cancelled')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create public reservations table
create table public.reservations (
    id text primary key, -- Booking ID (e.g., MSR-RES-10839)
    customer_name text not null,
    customer_phone text not null,
    reservation_date date not null,
    time_slot text not null,
    guests_count integer not null, -- Expected integer value
    seating_preference text not null,
    special_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS (Row Level Security)
alter table public.orders enable row level security;
alter table public.reservations enable row level security;

-- 4. Set Policies for Storefront Inserts
create policy "Allow anonymous inserts to orders" on public.orders for insert with check (true);
create policy "Allow anonymous inserts to reservations" on public.reservations for insert with check (true);

-- 5. Set Policies for Admin Readings & Updates
create policy "Allow select access to orders for admin" on public.orders for select using (true);
create policy "Allow select access to reservations for admin" on public.reservations for select using (true);
create policy "Allow update access to orders for admin" on public.orders for update using (true);
```

---

## 🚀 How to Run Locally

1. Open a terminal in the project directory:
   ```bash
   cd "c:\Users\msres\OneDrive\Documents\my websites\web 1"
   ```
2. Launch a local web server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to:
   - **Cafe Storefront:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   - **Admin Portal:** [http://127.0.0.1:8000/#admin](http://127.0.0.1:8000/#admin) (Passcode: `1234`)
   - **Standalone Dashboard:** [http://127.0.0.1:8000/orders.html](http://127.0.0.1:8000/orders.html)
