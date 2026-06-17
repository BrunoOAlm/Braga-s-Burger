-- Bebidas e molhos viram cards (grid) com foto + botão Adicionar.
-- V4 seedou layout='list' e image_url=NULL; V4 já rodou em produção,
-- então a mudança vai em migração nova. O guard "image_url IS NULL"
-- preserva fotos que o admin tenha trocado manualmente.

UPDATE categories SET layout = 'grid' WHERE id IN ('bebidas', 'molhos');

UPDATE products SET image_url = '/images/products/' || id || '.webp'
WHERE image_url IS NULL
  AND id IN (
    'agua-com-gas',
    'agua-tonica-lata',
    'coca-cola-2l',
    'coca-cola-600ml',
    'coca-cola-lata',
    'coca-cola-zero-2l',
    'coca-cola-zero-lata',
    'corona-330ml',
    'red-bull-250ml',
    'fanta-laranja-lata',
    'guarana-antartica-600ml',
    'guarana-antartica-2l',
    'guarana-antartica-lata',
    'guarana-antartica-zero-lata',
    'guaravita-300ml',
    'h2o-limao',
    'h2o-limoneto',
    'heineken-330ml',
    'heineken-330ml-zero',
    'ice-tea-pessego-300ml',
    'matte-300ml',
    'sprite-lata',
    'molho-barbecue',
    'molho-alho',
    'molho-bacon'
  );
-- Fora da lista de propósito (sem foto ainda): coca-cola-zero-600ml.
