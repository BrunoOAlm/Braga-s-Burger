CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           VARCHAR(200) NOT NULL UNIQUE,
  password_hash   VARCHAR(72)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  phone           VARCHAR(40)  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id    ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
