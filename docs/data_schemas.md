# Data Schemas

Aurora's data integrity is built on a clean relational mapping between hardware identification strings and user identity, managed entirely by PostgreSQL inside Supabase.

## Primary Ingestion Schema

The central hub for all historical telemetry is the `energy_readings` table. However, edge devices (the smart meters) do not have granular user-identity context; they only know their hardcoded `meter_id`.

To resolve this safely, the system utilizes the `profiles` table to maintain spatial associations:
1. A user inputs their `meter_number` in the application setting.
2. The Node.js MQTT bridge intercepts raw data payloads.
3. The bridge executes a `SELECT id FROM profiles WHERE meter_number = payload.meter_id`.
4. It calls the `insert_energy_reading_improved` RPC using the mapped `User UUID`, granting seamless Row Level Security coverage.

## Privacy & Isolation via RLS

User data isolation is enforced statically by Supabase's Row Level Security (RLS) policies. By mapping hardware telemetry indirectly through the bridge, we ensure that a malicious actor acquiring a copy of the front-end application cannot read, alter, or deduce metrics belonging to any other `meter_id`, since the database explicitly blocks selection without the correct accompanying JSON Web Token corresponding to that user profile UUID.
