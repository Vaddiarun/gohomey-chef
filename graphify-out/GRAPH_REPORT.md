# Graph Report - d:/gohomey-chef  (2026-04-20)

## Corpus Check
- Corpus is ~42,330 words - fits in a single context window. You may not need a graph.

## Summary
- 88 nodes · 52 edges · 39 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Android Native Bridge|Android Native Bridge]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Babel Configuration|Babel Configuration]]
- [[_COMMUNITY_Android MainActivity|Android MainActivity]]
- [[_COMMUNITY_Chef Tip Component|Chef Tip Component]]
- [[_COMMUNITY_Registration Status|Registration Status]]
- [[_COMMUNITY_Event Listing Component|Event Listing Component]]
- [[_COMMUNITY_Order Management Component|Order Management Component]]
- [[_COMMUNITY_Pantry Item Component|Pantry Item Component]]
- [[_COMMUNITY_Slot Management Component|Slot Management Component]]
- [[_COMMUNITY_Slot Progress UI|Slot Progress UI]]
- [[_COMMUNITY_Statistics Dashboard UI|Statistics Dashboard UI]]
- [[_COMMUNITY_Status Notification Modals|Status Notification Modals]]
- [[_COMMUNITY_Authentication Context|Authentication Context]]
- [[_COMMUNITY_Social Context|Social Context]]
- [[_COMMUNITY_App Navigation|App Navigation]]
- [[_COMMUNITY_Pantry Management|Pantry Management]]
- [[_COMMUNITY_Event Creation Flow|Event Creation Flow]]
- [[_COMMUNITY_Meal Slot Creation|Meal Slot Creation]]
- [[_COMMUNITY_Chef Dashboard|Chef Dashboard]]
- [[_COMMUNITY_Profile Editing|Profile Editing]]
- [[_COMMUNITY_Event Details|Event Details]]
- [[_COMMUNITY_Screen Navigation Exports|Screen Navigation Exports]]
- [[_COMMUNITY_Login Workflow|Login Workflow]]
- [[_COMMUNITY_Logout Workflow|Logout Workflow]]
- [[_COMMUNITY_Orders Overview|Orders Overview]]
- [[_COMMUNITY_Pantry Inventory|Pantry Inventory]]
- [[_COMMUNITY_Chef Profile|Chef Profile]]
- [[_COMMUNITY_Verification Proof Upload|Verification Proof Upload]]
- [[_COMMUNITY_Registration Step 1 (Basic Info)|Registration Step 1 (Basic Info)]]
- [[_COMMUNITY_Registration Step 2 (Kitchen Info)|Registration Step 2 (Kitchen Info)]]
- [[_COMMUNITY_Registration Step 3 (Documentation)|Registration Step 3 (Documentation)]]
- [[_COMMUNITY_Schedule Management|Schedule Management]]
- [[_COMMUNITY_Social Events Feed|Social Events Feed]]
- [[_COMMUNITY_Identity Verification|Identity Verification]]
- [[_COMMUNITY_Global Theme & Styles|Global Theme & Styles]]
- [[_COMMUNITY_DateTime Utilities|Date/Time Utilities]]
- [[_COMMUNITY_Meal Presentation Assets|Meal Presentation Assets]]
- [[_COMMUNITY_App Branding Assets|App Branding Assets]]

## God Nodes (most connected - your core abstractions)
1. `MainActivity` - 5 edges
2. `MainApplication` - 3 edges
3. `updateAddress()` - 3 edges
4. `getStatusColor()` - 2 edges
5. `getStatusBg()` - 2 edges
6. `useAuth()` - 2 edges
7. `SocialProvider()` - 2 edges
8. `handleGetCurrentLocation()` - 2 edges
9. `handleMapPress()` - 2 edges
10. `handleSubmit()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `SocialProvider()` --calls--> `useAuth()`  [INFERRED]
  src\context\SocialContext.tsx → src\context\AuthContext.tsx
- `handleSubmit()` --calls--> `normalizeSlot()`  [INFERRED]
  src\screens\CreateSlotScreen.tsx → src\utils\dateTime.ts
- `GoHomey Chef App Icon` --visual_style_consistency--> `GoHomey Chef Splash Icon`  [INFERRED]
  assets/icon.png → assets/splash-icon.png
- `Lamb Chops Main Course` --likely_paired_recipe--> `Parmesan Risotto Side Dish`  [INFERRED]
  src/assets/images/lamb_chops.png → src/assets/images/risotto.png

## Communities

### Community 0 - "Android Native Bridge"
Cohesion: 0.29
Nodes (1): MainApplication

### Community 1 - "App Entry Point"
Cohesion: 0.29
Nodes (2): handleSubmit(), normalizeSlot()

### Community 2 - "Babel Configuration"
Cohesion: 0.33
Nodes (1): MainActivity

### Community 3 - "Android MainActivity"
Cohesion: 0.33
Nodes (2): useAuth(), SocialProvider()

### Community 4 - "Chef Tip Component"
Cohesion: 0.47
Nodes (3): handleGetCurrentLocation(), handleMapPress(), updateAddress()

### Community 5 - "Registration Status"
Cohesion: 0.67
Nodes (2): getStatusBg(), getStatusColor()

### Community 6 - "Event Listing Component"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "Order Management Component"
Cohesion: 0.67
Nodes (0): 

### Community 8 - "Pantry Item Component"
Cohesion: 0.67
Nodes (0): 

### Community 9 - "Slot Management Component"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Slot Progress UI"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Statistics Dashboard UI"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Status Notification Modals"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Authentication Context"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Social Context"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "App Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Pantry Management"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Event Creation Flow"
Cohesion: 1.0
Nodes (2): GoHomey Chef App Icon, GoHomey Chef Splash Icon

### Community 18 - "Meal Slot Creation"
Cohesion: 1.0
Nodes (2): Lamb Chops Main Course, Parmesan Risotto Side Dish

### Community 19 - "Chef Dashboard"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Profile Editing"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Event Details"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Screen Navigation Exports"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Login Workflow"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Logout Workflow"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Orders Overview"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Pantry Inventory"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Chef Profile"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Verification Proof Upload"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Registration Step 1 (Basic Info)"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Registration Step 2 (Kitchen Info)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Registration Step 3 (Documentation)"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Schedule Management"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Social Events Feed"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Identity Verification"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Global Theme & Styles"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Date/Time Utilities"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Meal Presentation Assets"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "App Branding Assets"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **4 isolated node(s):** `GoHomey Chef App Icon`, `GoHomey Chef Splash Icon`, `Lamb Chops Main Course`, `Parmesan Risotto Side Dish`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Statistics Dashboard UI`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Status Notification Modals`** (2 nodes): `ChefTip()`, `ChefTip.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Authentication Context`** (2 nodes): `StatusModal.tsx`, `SuccessAnimation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Social Context`** (2 nodes): `getImageUrl()`, `ProfileScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Navigation`** (2 nodes): `async()`, `RegisterStep2.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pantry Management`** (2 nodes): `getImageUrl()`, `ScheduleScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Creation Flow`** (2 nodes): `GoHomey Chef App Icon`, `GoHomey Chef Splash Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Meal Slot Creation`** (2 nodes): `Lamb Chops Main Course`, `Parmesan Risotto Side Dish`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chef Dashboard`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Editing`** (1 nodes): `extract_ast.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Details`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Screen Navigation Exports`** (1 nodes): `EventCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Workflow`** (1 nodes): `PantryCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Logout Workflow`** (1 nodes): `SlotCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Orders Overview`** (1 nodes): `SlotProgress.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pantry Inventory`** (1 nodes): `StatCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chef Profile`** (1 nodes): `AppNavigator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Verification Proof Upload`** (1 nodes): `DashboardScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Registration Step 1 (Basic Info)`** (1 nodes): `EditProfileScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Registration Step 2 (Kitchen Info)`** (1 nodes): `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Registration Step 3 (Documentation)`** (1 nodes): `LoginScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Schedule Management`** (1 nodes): `LogoutScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Social Events Feed`** (1 nodes): `PantryScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Identity Verification`** (1 nodes): `RegisterStep1.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global Theme & Styles`** (1 nodes): `RegisterStep3.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Date/Time Utilities`** (1 nodes): `RegistrationStatusScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Meal Presentation Assets`** (1 nodes): `VerificationScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Branding Assets`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `GoHomey Chef App Icon`, `GoHomey Chef Splash Icon`, `Lamb Chops Main Course` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._