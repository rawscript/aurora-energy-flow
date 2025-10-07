# Solar Dashboard Restructure

This document explains the restructure of the solar provider dashboard functionality to separate real-time monitoring from payment information.

## Overview

The solar provider dashboard has been restructured to provide a better user experience by separating concerns:

1. **Dashboard Tab**: Shows real-time solar data (generation, battery status, consumption, etc.)
2. **Pay as You Go Tab**: Shows payment information (ownership progress, transactions, payment status, etc.)

## Components

### 1. SolarRealTimeDashboard Component

This new component displays real-time solar monitoring data:
- Battery charge status
- Solar power generation
- Number of batteries connected
- Load consumption
- Real-time charts for generation and battery levels
- System insights and analytics

### 2. PayAsYouGoDashboard Component

This component displays payment-related information:
- System ownership progress
- Payment status and due dates
- Transaction history
- Payment processing interface
- System information

### 3. EnergyDashboard Component

The main energy dashboard component has been updated to remove the solar provider check, as solar providers now use the new SolarRealTimeDashboard.

### 4. Index Page

The main application page has been updated to:
- Dynamically add a "Pay as You Go" tab when a solar provider is selected
- Show the appropriate dashboard component based on the selected provider
- Hide the tokens tab for solar providers since they now use the "Pay as You Go" tab

## How It Works

1. When a user selects a solar provider (Solar, SunCulture, M-KOPA Solar):
   - The Dashboard tab now shows real-time solar monitoring data
   - A new "Pay as You Go" tab appears for payment information
   - The tokens tab is hidden for solar providers

2. When a user selects a non-solar provider:
   - The Dashboard tab shows traditional energy monitoring data
   - The tokens tab is available for token management
   - No "Pay as You Go" tab is shown

## Benefits

1. **Better Organization**: Real-time monitoring and payment information are now logically separated
2. **Improved UX**: Users can focus on either monitoring or payment tasks without distraction
3. **Scalability**: The structure allows for future enhancements to either monitoring or payment features
4. **Consistency**: Non-solar providers maintain their existing interface

## Implementation Details

### Component Structure

```
Index.tsx
├── Dashboard Tab
│   ├── Solar Provider → SolarRealTimeDashboard
│   └── Non-Solar Provider → EnergyDashboard
├── Pay as You Go Tab (Solar Providers Only) → PayAsYouGoDashboard
├── Tokens Tab (Non-Solar Providers Only) → KPLCTokenDashboard
└── Other Tabs (Notifications, Insights, Calculator, etc.)
```

### File Structure

- `src/components/SolarRealTimeDashboard.tsx` - New component for real-time solar monitoring
- `src/components/PayAsYouGoDashboard.tsx` - Wrapper for payment information (uses existing SolarDashboard)
- `src/components/EnergyDashboard.tsx` - Updated to remove solar provider check
- `src/components/SolarDashboard.tsx` - Unchanged, still provides payment information
- `src/pages/Index.tsx` - Updated to manage tab structure dynamically

## Testing

To test the restructure:

1. Select a solar provider (Solar, SunCulture, or M-KOPA Solar)
2. Verify the Dashboard tab shows real-time solar data
3. Verify the "Pay as You Go" tab appears and shows payment information
4. Verify the tokens tab is hidden
5. Select a non-solar provider (KPLC, IPP, Other)
6. Verify the Dashboard tab shows traditional energy data
7. Verify the tokens tab is visible
8. Verify no "Pay as You Go" tab is shown

## Future Enhancements

This structure allows for future enhancements:
- Add more detailed analytics to the real-time dashboard
- Expand payment options in the Pay as You Go tab
- Add maintenance scheduling features
- Integrate with actual solar provider APIs