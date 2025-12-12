# Design Guidelines: NFS-e Automated Download System

## Design Approach
**System-Based Approach**: Material Design principles adapted for data-heavy fiscal operations interface. This utility-focused application prioritizes efficiency, clarity, and reliability over aesthetic experimentation.

## Typography Hierarchy
- **Headings**: Roboto Bold - Page titles (text-2xl), Section headers (text-lg), Card headers (text-base)
- **Body**: Roboto Regular - Forms and data tables (text-sm), Helper text (text-xs)
- **Monospace**: Roboto Mono - CNPJs, dates, invoice numbers, file names (text-sm)
- **Weight Strategy**: Bold for headers/labels, Regular for content, Medium for emphasis

## Layout & Spacing System
**Tailwind Units**: Use consistent spacing of 2, 4, 6, 8, 12, 16, 20, 24 units
- Page padding: `px-6 py-8` (mobile), `px-12 py-12` (desktop)
- Card padding: `p-6`
- Form field spacing: `space-y-4`
- Section gaps: `gap-8`
- Button spacing: `px-6 py-3`

**Grid Structure**: 
- Main content: `max-w-7xl mx-auto` for dashboard
- Forms: `max-w-md mx-auto` for login, `max-w-2xl` for search
- Tables: Full-width within container with horizontal scroll on mobile

## Component Library

### Authentication
- **Login Card**: Centered card (`max-w-md`) with logo, form fields, submit button, subtle footer
- **Form Fields**: Full-width inputs with floating labels, clear validation states (success/error borders and icons)
- **Password Field**: Toggle visibility icon on right

### Search Interface (Primary Screen)
- **Search Card**: Prominent card with CNPJ input (formatted with mask: XX.XXX.XXX/XXXX-XX), date range pickers
- **Action Buttons**: Primary "Buscar" button (right-aligned), secondary "Limpar" (ghost style)
- **Validation**: Real-time CNPJ format validation with inline error messages

### Data Display
- **Results Table**: Striped rows, sticky header, columns: NFS-e #, Condomínio, Data, Valor, Ações
- **Table Actions**: Icon buttons for PDF/XML downloads, checkbox column for batch selection
- **Pagination**: Material Design pagination component if >50 results
- **Empty State**: Centered illustration placeholder with helpful message

### Batch Operations
- **Selection Bar**: Sticky top bar appearing when items selected, showing count and "Baixar Selecionadas em ZIP" button
- **Period Selector**: Two-column layout (date-início, date-fim) with calendar pickers
- **Client Filter**: Multi-select dropdown (if multiple CNPJs available)

### Download History
- **History Table**: Chronological list with columns: Data, Condomínio, Tipo (badge), Status, Ação (download icon)
- **Badges**: Pill-shaped badges for "PDF", "XML", "Lote" with distinct styling
- **Re-download**: Download icon button that retrieves from storage

### Navigation
- **Top Bar**: Fixed header with logo (left), user menu (right showing email/role), logout button
- **Breadcrumbs**: For navigation context when viewing history or batch operations

### Buttons & Actions
- **Primary Actions**: Solid buttons with rounded corners (`rounded-lg`), adequate padding
- **Secondary Actions**: Outlined buttons with hover states
- **Icon Buttons**: Circular or square (32px), subtle hover background
- **Download Buttons**: Icon + text, clear affordance

### Feedback Elements
- **Loading States**: Skeleton loaders for tables, spinner overlays for form submissions
- **Success/Error Messages**: Toast notifications (top-right), auto-dismiss after 5s
- **File Name Display**: Truncated with tooltip showing full name: `[CNPJ]_[Nome]_[Data]_NFS-e.pdf`

### Forms
- **Input Fields**: Outlined style, 56px height, clear focus states
- **Labels**: Above fields, not floating (simpler for fiscal operations)
- **Helper Text**: Below fields in muted text for format guidance
- **Error States**: Red border, error icon, error message below field

## Layout Patterns

### Login Screen
- Vertically centered card, logo above form, minimal branding footer

### Dashboard (Main Screen)
- Two-section layout: Search form (top 1/3), Results table (bottom 2/3)
- Responsive: Stack vertically on mobile

### History Screen
- Full-width table with filters above (date range, tipo)
- Export button (top-right) for downloading history CSV

## Mobile Considerations
- Tables: Horizontal scroll with frozen first column (NFS-e #)
- Forms: Full-width with comfortable tap targets (min 44px height)
- Search collapsed into expandable panel on mobile
- Batch actions: Bottom sheet on mobile instead of top bar

## Accessibility
- ARIA labels on all icon buttons
- Keyboard navigation for all interactive elements
- Focus indicators visible and distinct
- Color not sole indicator for validation states
- Screen reader announcements for dynamic content updates

## File & Data Presentation
- **File Names**: Monospace font, truncate middle with ellipsis if needed
- **CNPJs**: Always formatted with dots/slashes (XX.XXX.XXX/XXXX-XX)
- **Dates**: DD/MM/YYYY format (Brazilian standard)
- **Currency**: R$ X.XXX,XX format

## Performance & Polish
- Optimistic UI: Show downloading state immediately on button click
- Debounced search: 300ms delay on CNPJ input
- Virtualized scrolling for tables with >100 rows
- Progressive loading: Show partial results as they load

This design prioritizes data clarity, operational efficiency, and professional trustworthiness essential for fiscal operations software.