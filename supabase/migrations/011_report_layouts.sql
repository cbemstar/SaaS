-- Drag-and-drop report builder: store the Puck layout (blocks, order, config)
-- as JSON on each report template. Existing section-based templates keep working;
-- templates with a `layout` use the new builder.

alter table public.report_templates add column if not exists layout jsonb;
