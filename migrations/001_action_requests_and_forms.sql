CREATE TABLE IF NOT EXISTS action_request_templates (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosted_forms (
  id UUID PRIMARY KEY,
  payload JSONB NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES hosted_forms(id) ON DELETE CASCADE,
  campaign_id UUID,
  payload JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'received'
);

CREATE TABLE IF NOT EXISTS form_submission_files (
  id UUID PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_submissions_form_created_idx
  ON form_submissions(form_id, submitted_at DESC);
