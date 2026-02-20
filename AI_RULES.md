# AI Development Rules

This document outlines the technical stack and development guidelines for maintaining consistency and quality in the application.

## Tech Stack Overview

*   **Framework:** React for building user interfaces.
*   **Language:** TypeScript for type safety and improved code quality.
*   **Styling:** Tailwind CSS for utility-first styling.
*   **Component Library:** shadcn/ui for pre-built, accessible UI components.
*   **Routing:** React Router for client-side navigation and routing.
*   **Icons:** Lucide React for a consistent set of icons.

## Development Guidelines

### Component and Styling Rules

*   **UI Components:** Prioritize using components from the shadcn/ui library. If a required component is not available in shadcn/ui, create a new component in `src/components/`.
*   **Styling:** All styling must be implemented using Tailwind CSS utility classes. Avoid creating custom CSS files or inline styles where possible.
*   **Icons:** Use icons from the `lucide-react` package.

### File Structure and Routing

*   **Pages:** All top-level pages should be placed in the `src/pages/` directory.
*   **Components:** Reusable components should be placed in the `src/components/` directory.
*   **Routing:** All application routes should be defined and managed within `src/App.tsx` using React Router.

### Code Quality

*   **TypeScript:** Ensure all new code is written in TypeScript and adheres to strict type checking.
*   **Readability:** Write clean, well-commented code that follows standard React and TypeScript best practices.