# Aurora Energy Platform

![Aurora Energy](public/og-image.png)

**Aurora Energy** is an enterprise-grade, AI-powered energy management and optimization platform. Designed for scalability and resilience, it provides real-time energy monitoring, predictive analytics, and automated billing features suitable for residential and commercial deployments across Kenya and beyond.

## 🚀 Key Capabilities

- **Real-Time IoT Data Ingestion:** High-speed MQTT integration supporting thousands of concurrent ESP8266/ESP32 smart meter nodes with microsecond precision.
- **AI-Driven Forecasting:** Machine learning models predict usage patterns to optimize grid load and reduce energy expenditures.
- **Enterprise Dashboard:** Built with React, Three.js, and Framer Motion for a Fortune 500-level data visualization experience.
- **Universal Accessibility:** Fully functional SMS and USSD integrations ensuring access for users without smart devices.
- **Security & Compliance:** SOC 2 Type II compliant architecture, ISO 27001 data protection standards, and strict role-based access control (RBAC).

## 🏗️ Architecture

The platform is designed with a modern decoupled architecture:

- **Frontend:** React, TypeScript, Vite, TailwindCSS, `three.js` (3D visualizations)
- **Backend/Data Layer:** Supabase (PostgreSQL, Edge Functions, Real-time APIs)
- **IoT Messaging:** Scalable MQTT broker handling telemetry data (Voltage, Current, Power)
- **Deployment:** Vercel (Frontend), Supabase Cloud (Backend)

For deeper architectural details, hardware integration schemas, and data dictionary documentation, please refer to the `docs/` internal directory or navigate to the live documentation portal at `/docs/architecture`.

## ⚙️ Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/aurora-energy/aurora-energy-flow.git
   cd aurora-energy-flow
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy `.env.example` to `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📚 Documentation & Legal

- **API Documentation**: Available at `/docs/api`
- **Data Schemas**: Available at `/docs/schemas`
- **Hardware Integration**: Available at `/docs/hardware`
- **SLA & Uptime**: Available at `/sla`
- **Security Whitepaper**: Available at `/whitepaper`
- **Privacy & Compliance**: Available at `/privacy` and `/compliance`

## ⚠️ Legacy Simulator

The `simulator`, `smart-meter`, and `proxy-deployment` directories contain legacy testing infrastructure from early prototyping phases. For modern development, we recommend using the new live MQTT integration layer.

## 📜 License

This project is proprietary and confidential. Unauthorized copying of files via any medium is strictly prohibited.
