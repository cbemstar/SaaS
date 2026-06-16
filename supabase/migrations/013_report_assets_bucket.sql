-- Public Storage bucket for report builder image uploads (logos, banners, etc.).
-- Uploads go through the service role in /api/reports/upload (scoped by workspace
-- in the object path); reads are public so shared/printed reports can show images.

insert into storage.buckets (id, name, public)
values ('report-assets', 'report-assets', true)
on conflict (id) do nothing;
