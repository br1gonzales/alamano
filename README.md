# 🛵 Alamano — Restaurant Courier Dispatch & Delivery System

A logistics & courier dispatch app built for restaurants with **Expo (React Native)**, **TanStack Query (React Query)**, and **Supabase**.

Seamlessly integrated with the **Alacarta** restaurant ecosystem to allow any restaurant to schedule deliveries, enter pickup & dropoff addresses, calculate driving mileage and duration, select courier transport classes, and track deliveries in real time.

---

## 🚀 Key Features

- **Visual Road Route & Mileage Engine**:
  - Live turn-by-turn road route computation with **OSRM (Open Source Routing Machine)**.
  - Accurate mileage in both **Kilometers** and **Miles** (`kmToMiles`).
  - Travel time estimation according to city traffic and transport speed.
  - Interactive SVG map displaying pickup pin (Point A), delivery pin (Point B), and real-time courier movement.
  - Direct integration with Google Maps / OpenStreetMap navigation.

- **Dual Address Autocomplete & Presets**:
  - Rapid address geocoding via OpenStreetMap Nominatim.
  - Preset gastronomic hubs & districts in Lima (Miraflores, San Isidro, Barranco, Surco, San Borja) for one-tap order dispatch.

- **Multi-Class Courier Selector**:
  - **Moto Express**: Fast food delivery with thermal insulated bag (pizzas, burgers, hot dishes).
  - **Bicicleta Eco**: Zero-emission close-range courier (< 5 km).
  - **Auto / Utilitario**: Large catering platters and multi-box restaurant orders.

- **Order Scheduling (No Payment Gateway Needed)**:
  - Internal dispatch tool: "Enviar de inmediato" (Immediate call) vs "Programar horario" (Lunch / Dinner peak).
  - Customer contact details, apartment notes, and Alacarta order reference tracking (`order_reference_id`).

- **TanStack Query (React Query) Caching Architecture**:
  - Structured query keys (`deliveryKeys.list()`, `deliveryKeys.detail(id)`, `deliveryKeys.route(origin, dest)`).
  - Multi-tier cache strategy (`staleTime: 15s` for active orders, `10min` for road geometries).
  - Optimistic mutations for instant UI dispatch feedback.
  - Real-time Supabase Postgres change listener integrated directly with TanStack cache invalidation.

- **Alacarta Supabase Backend Integration**:
  - Tables: `couriers`, `deliveries`, `delivery_status_logs`, linked directly to `stores` from Alacarta.
  - Row Level Security (RLS) configured for secure restaurant operations.
  - Supabase Realtime enabled on all delivery tracking events.

---

## 🛠️ Tech Stack

- **Framework**: Expo SDK 57 / React Native 0.86
- **Language**: TypeScript (Strict mode)
- **State & Caching**: TanStack Query (`@tanstack/react-query` v5)
- **Backend / Realtime**: Supabase (`@supabase/supabase-js`)
- **Icons**: Lucide React Native (`lucide-react-native`)
- **Routing**: OSRM Driving Engine + OpenStreetMap Nominatim
- **Platform**: Web, Android, iOS

---

## 💻 Getting Started

```bash
# Clone the repository
git clone https://github.com/br1gonzales/alamano.git
cd alamano

# Install dependencies
npm install

# Run typecheck
npm run typecheck

# Start Expo development server
npm run web
# or
npm run android
# or
npm run ios
```

---

## 📦 Project Structure

```
alamano/
├── App.tsx                      # Root component with QueryClientProvider & Tab navigation
├── app.json                     # Expo configuration
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
└── src/
    ├── types/
    │   └── database.ts          # Courier, Delivery, RouteInfo TypeScript definitions
    ├── lib/
    │   └── supabase.ts          # Supabase client with clock-skew resilient retry
    ├── services/
    │   ├── routingService.ts    # OSRM road routing, mileage & Nominatim geocoding
    │   └── deliveryService.ts   # CRUD operations, status advancement & logs
    ├── hooks/
    │   └── useDeliveries.ts     # TanStack Query hooks, query keys & realtime sync
    └── components/
        ├── DeliveryRouteMap.tsx # Projected SVG map with road polyline & waypoints
        ├── AddressInputCard.tsx # Dual address inputs with connected pins & mileage badge
        ├── CourierSelectorCard.tsx # Moto / Bici / Auto selector & scheduler
        ├── NewDeliveryForm.tsx  # Dispatch screen connecting Alacarta stores
        ├── DeliveriesList.tsx   # Active deliveries and history list with status chips
        └── DeliveryTrackingModal.tsx # Live tracking timeline & courier simulation
```
