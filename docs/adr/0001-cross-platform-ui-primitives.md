# Cross-platform UI primitives

Status: accepted

Roundup will share semantic design tokens and a stable primitive API through a
local workspace UI package, with React Native primitives as the default
implementation so the same components render on Expo web and iOS. Platform
specific behavior belongs behind `.web` and `.native` leaves only where it is
material; product screens consume the shared primitive, not the platform SDK.

## Considered options

- **Web shadcn/ui directly:** rejected because its DOM/Radix component model is
  not a portable iOS implementation.
- **Shared styled-components:** rejected as the primary foundation because it
  adds runtime styling without removing native/web control and layout
  differences.
- **Direct `@expo/ui` use in every screen:** rejected because Expo UI is a
  native-primitives layer, not Roundup's reusable design system. It may be
  adopted inside shared primitives where native platform fidelity is valuable.

## Consequences

- `packages/tokens` will own semantic color, spacing, typography, radius, and
  elevation tokens; `packages/ui` will own primitives such as `Button`,
  `Card`, `Input`, and `Badge`.
- The existing screen-local `StyleSheet` code is transitional and is not yet a
  shared component library.
- A shadcn-style workflow means copy-owned, editable component source and
  consistent variants, not importing the web shadcn/ui package into native
  screens.
