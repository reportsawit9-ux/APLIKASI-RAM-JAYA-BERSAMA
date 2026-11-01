# Implementation Plan: Mobile Responsive Navigation

## Overview
We will optimize the navigation for mobile users by implementing a standard "hamburger menu" pattern.

## Proposed Changes
1. **App.tsx**
   - Remove the separate mobile header bar (`lg:hidden` div).
   - Pass `setIsMobileMenuOpen(true)` as an `onMenuClick` prop to the `Navbar` component.
2. **Navbar.tsx**
   - Receive the new `onMenuClick` prop.
   - Add a hamburger button (`Menu` icon from `lucide-react`) at the start of the navbar, hidden on large screens (`lg:hidden`).
   - Retain the desktop layout as requested.

## Design
- Desktop/Tablet: Unchanged.
- Mobile:
  - Header: Hamburger icon in the top-left of the Navbar.
  - Sidebar: Slide-out drawer triggered by the hamburger icon.
  - Bottom Navigation: Retained for quick access.
