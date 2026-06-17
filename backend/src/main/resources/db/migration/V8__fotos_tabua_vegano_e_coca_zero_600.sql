-- V8__fotos_tabua_vegano_e_coca_zero_600.sql
-- Fotos que faltavam quando a V7 rodou: Tábua Vegano e Coca-Cola Zero 600ml
-- estavam com image_url NULL (apareciam como placeholder no front). Agora que
-- as fotos otimizadas existem em /public, ligamos as duas.
-- Mesmo guard "image_url IS NULL" do V7: não sobrescreve foto que o admin
-- tenha trocado manualmente. Os slugs coincidem com os nomes dos arquivos.

UPDATE products SET image_url = '/images/products/' || id || '.webp'
WHERE image_url IS NULL
  AND id IN ('tabua-vegano', 'coca-cola-zero-600ml');
