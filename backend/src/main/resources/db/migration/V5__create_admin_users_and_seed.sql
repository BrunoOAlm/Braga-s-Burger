CREATE TABLE admin_users (
  id              TEXT PRIMARY KEY,
  email           VARCHAR(200) NOT NULL UNIQUE,
  password_hash   VARCHAR(72)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_users_touch_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO admin_users (id, email, password_hash, name)
VALUES (
  '${admin.bootstrap.id}',
  LOWER(TRIM('${admin.bootstrap.email}')),
  '${admin.bootstrap.passwordHash}',
  '${admin.bootstrap.name}'
)
ON CONFLICT (email) DO NOTHING;
