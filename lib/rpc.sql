-- Función para incrementar el contador de extensiones de sesión
CREATE OR REPLACE FUNCTION increment_extension_count(session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT extension_count INTO current_count FROM sessions WHERE id = session_id;
  RETURN current_count + 1;
END;
$$ LANGUAGE plpgsql;

