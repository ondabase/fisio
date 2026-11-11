-- A published content version is immutable: its bundle and checksum can never
-- change, and a version can't be deleted once approved. Status moves only
-- forward: draft -> approved -> retired (or draft -> retired).
CREATE FUNCTION content_versions_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'content version % % is % and cannot be deleted', OLD.content_id, OLD.version, OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.bundle IS DISTINCT FROM OLD.bundle
    OR NEW.checksum IS DISTINCT FROM OLD.checksum
    OR NEW.content_id IS DISTINCT FROM OLD.content_id
    OR NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'content version % % is immutable', OLD.content_id, OLD.version;
  END IF;

  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'draft' AND NEW.status IN ('approved', 'retired'))
    OR (OLD.status = 'approved' AND NEW.status = 'retired')
  ) THEN
    RAISE EXCEPTION 'content version % % cannot go from % to %', OLD.content_id, OLD.version, OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'approved' AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL) THEN
    RAISE EXCEPTION 'approving content version % % needs approved_by and approved_at', OLD.content_id, OLD.version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER content_versions_guard
  BEFORE UPDATE OR DELETE ON content_versions
  FOR EACH ROW EXECUTE FUNCTION content_versions_guard();
