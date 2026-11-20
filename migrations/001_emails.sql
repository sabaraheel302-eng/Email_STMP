CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emails_created_at_idx ON emails (created_at DESC);
CREATE INDEX IF NOT EXISTS emails_status_idx ON emails ((payload->>'status'));

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_template_assets (
  id UUID PRIMARY KEY,
  content_type TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
