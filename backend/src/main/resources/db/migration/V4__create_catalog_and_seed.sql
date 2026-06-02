-- categories
CREATE TABLE categories (
    id            TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    display_order INT  NOT NULL DEFAULT 100,
    layout        TEXT NOT NULL DEFAULT 'grid' CHECK (layout IN ('grid','list')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- products
CREATE TABLE products (
    id            TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
    category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    description   TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500),
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    price_from    BOOLEAN NOT NULL DEFAULT false,
    image_url     TEXT CHECK (image_url IS NULL OR image_url ~ '^(https://|/images/)'),
    featured      BOOLEAN NOT NULL DEFAULT false,
    available     BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 100,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id, display_order);

-- coupons
CREATE TABLE coupons (
    code         TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9_-]{2,40}$'),
    type         TEXT NOT NULL CHECK (type IN ('percent','fixed')),
    value        NUMERIC(10,2) NOT NULL CHECK (value >= 0),
    min_subtotal NUMERIC(10,2),
    valid_from   TIMESTAMPTZ,
    valid_until  TIMESTAMPTZ,
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT coupons_percent_value CHECK (type <> 'percent' OR value <= 100),
    CONSTRAINT coupons_date_window   CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until)
);

-- seed: categorias
INSERT INTO categories (id, name, display_order, layout) VALUES ('burgers', 'Burgers', 10, 'grid');
INSERT INTO categories (id, name, display_order, layout) VALUES ('trios', 'Trios', 20, 'grid');
INSERT INTO categories (id, name, display_order, layout) VALUES ('tabuas', 'Tábuas', 30, 'grid');
INSERT INTO categories (id, name, display_order, layout) VALUES ('porcoes', 'Porções', 40, 'grid');
INSERT INTO categories (id, name, display_order, layout) VALUES ('sobremesas', 'Sobremesas', 50, 'grid');
INSERT INTO categories (id, name, display_order, layout) VALUES ('molhos', 'Molhos', 60, 'list');
INSERT INTO categories (id, name, display_order, layout) VALUES ('bebidas', 'Bebidas', 70, 'list');

-- seed: produtos
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('braguinha', 'burgers', 'Braguinha', 'Pão de brioche, 100g blend bovino, queijo, ovo, alface, tomate e molho de bacon.', 22.90, true, '/images/products/braguinha.webp', false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('chicken', 'burgers', 'Chicken', 'Pão brioche, tiras de frango, queijo, alface, tomate e molho de bacon.', 25.90, true, '/images/products/chicken.webp', false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('costela', 'burgers', 'Costela', 'Pão australiano, 150g blend de costela bovina, cheddar, anéis de cebola, bacon em cubo e barbecue.', 33.90, true, '/images/products/costela.webp', false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('crispy-catupiry', 'burgers', 'Crispy Catupiry', 'Pão brioche, 150g blend bovino, Catupiry empanado, 2 fatias de cheddar, rúcula e tomate.', 39.90, true, '/images/products/crispy-catupiry.webp', true, true, 40);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('dogao-linguica', 'burgers', 'Dogão Linguiça', 'Baguete parmesão, linguiça suína, queijo no maçarico, bacon em cubo, batata palha e molho de alho.', 22.90, true, '/images/products/dogao-linguica.webp', false, true, 50);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('dogao-salsicha', 'burgers', 'Dogão Salsicha', 'Baguete parmesão, salsicha, queijo no maçarico, bacon em cubo, batata palha e molho de alho.', 22.90, true, '/images/products/dogao-salsicha.webp', false, true, 60);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('duplo', 'burgers', 'Duplo', 'Pão brioche, 2 blends bovinos (150g cada), mix de queijos, bacon americano, molho de alho e onion rings.', 39.90, true, '/images/products/duplo.webp', true, true, 70);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('duplo-smash', 'burgers', 'Duplo Smash', 'Pão brioche, 2 blends bovinos 100g cada, cheddar, bacon americano e barbecue.', 34.90, true, '/images/products/duplo-smash.webp', false, true, 80);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('epico', 'burgers', 'Épico', 'Pão australiano, 150g blend bovino, molho cheddar, queijo cheddar, cebola caramelizada e bacon em cubos.', 36.90, true, '/images/products/epico.webp', true, true, 90);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('explosao-cheddar', 'burgers', 'Explosão de Cheddar', 'Pão brioche, 2 blends bovinos 100g cada, molho cheddar e bacon em cubos.', 38.90, true, '/images/products/explosao-cheddar.webp', true, true, 100);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('gourmet', 'burgers', 'Gourmet', 'Pão australiano, 150g blend bovino, cheddar, anéis de cebola e molho de bacon.', 29.90, true, '/images/products/gourmet.webp', false, true, 110);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('kids-alice', 'burgers', 'Kids Alice', 'Pão brioche, 100g blend bovino, queijo e ketchup.', 18.90, true, '/images/products/kids-alice.webp', false, true, 120);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('majestoso', 'burgers', 'Majestoso', 'Pão de brioche, 2 carnes 100g blend bovino, catupiry, cheddar, cebola crispy e bacon em cubos.', 37.90, true, '/images/products/majestoso.webp', true, true, 130);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('triplo-smash', 'burgers', 'Triplo Smash', 'Pão brioche, 3 blends bovinos 100g cada, cheddar, bacon americano e barbecue.', 38.90, true, '/images/products/triplo-smash.webp', true, true, 140);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('vegano', 'burgers', 'Vegano', 'Pão australiano, hambúrguer vegano, alface, rúcula, tomate, cebola roxa e maionese vegana.', 34.90, true, '/images/products/vegano.webp', false, true, 150);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-alice', 'trios', 'Trio Alice', 'Kids Alice + fritas (Smile ou Nugget) + bebida.', 28.80, true, '/images/products/kids-alice.webp', false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-braguinha', 'trios', 'Trio Braguinha', 'Braguinha + fritas + bebida.', 32.80, true, '/images/products/braguinha.webp', false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-chicken', 'trios', 'Trio Chicken', 'Chicken + fritas + bebida.', 35.80, true, '/images/products/chicken.webp', false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-costela', 'trios', 'Trio Costela', 'Costela + fritas + bebida.', 43.80, true, '/images/products/costela.webp', false, true, 40);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-crispy-catupiry', 'trios', 'Trio Crispy Catupiry', 'Crispy Catupiry + fritas + bebida.', 49.80, true, '/images/products/crispy-catupiry.webp', false, true, 50);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-dogao-linguica', 'trios', 'Trio Dogão Linguiça', 'Dogão Linguiça + fritas + bebida.', 32.80, true, '/images/products/dogao-linguica.webp', false, true, 60);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-dogao-salsicha', 'trios', 'Trio Dogão Salsicha', 'Dogão Salsicha + fritas + bebida.', 32.80, true, '/images/products/dogao-salsicha.webp', false, true, 70);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-duplo', 'trios', 'Trio Duplo', 'Duplo + fritas + bebida.', 49.80, true, '/images/products/duplo.webp', false, true, 80);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-duplo-smash', 'trios', 'Trio Duplo Smash', 'Duplo Smash + fritas + bebida.', 44.80, true, '/images/products/duplo-smash.webp', false, true, 90);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-epico', 'trios', 'Trio Épico', 'Épico + fritas + bebida.', 46.80, true, '/images/products/epico.webp', false, true, 100);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-explosao', 'trios', 'Trio Explosão', 'Explosão de Cheddar + fritas + bebida.', 48.80, true, '/images/products/explosao-cheddar.webp', false, true, 110);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-gourmet', 'trios', 'Trio Gourmet', 'Gourmet + fritas + bebida.', 39.80, true, '/images/products/gourmet.webp', false, true, 120);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-majestoso', 'trios', 'Trio Majestoso', 'Majestoso + fritas + bebida.', 47.80, true, '/images/products/majestoso.webp', false, true, 130);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-triplo-smash', 'trios', 'Trio Triplo Smash', 'Triplo Smash + fritas + bebida.', 48.80, true, '/images/products/triplo-smash.webp', false, true, 140);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('trio-vegano', 'trios', 'Trio Vegano', 'Vegano + fritas + bebida.', 44.80, true, '/images/products/vegano.webp', false, true, 150);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-braga-chicken', 'tabuas', 'Tábua Braga Chicken', '2 sanduíches + fritas + anéis de cebola + molho + refrigerante.', 74.90, true, '/images/products/tabua-braga-chicken.webp', false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-braguinha', 'tabuas', 'Tábua Braguinha', '2 braguinhas + fritas + calabresa fatiada + molho + refrigerante.', 70.90, true, '/images/products/tabua-braguinha.webp', false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-costela', 'tabuas', 'Tábua Costela', '2 sanduíches + fritas + anéis de cebola + molho + refrigerante.', 89.90, true, '/images/products/tabua-costela.webp', false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-crispy-catupiry', 'tabuas', 'Tábua Crispy Catupiry', '2 sanduíches + fritas + anéis de cebola + molho + refrigerante.', 96.90, true, '/images/products/tabua-crispy-catupiry.webp', false, true, 40);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-dogao-linguica', 'tabuas', 'Tábua Dogão Linguiça', '2 dogões + fritas + calabresa fatiada + molho + refrigerante.', 70.90, true, '/images/products/tabua-dogao-linguica.webp', false, true, 50);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-dogao-salsicha', 'tabuas', 'Tábua Dogão Salsicha', '2 dogões + fritas + calabresa fatiada + molho + refrigerante.', 70.90, true, '/images/products/tabua-dogao-salsicha.webp', false, true, 60);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-duplo', 'tabuas', 'Tábua Duplo', '2 sanduíches duplos + fritas + anéis de cebola + molho + refrigerante.', 96.90, true, '/images/products/tabua-duplo.webp', false, true, 70);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-duplo-smash', 'tabuas', 'Tábua Duplo Smash', 'Duplo Smash + fritas + calabresa fatiada + molho + refrigerante.', 90.90, true, '/images/products/tabua-duplo-smash.webp', false, true, 80);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-epico', 'tabuas', 'Tábua Épico', '2 Épicos + fritas + anéis de cebola + molho + refrigerante.', 91.90, true, '/images/products/tabua-epico.webp', false, true, 90);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-explosao-cheddar', 'tabuas', 'Tábua Explosão de Cheddar', '2 sanduíches + fritas + calabresa fatiada + molho + refrigerante.', 92.90, true, '/images/products/tabua-explosao-cheddar.webp', false, true, 100);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-familia', 'tabuas', 'Tábua Família', '4 braguinhas + fritas + molho + refrigerante 2L.', 104.90, true, '/images/products/tabua-familia.webp', false, true, 110);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-gourmet', 'tabuas', 'Tábua Gourmet', '2 sanduíches gourmet + fritas + anéis de cebola + molho + refrigerante.', 83.90, true, '/images/products/tabua-gourmet.webp', false, true, 120);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-majestoso', 'tabuas', 'Tábua Majestoso', '2 majestosos + fritas + anéis de cebola + molho + refrigerante.', 97.90, true, '/images/products/tabua-majestoso.webp', false, true, 130);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-triplo-smash', 'tabuas', 'Tábua Triplo Smash', '2 Triplo Smash + fritas + calabresa fatiada + molho + refrigerante.', 94.90, true, '/images/products/tabua-triplo-smash.webp', false, true, 140);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('tabua-vegano', 'tabuas', 'Tábua Vegano', '2 sanduíches veganos + fritas + anéis de cebola + molho + refrigerante.', 92.90, true, NULL, false, true, 150);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('frango-empanado-grande', 'porcoes', 'Frango Empanado Frito (Grande)', '12 tiras + fritas + molho da casa.', 63.90, false, '/images/products/frango-empanado-grande.webp', false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('frango-empanado-media', 'porcoes', 'Frango Empanado Frito (Média)', '6 tiras + fritas + molho da casa.', 45.90, false, '/images/products/frango-empanado-media.webp', false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('fritas-grande', 'porcoes', 'Fritas Grande', '', 29.90, true, '/images/products/fritas-grande.webp', false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('fritas-media', 'porcoes', 'Fritas Média', '', 19.90, true, '/images/products/fritas-media.webp', false, true, 40);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('fritas-pequena', 'porcoes', 'Fritas Pequena', '', 9.90, true, '/images/products/fritas-pequena.webp', false, true, 50);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('risole-queijo-gouda', 'porcoes', 'Porção de Risole de Queijo Gouda', '10 unidades + geleia de pimenta.', 26.90, false, '/images/products/risole-queijo-gouda.webp', false, true, 60);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coxinhas', 'porcoes', 'Porção de Coxinhas', '10 unidades + molho ketchup.', 21.90, false, '/images/products/coxinhas.webp', false, true, 70);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('nugget-supreme', 'porcoes', 'Porção de Nugget Supreme', '10 unidades + molho ketchup.', 21.90, false, '/images/products/nugget-supreme.webp', false, true, 80);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('frango-passarinho', 'porcoes', 'Porção Frango a Passarinho', 'Frango a passarinho + molho barbecue à parte.', 35.90, false, '/images/products/frango-passarinho.webp', false, true, 90);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('roda-gigante', 'porcoes', 'Roda Gigante de Petiscos', 'Anéis de cebola, frango a passarinho, fritas e linguiça + molho à escolha.', 64.90, false, '/images/products/roda-gigante.webp', false, true, 100);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('brownie-sorvete', 'sobremesas', 'Brownie com Sorvete', 'Brownie + sorvete de creme + morango + Nutella.', 28.90, false, '/images/products/brownie-sorvete.webp', false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('matilda-cake', 'sobremesas', 'Matilda Cake', 'Bolo de chocolate meio amargo, recheio de brigadeiro e ganache.', 24.90, false, '/images/products/matilda-cake.webp', false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('molho-barbecue', 'molhos', 'Molho Barbecue', '', 3.90, false, NULL, false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('molho-alho', 'molhos', 'Molho de Alho', '', 3.90, false, NULL, false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('molho-bacon', 'molhos', 'Molho de Bacon', '', 3.90, false, NULL, false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('agua-com-gas', 'bebidas', 'Água com gás', '', 4.90, false, NULL, false, true, 10);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('agua-tonica-lata', 'bebidas', 'Água Tônica Lata', '', 7.90, false, NULL, false, true, 20);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-2l', 'bebidas', 'Coca-Cola 2L', '', 13.90, false, NULL, false, true, 30);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-600ml', 'bebidas', 'Coca-Cola 600ml', '', 8.90, false, NULL, false, true, 40);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-lata', 'bebidas', 'Coca-Cola Lata', '', 7.90, false, NULL, false, true, 50);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-zero-2l', 'bebidas', 'Coca-Cola Zero 2L', '', 13.90, false, NULL, false, true, 60);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-zero-600ml', 'bebidas', 'Coca-Cola Zero 600ml', '', 8.90, false, NULL, false, true, 70);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('coca-cola-zero-lata', 'bebidas', 'Coca-Cola Zero Lata', '', 7.90, false, NULL, false, true, 80);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('corona-330ml', 'bebidas', 'Corona 330ml', '', 9.90, false, NULL, false, true, 90);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('red-bull-250ml', 'bebidas', 'Energético Red Bull 250ml', '', 12.90, false, NULL, false, true, 100);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('fanta-laranja-lata', 'bebidas', 'Fanta Laranja Lata', '', 7.90, false, NULL, false, true, 110);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('guarana-antartica-600ml', 'bebidas', 'Guaraná Antártica 600ml', '', 8.90, false, NULL, false, true, 120);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('guarana-antartica-2l', 'bebidas', 'Guaraná Antártica 2L', '', 13.90, false, NULL, false, true, 130);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('guarana-antartica-lata', 'bebidas', 'Guaraná Antártica Lata', '', 7.90, false, NULL, false, true, 140);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('guarana-antartica-zero-lata', 'bebidas', 'Guaraná Antártica Zero Lata', '', 7.90, false, NULL, false, true, 150);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('guaravita-300ml', 'bebidas', 'Guaravita 300ml', '', 3.90, false, NULL, false, true, 160);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('h2o-limao', 'bebidas', 'H2O Limão', '', 8.90, false, NULL, false, true, 170);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('h2o-limoneto', 'bebidas', 'H2O Limoneto', '', 8.90, false, NULL, false, true, 180);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('heineken-330ml', 'bebidas', 'Heineken 330ml', '', 9.90, false, NULL, false, true, 190);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('heineken-330ml-zero', 'bebidas', 'Heineken 330ml Zero', '', 9.90, false, NULL, false, true, 200);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('ice-tea-pessego-300ml', 'bebidas', 'Ice Tea Pêssego 300ml', '', 7.90, false, NULL, false, true, 210);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('matte-300ml', 'bebidas', 'Matte 300ml', '', 7.90, false, NULL, false, true, 220);
INSERT INTO products (id, category_id, name, description, price, price_from, image_url, featured, available, display_order) VALUES ('sprite-lata', 'bebidas', 'Sprite Lata', '', 7.90, false, NULL, false, true, 230);

-- seed: cupons
INSERT INTO coupons (code, type, value, min_subtotal, active) VALUES ('BEMVINDO10', 'percent', 10.00, NULL, true);
INSERT INTO coupons (code, type, value, min_subtotal, active) VALUES ('FRETE5', 'fixed', 5.00, 40.00, true);
