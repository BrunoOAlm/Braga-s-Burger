-- Remove o seed inserido por V5 (placeholder-based, hash interpolado como texto).
-- A partir do SP5b.1, AdminBootstrap @Component e a autoridade do seed admin.
-- Idempotente: 0 ou 1 row deletado.
DELETE FROM admin_users
WHERE email = LOWER(TRIM('${admin.bootstrap.email}'));
